import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { icpUpdateSchema, recommendationStatusSchema } from "@shared/schema";
import type { SiteProfile } from "@shared/schema";
import { requireAuth } from "./middleware";
import { scrapeWebsiteDeep, extractCompanyProfile, analyzeCompanyFast, analyzeCompanyChannels, captureScreenshot, analyzeScreenshot, fetchPageSpeedInsights } from "../services/openai";
import { sendWelcomeEmail } from "../services/email";

const router = Router();

const ANALYSIS_TTL_MS = 10 * 60 * 1000;
const activeAnalysisRuns = new Map<number, { runId: string; startedAt: number }>();

function cleanupStaleAnalysisRuns() {
  const now = Date.now();
  for (const [companyId, entry] of Array.from(activeAnalysisRuns.entries())) {
    if (now - entry.startedAt > ANALYSIS_TTL_MS) {
      console.log(`Cleaning up stale analysis run for company ${companyId} (started ${Math.round((now - entry.startedAt) / 1000)}s ago)`);
      activeAnalysisRuns.delete(companyId);
    }
  }
}

router.get("/api/dashboard", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company data not yet available" });
    }

    const recommendations = await storage.getRecommendationsByCompanyId(company.id);
    const weeklyIdeas = await storage.getWeeklyIdeasByCompanyId(company.id);
    const channelInsights = await storage.getChannelInsightsByCompanyId(company.id);

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isPremium: user.isPremium,
        isAdmin: user.isAdmin,
      },
      company: {
        id: company.id,
        name: company.name,
        url: company.url,
        summary: company.summary,
        gtmMotion: company.gtmMotion,
        icpScore: company.icpScore,
        screenshotUrl: company.screenshotUrl,
        visualAnalysis: company.visualAnalysis,
        pageSpeedData: company.pageSpeedData,
        lastScraped: company.lastScraped,
        siteProfile: company.siteProfile || null,
      },
      recommendations,
      weeklyIdeas,
      channelInsights,
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

    await storage.updateRecommendationStatus(parseInt(id), validatedData.status);
    res.json({ message: "Status updated" });
  } catch (error: unknown) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

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

    await storage.updateCompany(cid, {
      summary: "Analyzing your website...",
      name: null,
      gtmMotion: null,
      icpScore: null,
      lastScraped: new Date(),
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
    cleanupStaleAnalysisRuns();

    const totalStart = Date.now();
    const runId = `${companyId}-${Date.now()}`;
    activeAnalysisRuns.set(companyId, { runId, startedAt: totalStart });
    console.log(`Starting analysis for ${companyUrl} (run: ${runId})...`);

    await storage.deleteRecommendationsByCompanyId(companyId);
    await storage.deleteWeeklyIdeasByCompanyId(companyId);
    await storage.deleteChannelInsightsByCompanyId(companyId);
    await storage.updateCompany(companyId, {
      screenshotUrl: null,
      visualAnalysis: null,
      pageSpeedData: null,
    });

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
        }).catch((err) => console.error("Failed to save channel insight:", err))
      ));
      console.log(`  Saved ${insights.length} channel insights to DB (progressive)`);
    };

    analyzeCompanyChannels(
      coreAnalysis.companyName,
      coreAnalysis.summary,
      coreAnalysis.gtmMotion,
      websiteContent,
      siteProfile || undefined,
      saveBatch
    ).then((insights) => {
      console.log(`All channel insights complete: ${insights?.length || 0} channels in ${Date.now() - totalStart}ms`);
    }).catch((err) => {
      console.error("Channel insights failed:", err?.message || err);
    });

    sendWelcomeEmail({
      toEmail: email,
      userName: fullName,
      companyName: coreAnalysis.companyName || "Your Company",
      summary: coreAnalysis.summary || "Your GTM strategy is ready!",
      gtmMotion: coreAnalysis.gtmMotion || "Growth",
      dashboardUrl: "https://gtmchampion.com/dashboard",
      recommendations: (coreAnalysis.recommendations || []).map((r: { category?: string; title?: string; impact?: string }) => ({
        category: r.category || "General",
        title: r.title || "Recommendation",
        impact: r.impact || "Medium",
      })),
    }).then(() => console.log(`Welcome email sent to ${email}`))
      .catch((err) => console.error("Failed to send welcome email:", err));

    console.log(`Core analysis complete for ${coreAnalysis.companyName} in ${Date.now() - totalStart}ms — channel insights loading progressively`);
  } catch (error) {
    console.error(`Failed to process company analysis for company ${companyId}:`, error);
  }
}

export default router;
