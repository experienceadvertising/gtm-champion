import { publishAnalysis } from '../services/analysisPublication';
import { groundEvidence } from '../services/grounding';
import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { icpUpdateSchema, recommendationStatusSchema } from "@shared/schema";
import type { ChannelInsightStrategyMeta, SiteProfile } from "@shared/schema";
import { requireAuth } from "./middleware";
import { collectCompanyWebsiteSignals, extractCompanyProfile, analyzeCompanyFast, analyzeCompanyChannels, analyzeScreenshot, fallbackChannelInsight } from "../services/openai";
import { sendWelcomeEmail } from "../services/email";
import { UnsafePublicUrlError } from "../services/publicHttp";
import {
  buildCrossChannelStrategyPlan,
  buildStrategyMeta,
  markTopChannels,
  normalizeConfidence,
  scoreChannelInsightQuality,
} from "../services/channelStrategy";

import { enqueueAnalysis, enqueueReanalysis, analysisJobState, assertAnalysisLease, jobPool } from "../services/analysisJobs";
import { getAnalysisState } from "@shared/analysisState";

const router = Router();

const CHANNEL_IDS = ['SEO', 'Content', 'LLMs', 'CRO', 'Email Marketing', 'Paid Search', 'Paid Social', 'Organic Social', 'Retargeting', 'Community', 'ABM', 'Partnerships', 'Outbound'];

export function withFallbackChannelInsights(
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
        confidence: normalizeConfidence(strategyMeta.confidence),
        evidence: strategyMeta.evidence.map(item => ({ ...item,
          confidence: item.verified ? normalizeConfidence(item.confidence) : Math.min(40,normalizeConfidence(item.confidence)),
          sourceType: item.verified ? item.sourceType : 'assumption',
          url: item.verified ? item.url : undefined,
          source: item.verified ? item.source : 'AI planning suggestion, source not independently verified',
        })),
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

    const channelCount = new Set(channelInsights.map(insight => insight.channelId)).size;
    const job = await analysisJobState(company.id);
    const jobPending = job?.status === "queued" || job?.status === "running";
    const { channelsPending: legacyPending } = getAnalysisState(company, channelCount);
    const channelsPending = job ? jobPending : legacyPending;
    const completedChannelInsights = company.name && !channelsPending
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

    const hasCompleteChannelPlan = completedChannelInsights.length >= CHANNEL_IDS.length;

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
      analysis: {
        channelsPending,
        persistedChannelCount: channelCount,
        status: job?.status || null,
        error: job?.error || null,
      },
      recommendations,
      weeklyIdeas,
      channelInsights: completedChannelInsights,
      strategyPlan: hasCompleteChannelPlan
        ? buildCrossChannelStrategyPlan(
            completedChannelInsights,
            company.name || "Your Company",
          )
        : null,
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
    const parsed = recommendationStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Status must be New, In Progress, or Completed" });
    }
    const validatedData = parsed.data;

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

    const previousJob = await analysisJobState(cid);
    const retryingFailure = previousJob?.status === "failed";
    if (!retryingFailure && !user.isPremium && company.lastReanalyzedAt) {
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

    const existingJob = await analysisJobState(cid);
    if (["queued", "running"].includes(existingJob?.status)) {
      return res.status(409).json({ error: "An analysis is already running for this company." });
    }

    const claimedAt = new Date();

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

    await enqueueReanalysis(cid,user.isPremium,new Date(claimedAt.getTime()-REANALYSIS_WINDOW_MS));

    res.json({ message: "Analysis restarted" });
  } catch (error: unknown) {
    if (error instanceof Error && /already running|already been used/.test(error.message)) return res.status(409).json({error:error.message});
    console.error("Retry analysis error:", error);
    res.status(500).json({ error: "Failed to retry analysis" });
  }
});

export async function processCompanyAnalysis(companyId: number, _url: string, _name: string, _email: string): Promise<void> {
  await enqueueAnalysis(companyId);
}

export async function executeCompanyAnalysis(companyId: number, companyUrl: string, fullName: string, email: string, token: string): Promise<void> {
  const { scrapedSite, screenshotData, pageSpeedData } = await collectCompanyWebsiteSignals(companyUrl);
  const websiteContent = scrapedSite?.combinedContent;
  if (!websiteContent) throw new Error('Website unavailable');
  const [visualInsights, siteProfile] = await Promise.all([
    screenshotData ? analyzeScreenshot(screenshotData,companyUrl).catch(() => '') : Promise.resolve(''),
    extractCompanyProfile(websiteContent,companyUrl).catch(() => null),
  ]);
  const core = await analyzeCompanyFast(websiteContent,companyUrl,visualInsights,siteProfile || undefined);
  if (!core?.companyName || !core.summary || !core.recommendations?.length) throw new Error('Incomplete core analysis');
  await assertAnalysisLease(companyId,token);
  let insights: Awaited<ReturnType<typeof analyzeCompanyChannels>>;
  try { insights = await analyzeCompanyChannels(core.companyName,core.summary,core.gtmMotion,websiteContent,siteProfile || undefined); }
  catch { insights = []; }
  const byChannel = new Map(insights.map(item => [item.channelId,item]));
  const complete = CHANNEL_IDS.map(channelId => byChannel.get(channelId) || fallbackChannelInsight(channelId,core.companyName,core.summary,core.gtmMotion,siteProfile,'Personalized generation was unavailable.'));
  for (const insight of complete) {
    if (insight.strategyMeta) insight.strategyMeta.evidence = groundEvidence(insight.strategyMeta.evidence,websiteContent,companyUrl);
  }
  await assertAnalysisLease(companyId,token);
  await publishAnalysis(companyId,token,{core,screenshotData,visualInsights,pageSpeedData,siteProfile,complete});
  try {
    const sender = await storage.getUserByEmail(email);
    await sendWelcomeEmail({toEmail:email,userName:fullName,companyName:core.companyName,summary:core.summary,gtmMotion:core.gtmMotion,dashboardUrl:'https://gtmchampion.com/dashboard',unsubscribeToken:sender?.unsubscribeToken || undefined,recommendations:core.recommendations});
  } catch { console.error('Report email unavailable; saved report remains accessible'); }
}

export default router;
