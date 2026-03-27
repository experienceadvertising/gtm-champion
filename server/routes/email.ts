import crypto from "crypto";
import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import {
  inviteFriendSchema,
  shareStrategySchema,
  type ChannelInsightHeroStat,
  type ChannelInsightStrategicPillar,
  type ChannelInsightQuickWin,
} from "@shared/schema";
import { requireAuth } from "./middleware";
import { sendInviteFriendEmail, sendShareStrategyEmail, sendWeeklyEmail, sendChannelStrategyEmail } from "../services/email";
import { generateChannelPDF } from "../services/pdfExport";
import { generateWeeklyIdeas } from "../services/openai";
import { sendChannelEmailsToAllUsers } from "../services/scheduler";

const router = Router();

router.post("/api/invite-friend", requireAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = inviteFriendSchema.parse(req.body);
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ error: "User not found" });

    await sendInviteFriendEmail({
      toEmail: validatedData.toEmail,
      toName: validatedData.toName || "",
      fromName: user.fullName || user.email.split("@")[0],
    });
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Invite friend error:", error);
    res.status(500).json({ error: "Failed to send invite" });
  }
});

router.post("/api/share-strategy", requireAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = shareStrategySchema.parse(req.body);
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ error: "User not found" });

    const company = await storage.getCompanyByUserId(user.id);
    if (!company) return res.status(404).json({ error: "No company found" });

    const insights = await storage.getChannelInsightsByCompanyId(company.id);
    const channelInsight = insights.find(i => i.channelId === validatedData.channelId);
    if (!channelInsight) return res.status(404).json({ error: "Channel strategy not found" });

    const recommendations = await storage.getRecommendationsByCompanyId(company.id);
    const channelRecs = recommendations.filter(r => r.category === validatedData.channelId);

    const pdfBuffer = await generateChannelPDF({
      companyName: company.name || "Your Company",
      companyUrl: company.url,
      channelId: validatedData.channelId,
      insight: {
        channelId: validatedData.channelId,
        priority: channelInsight.priority,
        whyItMatters: channelInsight.whyItMatters || "",
        companyFitSummary: channelInsight.companyFitSummary || "",
        heroStat: (channelInsight.heroStat as ChannelInsightHeroStat) || { value: "", label: "" },
        topKpis: (channelInsight.topKpis as string[]) || [],
        strategicPillars: (channelInsight.strategicPillars as ChannelInsightStrategicPillar[]) || [],
        quickWins: (channelInsight.quickWins as ChannelInsightQuickWin[]) || [],
      },
      recommendations: channelRecs.map(r => ({
        category: r.category,
        title: r.title,
        description: r.description,
        impact: r.impact,
        effort: r.effort,
        status: r.status,
        gtmFunnel: r.gtmFunnel,
      })),
    });

    await sendShareStrategyEmail({
      toEmail: validatedData.toEmail,
      toName: validatedData.toName || "",
      fromName: user.fullName || user.email.split("@")[0],
      companyName: company.name || "Your Company",
      channelName: validatedData.channelId,
      channelStrategy: {
        whyItMatters: channelInsight.whyItMatters || "",
        companyFitSummary: channelInsight.companyFitSummary || "",
        heroStat: (channelInsight.heroStat as ChannelInsightHeroStat) || { value: "", label: "" },
        strategicPillars: (channelInsight.strategicPillars as ChannelInsightStrategicPillar[]) || [],
        quickWins: (channelInsight.quickWins as ChannelInsightQuickWin[]) || [],
      },
      recommendations: channelRecs.map(r => ({
        title: r.title,
        impact: r.impact,
        description: r.description,
      })),
      pdfAttachment: pdfBuffer,
    });
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Share strategy error:", error);
    res.status(500).json({ error: "Failed to share strategy" });
  }
});

router.post("/api/cron/weekly-emails", async (req: Request, res: Response) => {
  try {
    const cronSecret = req.headers["x-cron-secret"];
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret) {
      console.error("CRON_SECRET environment variable not set");
      return res.status(500).json({ error: "Server configuration error" });
    }
    
    if (typeof cronSecret !== 'string') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const cronBuf = Buffer.from(cronSecret);
    const expectedBuf = Buffer.from(expectedSecret);
    if (cronBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(cronBuf, expectedBuf)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("Starting weekly email job...");
    
    const allUsers = await storage.getAllUsers();
    let sent = 0;
    let failed = 0;

    for (const user of allUsers) {
      try {
        const company = await storage.getCompanyByUserId(user.id);
        if (!company || !company.name) {
          console.log(`Skipping user ${user.email} - no company data`);
          continue;
        }

        const freshIdeas = await generateWeeklyIdeas(
          company.name,
          company.summary || "",
          company.gtmMotion || "Growth"
        );

        await storage.deleteWeeklyIdeasByCompanyId(company.id);
        for (const idea of freshIdeas) {
          await storage.createWeeklyIdea({
            companyId: company.id,
            title: idea.title,
            description: idea.description,
            type: idea.type,
          });
        }

        await sendWeeklyEmail({
          toEmail: user.email,
          userName: user.fullName,
          companyName: company.name,
          ideas: freshIdeas,
        });

        sent++;
        console.log(`Weekly email sent to ${user.email}`);
      } catch (userError) {
        console.error(`Failed to process user ${user.email}:`, userError);
        failed++;
      }
    }

    res.json({ 
      message: "Weekly emails processed",
      sent,
      failed,
      total: allUsers.length
    });
  } catch (error: unknown) {
    console.error("Weekly email cron error:", error);
    res.status(500).json({ error: "Failed to process weekly emails" });
  }
});

// Cron endpoint for channel deep-dive emails
router.post("/api/cron/channel-emails", async (req: Request, res: Response) => {
  try {
    const cronSecret = req.headers["x-cron-secret"];
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    if (typeof cronSecret !== 'string') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const cronBuf = Buffer.from(cronSecret);
    const expectedBuf = Buffer.from(expectedSecret);
    if (cronBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(cronBuf, expectedBuf)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("Starting channel deep-dive email job...");
    const result = await sendChannelEmailsToAllUsers();
    res.json({ message: "Channel emails processed", ...result });
  } catch (error: unknown) {
    console.error("Channel email cron error:", error);
    res.status(500).json({ error: "Failed to process channel emails" });
  }
});

// Send a test channel strategy email to a specific user
router.post("/api/send-channel-email/:userId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { channelId } = req.body;

    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const company = await storage.getCompanyByUserId(userId);
    if (!company || !company.name) return res.status(400).json({ error: "Company data not available" });

    const channelInsights = await storage.getChannelInsightsByCompanyId(company.id);
    const insight = channelInsights.find(ci => ci.channelId === channelId);
    if (!insight) return res.status(404).json({ error: `No insight found for channel: ${channelId}` });

    await sendChannelStrategyEmail({
      toEmail: user.email,
      userName: user.fullName,
      companyName: company.name,
      channelId: insight.channelId,
      priority: insight.priority,
      whyItMatters: insight.whyItMatters || "",
      companyFitSummary: insight.companyFitSummary || "",
      heroStat: insight.heroStat as { value: string; label: string },
      topKpis: insight.topKpis as string[],
      strategicPillars: insight.strategicPillars as ChannelInsightStrategicPillar[],
      quickWins: insight.quickWins as ChannelInsightQuickWin[],
    });

    res.json({ success: true, message: `Channel strategy email (${channelId}) sent to ${user.email}` });
  } catch (error: unknown) {
    console.error("Send channel email error:", error);
    res.status(500).json({ error: "Failed to send channel email" });
  }
});

export default router;
