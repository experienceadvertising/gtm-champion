import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import {
  chatRequestSchema,
  linkedInPostRequestSchema,
  emailCampaignRequestSchema,
  blogArticleRequestSchema,
  type ChannelInsightHeroStat,
} from "@shared/schema";
import type { ChannelInsight as OpenAIChannelInsight } from "../services/openai";
import { requireAuth } from "./middleware";
import { answerQuestion, generateLinkedInPost, generateEmailCampaign, generateBlogArticle, type ChatContext } from "../services/openai";
import { pgRateLimitStore } from "./rateLimitStore";

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many AI requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
  store: pgRateLimitStore("ai", 60 * 1000),
});

const contentGenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many content generation requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
  store: pgRateLimitStore("content_gen", 60 * 1000),
});

router.post("/api/chat", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const validatedData = chatRequestSchema.parse(req.body);

    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company data not found" });
    }

    const context: ChatContext = {
      companyName: company.name || 'Your Company',
      summary: company.summary || '',
      gtmMotion: company.gtmMotion || 'Growth',
    };

    if (validatedData.channelId) {
      const channelInsights = await storage.getChannelInsightsByCompanyId(company.id);
      const insight = channelInsights.find(ci => ci.channelId === validatedData.channelId);
      if (insight) {
        context.channelId = validatedData.channelId;
        context.channelInsight = {
          channelId: insight.channelId,
          priority: insight.priority as "High" | "Medium" | "Low",
          whyItMatters: insight.whyItMatters || '',
          companyFitSummary: insight.companyFitSummary || '',
          heroStat: insight.heroStat as ChannelInsightHeroStat,
          topKpis: insight.topKpis as string[],
          strategicPillars: insight.strategicPillars as OpenAIChannelInsight['strategicPillars'],
          quickWins: insight.quickWins as unknown as OpenAIChannelInsight['quickWins'],
          resources: insight.resources as string[],
        };
      }
    }

    const answer = await answerQuestion(validatedData.question, context);
    res.json({ answer });
  } catch (error: unknown) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

router.post("/api/generate/linkedin", requireAuth, contentGenLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const validatedData = linkedInPostRequestSchema.parse(req.body);

    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company data not found" });
    }

    const result = await generateLinkedInPost(
      validatedData,
      {
        companyName: company.name || 'Your Company',
        summary: company.summary || '',
        gtmMotion: company.gtmMotion || 'Growth',
        siteProfile: company.siteProfile || null,
      }
    );

    res.json(result);
  } catch (error: unknown) {
    console.error("LinkedIn generation error:", error);
    res.status(500).json({ error: "Failed to generate LinkedIn posts. Please try again." });
  }
});

router.post("/api/generate/email", requireAuth, contentGenLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const validatedData = emailCampaignRequestSchema.parse(req.body);

    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company data not found" });
    }

    const result = await generateEmailCampaign(
      validatedData,
      {
        companyName: company.name || 'Your Company',
        summary: company.summary || '',
        gtmMotion: company.gtmMotion || 'Growth',
        siteProfile: company.siteProfile || null,
      }
    );

    res.json(result);
  } catch (error: unknown) {
    console.error("Email campaign generation error:", error);
    res.status(500).json({ error: "Failed to generate email campaign. Please try again." });
  }
});

router.post("/api/generate/blog", requireAuth, contentGenLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const validatedData = blogArticleRequestSchema.parse(req.body);

    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company data not found" });
    }

    const result = await generateBlogArticle(
      validatedData,
      {
        companyName: company.name || 'Your Company',
        summary: company.summary || '',
        gtmMotion: company.gtmMotion || 'Growth',
        siteProfile: company.siteProfile || null,
      }
    );

    res.json(result);
  } catch (error: unknown) {
    console.error("Blog article generation error:", error);
    res.status(500).json({ error: "Failed to generate blog article. Please try again." });
  }
});

export default router;
