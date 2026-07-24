import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { icpUpdateSchema, recommendationStatusSchema } from "@shared/schema";
import type { ChannelInsightStrategyMeta, SiteProfile } from "@shared/schema";
import { requireAuth } from "./middleware";
import { scrapeWebsiteDeep, extractCompanyProfile, analyzeCompanyFast, analyzeCompanyChannels, captureScreenshot, analyzeScreenshot, fetchPageSpeedInsights, fallbackChannelInsight } from "../services/openai";
import { sendWelcomeEmail } from "../services/email";
import {
  buildCrossChannelStrategyPlan,
  buildStrategyMeta,
  markTopChannels,
  scoreChannelInsightQuality,
} from "../services/channelStrategy";

const router = Router();

const CHANNEL_IDS = ['SEO', 'Content', 'LLMs', 'CRO', 'Email Marketing', 'Paid Search', 'Paid Social', 'Organic Social', 'Retargeting', 'Community', 'ABM', 'Partnerships', 'Outbound'];

const ANALYSIS_TTL_MS = 10 * 60 * 1000;
const ANALYSIS_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const activeAnalysisRuns = new Map<number, { runId: string; startedAt: number }>();

function withFallbackChannelInsights(
  company: { id: number; name: string | null; summary: string | null; gtmMotion: string | null; siteProfile?: SiteProfile | null },
  channelInsights: Awaited<ReturnType<typeof storage.getChannelInsightsByCompanyId>>,
) {
  type ResponseInsight = (typeof channelInsights)[number] & {
    isFallback?: boolean;
    strategyMeta: ChannelInsightStrategyMeta;
  };

  const normalized: ResponseInsight[] = channelInsights.map((insight) => {
    const isLegacyFallback = insight.whyItMatters.includes("is part of the GTM mix")
      && insight.heroStat?.value === "2 weeks";
    if (isLegacyFallback) {
      const fallback = fallbackChannelInsight(
        insight.channelId,
        company.name || "Your Company",
        company.summary || "",
        company.gtmMotion || "",
        company.siteProfile,
        "This legacy recovery strategy was upgraded to the channel-specific playbook.",
      );
      return {
        ...insight,
        ...fallback,
        isFallback: true,
      } as ResponseInsight;
    }

    const strategyMeta = insight.strategyMeta || buildStrategyMeta(
      insight.channelId,
      company.name || "Your Company",
      company.summary || "",
      company.gtmMotion || "",
      company.siteProfile,
      insight.generationStatus || "generated",
    );
    const quality = scoreChannelInsightQuality({
      ...insight,
      strategyMeta,
    }, company.name || "Your Company");
    return {
      ...insight,
      generationStatus: insight.generationStatus || "generated",
      strategyMeta: {
        ...strategyMeta,
        qualityScore: strategyMeta.qualityScore || quality.score,
        qualityIssues: strategyMeta.qualityIssues?.length ? strategyMeta.qualityIssues : quality.issues,
      },
      isFallback: insight.generationStatus === "fallback",
    } as ResponseInsight;
  });
  const byChannel = new Map(normalized.map((insight) => [insight.channelId, insight]));
  const completed: ResponseInsight[] = [...normalized];

  for (const channelId of CHANNEL_IDS) {
    if (byChannel.has(channelId)) continue;
    const fallback = fallbackChannelInsight(
      channelId,
      company.name || "Your Company",
      company.summary || "",
      company.gtmMotion || "",
      company.siteProfile,
    );
    completed.push({
      id: -completed.length - 1,
      companyId: company.id,
      createdAt: new Date(),
      isFallback: true,
      ...fallback,
    } as ResponseInsight);
  }

  return markTopChannels(completed);
}

setInterval(() => {
  const now = Date.now();
  for (const [companyId, entry] of Array.from(activeAnalysisRuns.entries())) {
    if (now - entry.startedAt > ANALYSIS_TTL_MS) {
      console.log(`Cleaning up stale analysis run for company ${companyId} (started ${Math.round((now - entry.startedAt) / 1000)}s ago)`);
      activeAnalysisRuns.delete(companyId);
    }
  }
}, ANALYSIS_CLEANUP_INTERVAL_MS).unref();

