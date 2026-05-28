import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { agentSettingsSchema } from "@shared/schema";
import { requireAuth, requirePremium } from "./middleware";
import crypto from "crypto";

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

// Slack OAuth — step 1: redirect to Slack authorization page
router.get("/api/auth/slack", requireAuth, requirePremium, (req: Request, res: Response) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "Slack is not configured" });
  }
  const state = crypto.randomBytes(16).toString("hex");
  req.session.slackOAuthState = state;

  const rawHost = req.get("host") || "";
  const host = rawHost.replace(/^www\./, "");
  const protocol = host.includes("replit.dev") || host.includes("replit.app") ? "https" : req.protocol;
  const redirectUri = `${protocol}://${host}/api/auth/slack/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "incoming-webhook",
    redirect_uri: redirectUri,
    state,
  });

  res.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
});

// Slack OAuth — step 2: handle callback, exchange code for webhook URL
router.get("/api/auth/slack/callback", requireAuth, async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    return res.redirect("/dashboard?slack_error=cancelled");
  }

  if (!state || state !== req.session.slackOAuthState) {
    return res.redirect("/dashboard?slack_error=invalid_state");
  }

  delete req.session.slackOAuthState;

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.redirect("/dashboard?slack_error=not_configured");
  }

  const rawHost = req.get("host") || "";
  const host = rawHost.replace(/^www\./, "");
  const protocol = host.includes("replit.dev") || host.includes("replit.app") ? "https" : req.protocol;
  const redirectUri = `${protocol}://${host}/api/auth/slack/callback`;

  try {
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenRes.json() as any;

    if (!data.ok || !data.incoming_webhook?.url) {
      console.error("Slack OAuth error:", data.error || "No webhook URL returned");
      return res.redirect("/dashboard?slack_error=no_webhook");
    }

    await storage.updateUserSlackWebhook(req.session.userId!, data.incoming_webhook.url);

    // Send a welcome test message (non-blocking)
    fetch(data.incoming_webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: ":white_check_mark: *GTM Champion connected!* Your GTM Agent will now send nudges here for milestone check-ins, stall alerts, and weekly coaching digests.",
      }),
    }).catch(() => {});

    return res.redirect("/dashboard?slack_connected=1");
  } catch (err: any) {
    console.error("Slack callback error:", err?.message || err);
    return res.redirect("/dashboard?slack_error=server_error");
  }
});

// Slack disconnect
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
