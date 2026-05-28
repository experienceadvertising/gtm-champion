import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { agentSettingsSchema } from "@shared/schema";
import { requireAuth, requirePremium } from "./middleware";
import { z } from "zod";

const router = Router();

router.get("/api/agent/events", requireAuth, requirePremium, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const [events, nextNudge, user] = await Promise.all([
      storage.getRecentAgentEvents(userId, 10),
      storage.getUpcomingScheduledNudge(userId),
      storage.getUser(userId),
    ]);
    res.json({
      events,
      nextCheckIn: nextNudge
        ? { dueAt: nextNudge.dueAt, channelId: nextNudge.channelId, nudgeType: nextNudge.nudgeType }
        : null,
      slackConnected: !!user?.slackWebhookUrl,
    });
  } catch (err: any) {
    console.error("Agent events error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch agent events" });
  }
});

router.patch("/api/agent/settings", requireAuth, requirePremium, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const parsed = agentSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    await storage.updateUserAgentEnabled(userId, parsed.data.agentEnabled);
    req.session.isPremium = undefined as any;
    res.json({ message: "Agent settings updated", agentEnabled: parsed.data.agentEnabled });
  } catch (err: any) {
    console.error("Agent settings error:", err?.message || err);
    res.status(500).json({ error: "Failed to update agent settings" });
  }
});

const slackWebhookSchema = z.object({
  webhookUrl: z.string().url().startsWith("https://hooks.slack.com/", "Must be a Slack webhook URL"),
});

router.post("/api/agent/slack", requireAuth, requirePremium, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const parsed = slackWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid webhook URL. Must start with https://hooks.slack.com/" });
    }

    const testResult = await fetch(parsed.data.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "✅ *GTM Champion connected!* Your GTM Agent will now send Slack nudges for milestone check-ins, stall alerts, and weekly coaching digests.",
      }),
    });

    if (!testResult.ok && testResult.status !== 200) {
      return res.status(400).json({ error: "Could not send a test message to that webhook. Please check the URL and try again." });
    }

    await storage.updateUserSlackWebhook(userId, parsed.data.webhookUrl);
    res.json({ message: "Slack connected", slackConnected: true });
  } catch (err: any) {
    console.error("Slack connect error:", err?.message || err);
    res.status(500).json({ error: "Failed to connect Slack" });
  }
});

router.delete("/api/agent/slack", requireAuth, requirePremium, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    await storage.updateUserSlackWebhook(userId, null);
    res.json({ message: "Slack disconnected", slackConnected: false });
  } catch (err: any) {
    console.error("Slack disconnect error:", err?.message || err);
    res.status(500).json({ error: "Failed to disconnect Slack" });
  }
});

export default router;