router.get("/api/dashboard", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const [user, company] = await Promise.all([
      storage.getUser(userId),
      storage.getCompanyByUserId(userId),
    ]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!company) {
      return res.status(404).json({ error: "Company data not yet available" });
    }

    const [recommendations, weeklyIdeas, channelInsights] = await Promise.all([
      storage.getRecommendationsByCompanyId(company.id),
      storage.getWeeklyIdeasByCompanyId(company.id),
      storage.getChannelInsightsByCompanyId(company.id),
    ]);

    const completedChannelInsights = company.name && !activeAnalysisRuns.has(company.id)
      ? withFallbackChannelInsights(company, channelInsights)
      : channelInsights;
    const icpDetails = company.siteProfile?.icpDetails;
    const hasDetectedIcp = Boolean(
      icpDetails?.persona?.trim()
      || icpDetails?.industry?.trim()
      || icpDetails?.companySize?.trim()
      || icpDetails?.painPoints?.some((pain) => pain.trim()),
    );
    const displayIcpScore = hasDetectedIcp
      ? company.icpScore
      : Math.min(company.icpScore || 0, 40);

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isPremium: user.isPremium,
        isAdmin: user.isAdmin,
        agentEnabled: user.agentEnabled,
      },
      company: {
        id: company.id,
        name: company.name,
        url: company.url,
        summary: company.summary,
        gtmMotion: company.gtmMotion,
        icpScore: displayIcpScore,
        icpStatus: hasDetectedIcp ? "detected" : "missing",
        screenshotUrl: company.screenshotUrl,
        visualAnalysis: company.visualAnalysis,
        pageSpeedData: company.pageSpeedData,
        lastScraped: company.lastScraped,
        siteProfile: company.siteProfile || null,
      },
      recommendations,
      weeklyIdeas,
      channelInsights: completedChannelInsights,
      strategyPlan: buildCrossChannelStrategyPlan(
        completedChannelInsights,
        company.name || "Your Company",
      ),
    });
  } catch (error: unknown) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

router.patch("/api/company/:id/icp", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    const userId = req.session.userId!;
    const company = await storage.getCompanyByUserId(userId);
    if (!company || company.id !== companyId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const validatedData = icpUpdateSchema.parse(req.body);
    const currentProfile = (company.siteProfile || {}) as SiteProfile;
    const updatedProfile: SiteProfile = {
      ...currentProfile,
      icpDetails: {
        ...currentProfile.icpDetails,
        ...(validatedData.persona !== undefined && { persona: validatedData.persona }),
        ...(validatedData.companySize !== undefined && { companySize: validatedData.companySize }),
        ...(validatedData.industry !== undefined && { industry: validatedData.industry }),
        ...(validatedData.painPoints !== undefined && { painPoints: validatedData.painPoints }),
      },
    };

    await storage.updateCompany(companyId, { siteProfile: updatedProfile });
    res.json({ message: "ICP updated", siteProfile: updatedProfile });
  } catch (error: unknown) {
    console.error("ICP update error:", error);
    res.status(500).json({ error: "Failed to update ICP" });
  }
});

router.patch("/api/recommendations/:id/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = recommendationStatusSchema.parse(req.body);

    const userId = req.session.userId!;
    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const recs = await storage.getRecommendationsByCompanyId(company.id);
    const rec = recs.find(r => r.id === parseInt(id));
    if (!rec) {
      return res.status(403).json({ error: "Access denied" });
    }

    const previousStatus = rec.status;
    await storage.updateRecommendationStatus(parseInt(id), validatedData.status);
    res.json({ message: "Status updated" });

    setImmediate(async () => {
      try {
        const { fireMilestoneStart, fireCompletionCongrats } = await import("../services/gtmAgent");
        const newStatus = validatedData.status;
        const channelId = rec.category;

        if (newStatus === "In Progress" && previousStatus !== "In Progress") {
          const channelRecs = recs.filter(r => r.category === channelId);
          const wasAlreadyInProgress = channelRecs.some(r => r.id !== rec.id && r.status === "In Progress");
          if (!wasAlreadyInProgress) {
            await fireMilestoneStart(userId, channelId, rec.id);
          }
        }

        if (newStatus === "Completed") {
          const freshRecs = await storage.getRecommendationsByCompanyId(company.id);
          const channelRecs = freshRecs.filter(r => r.category === channelId);
          const allDone = channelRecs.every(r => r.id === rec.id || r.status === "Completed");
          if (allDone) {
            await fireCompletionCongrats(userId, channelId);
          }
        }
      } catch (agentErr) {
        console.error("Agent hook error (non-blocking):", agentErr);
      }
    });
  } catch (error: unknown) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

const REANALYSIS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

router.post("/api/retry-analysis/:companyId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const cid = parseInt(companyId);
    const userId = req.session.userId!;

    const company = await storage.getCompanyByUserId(userId);
    if (!company || company.id !== cid) {
      return res.status(403).json({ error: "Access denied" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (!user.isPremium && company.lastReanalyzedAt) {
      const elapsed = Date.now() - company.lastReanalyzedAt.getTime();
      if (elapsed < REANALYSIS_WINDOW_MS) {
        const nextEligible = new Date(company.lastReanalyzedAt.getTime() + REANALYSIS_WINDOW_MS);
        return res.status(403).json({
          error: "Free plan allows one re-analysis per week. Upgrade to Pro for unlimited re-analyses.",
          code: "PREMIUM_REQUIRED",
          reason: "weekly_reanalyze_limit",
          nextEligibleAt: nextEligible.toISOString(),
          upgradeUrl: "/pricing",
        });
      }
    }

    try {
      const [recommendations, channelInsights, weeklyIdeas, personas, budget] = await Promise.all([
        storage.getRecommendationsByCompanyId(cid),
        storage.getChannelInsightsByCompanyId(cid),
        storage.getWeeklyIdeasByCompanyId(cid),
        storage.getBuyerPersonasByCompanyId(cid),
        storage.getLatestBudgetAllocation(cid),
      ]);
      await storage.createStrategySnapshot({
        userId,
        companyId: cid,
        label: `Snapshot before re-analysis at ${new Date().toISOString()}`,
        snapshot: {
          company: company as unknown as Record<string, unknown>,
          recommendations: recommendations as unknown as Array<Record<string, unknown>>,
          channelInsights: channelInsights as unknown as Array<Record<string, unknown>>,
          weeklyIdeas: weeklyIdeas as unknown as Array<Record<string, unknown>>,
          personas: personas as unknown as Array<Record<string, unknown>>,
          budget: (budget as unknown as Record<string, unknown>) || null,
        },
      });
    } catch (snapshotError) {
      console.error("Failed to snapshot strategy before re-analysis:", snapshotError);
    }

    await storage.updateCompany(cid, {
      summary: "Analyzing your website...",
      name: null,
      gtmMotion: null,
      icpScore: null,
      lastScraped: new Date(),
      lastReanalyzedAt: new Date(),
    });

    processCompanyAnalysis(cid, company.url, user.fullName, user.email).catch(
      err => console.error("Retry analysis failed:", err)
    );

    res.json({ message: "Analysis restarted" });
  } catch (error: unknown) {
    console.error("Retry analysis error:", error);
    res.status(500).json({ error: "Failed to retry analysis" });
  }
});

export async function processCompanyAnalysis(
  companyId: number,
  companyUrl: string,
  fullName: string,
  email: string
): Promise<void> {
  try {
    const totalStart = Date.now();
    const runId = `${companyId}-${Date.now()}`;
    activeAnalysisRuns.set(companyId, { runId, startedAt: totalStart });
    console.log(`Starting analysis for ${companyUrl} (run: ${runId})...`);

    await Promise.all([
      storage.deleteRecommendationsByCompanyId(companyId),
      storage.deleteWeeklyIdeasByCompanyId(companyId),
      storage.deleteChannelInsightsByCompanyId(companyId),
      storage.updateCompany(companyId, {
        screenshotUrl: null,
        visualAnalysis: null,
        pageSpeedData: null,
      }),
    ]);

    const [scrapedSite, screenshotData, pageSpeedData] = await Promise.all([
      scrapeWebsiteDeep(companyUrl).catch((err) => {
        console.error("Scraping failed:", err);
        return null;
      }),
      captureScreenshot(companyUrl).catch((err) => {
        console.error("Screenshot failed:", err);
        return null;
      }),
      fetchPageSpeedInsights(companyUrl).catch((err) => {
        console.error("PageSpeed insights failed:", err);
        return null;
      }),
    ]);
    const websiteContent = scrapedSite?.combinedContent || null;
    console.log(`Phase 1 done in ${Date.now() - totalStart}ms (deep scrape: ${Object.keys(scrapedSite?.pages || {}).length} pages + screenshot + pagespeed)`);

    if (!websiteContent) {
      await storage.updateCompany(companyId, {
        summary: "We couldn't analyze your website. Please check the URL and try again.",
        lastScraped: new Date(),
      });
      return;
    }

    let visualInsights = '';
    let coreAnalysis;
    let siteProfile: SiteProfile | null;

    try {
      const phase2Start = Date.now();

      const [visualResult, profileResult] = await Promise.all([
        screenshotData
          ? analyzeScreenshot(screenshotData, companyUrl).catch((err) => {
              console.error("Visual analysis failed:", err);
              return '';
            })
          : Promise.resolve(''),
        extractCompanyProfile(websiteContent, companyUrl).catch((err) => {
          console.error("Profile extraction failed:", err);
          return null;
        }),
      ]);

      visualInsights = visualResult;
      siteProfile = profileResult;
      console.log(`Phase 2a done in ${Date.now() - phase2Start}ms (profile + visual)`);

      const phase2bStart = Date.now();
      coreAnalysis = await analyzeCompanyFast(websiteContent, companyUrl, visualInsights, siteProfile || undefined).catch((err) => {
        console.error("Core analysis failed:", err);
        return null;
      });
      console.log(`Phase 2b done in ${Date.now() - phase2bStart}ms (core analysis with profile)`);
    } catch (aiError: unknown) {
      const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
      console.error("AI analysis failed:", errorMessage);
      await storage.updateCompany(companyId, {
        summary: `AI analysis failed: ${errorMessage.substring(0, 100)}. Please refresh to try again.`,
        lastScraped: new Date(),
      });
      return;
    }

    if (!coreAnalysis) {
      await storage.updateCompany(companyId, {
        summary: "AI analysis failed. Please try again.",
        lastScraped: new Date(),
      });
      return;
    }

    await storage.updateCompany(companyId, {
      name: coreAnalysis.companyName,
      summary: coreAnalysis.summary,
      gtmMotion: coreAnalysis.gtmMotion,
      icpScore: coreAnalysis.icpScore,
      screenshotUrl: screenshotData || null,
      visualAnalysis: visualInsights || null,
      pageSpeedData: pageSpeedData || null,
      siteProfile: siteProfile || null,
      lastScraped: new Date(),
    });

    if (coreAnalysis.recommendations && Array.isArray(coreAnalysis.recommendations)) {
      await Promise.all(coreAnalysis.recommendations.map((rec: { category?: string; title?: string; description?: string; impact?: string; effort?: string; gtmFunnel?: string }) =>
        storage.createRecommendation({
          companyId,
          category: rec.category || "General",
          title: rec.title || "Recommendation",
          description: rec.description || "",
          impact: rec.impact || "Medium",
          effort: rec.effort || "Medium",
          status: "New",
          gtmFunnel: rec.gtmFunnel || "both",
        }).catch((err) => console.error("Failed to save recommendation:", err))
      ));
    }

    if (coreAnalysis.weeklyIdeas && Array.isArray(coreAnalysis.weeklyIdeas)) {
      await Promise.all(coreAnalysis.weeklyIdeas.map((idea: { title?: string; description?: string; type?: string }) =>
        storage.createWeeklyIdea({
          companyId,
          title: idea.title || "Content Idea",
          description: idea.description || "",
          type: idea.type || "Blog Post",
        }).catch((err) => console.error("Failed to save weekly idea:", err))
      ));
    }

    console.log(`Core results saved in ${Date.now() - totalStart}ms — dashboard is now usable`);

    const currentRunId = runId;
    const saveBatch = async (insights: Array<{
      channelId?: string;
      priority?: string;
      whyItMatters?: string;
      companyFitSummary?: string;
      heroStat?: { value: string; label: string };
      topKpis?: string[];
      strategicPillars?: Array<{ title: string; objective: string; tactics: string[]; measurement: string }>;
      quickWins?: Array<{ title: string; steps: string[]; effort: string; duration: string }>;
      resources?: string[];
      generationStatus?: "generated" | "fallback" | "pending" | "failed";
      strategyMeta?: ChannelInsightStrategyMeta;
    }>) => {
      const entry = activeAnalysisRuns.get(companyId);
      if (!entry || entry.runId !== currentRunId) {
        console.log(`  Skipping stale batch save (run ${currentRunId} superseded)`);
        return;
      }
      await Promise.all(insights.map((insight) =>
        storage.createChannelInsight({
          companyId,
          channelId: insight.channelId || "General",
          priority: insight.priority || "Medium",
          whyItMatters: insight.whyItMatters || "",
          companyFitSummary: insight.companyFitSummary || "",
          heroStat: insight.heroStat || { value: "N/A", label: "Stat" },
          topKpis: insight.topKpis || [],
          strategicPillars: insight.strategicPillars || [],
          quickWins: insight.quickWins || [],
          resources: insight.resources || [],
          generationStatus: insight.generationStatus || "generated",
          strategyMeta: insight.strategyMeta || null,
        }).catch((err) => console.error("Failed to save channel insight:", err))
      ));
      console.log(`  Saved ${insights.length} channel insights to DB (progressive)`);
    };

    try {
      const insights = await analyzeCompanyChannels(
        coreAnalysis.companyName,
        coreAnalysis.summary,
        coreAnalysis.gtmMotion,
        websiteContent,
        siteProfile || undefined,
        saveBatch
      );
      console.log(`All channel insights complete: ${insights?.length || 0} channels in ${Date.now() - totalStart}ms`);
    } catch (err: any) {
      console.error("Channel insights failed, saving fallback channel playbooks:", err?.message || err);
      await saveBatch(CHANNEL_IDS.map((channelId) => fallbackChannelInsight(
        channelId,
        coreAnalysis.companyName || "Your Company",
        coreAnalysis.summary || "",
        coreAnalysis.gtmMotion || "",
        siteProfile,
        "The channel strategy generation job failed before personalized strategies could be saved.",
      )));
    } finally {
      const entry = activeAnalysisRuns.get(companyId);
      if (entry && entry.runId === currentRunId) {
        activeAnalysisRuns.delete(companyId);
      }
    }

    try {
      const sender = await storage.getUserByEmail(email);
      await sendWelcomeEmail({
        toEmail: email,
        userName: fullName,
        companyName: coreAnalysis.companyName || "Your Company",
        summary: coreAnalysis.summary || "Your GTM strategy is ready!",
        gtmMotion: coreAnalysis.gtmMotion || "Growth",
        dashboardUrl: "https://gtmchampion.com/dashboard",
        unsubscribeToken: sender?.unsubscribeToken ?? undefined,
        recommendations: (coreAnalysis.recommendations || []).map((r: { category?: string; title?: string; impact?: string }) => ({
          category: r.category || "General",
          title: r.title || "Recommendation",
          impact: r.impact || "Medium",
        })),
      });
      console.log(`Welcome email sent to ${email} after channel strategies completed`);
    } catch (err) {
      console.error("Failed to send welcome email:", err);
    }

    console.log(`Analysis complete for ${coreAnalysis.companyName} in ${Date.now() - totalStart}ms`);
  } catch (error) {
    console.error(`Failed to process company analysis for company ${companyId}:`, error);
  }
}

export default router;
