import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { agentSettingsSchema } from "@shared/schema";
import { requireAuth, requirePremium } from "./middleware";
import crypto from "crypto";
import { getPublicAppUrl } from "../appUrl";

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

// Always strip www. — this must match what's registered in Slack's redirect URIs
function slackRedirectUri(): string {
  const baseUrl = getPublicAppUrl().replace("https://www.", "https://");
  return `${baseUrl}/api/auth/slack/callback`;
}

// Origin used for the post-OAuth dashboard redirect (preserves www. vs non-www.)
function originBase(): string {
  return getPublicAppUrl();
}

// Sign a state token: "{userId}:{ts}:{b64origin}:{sig}"
// Carries everything needed — no session lookup required in callback
function signSlackState(userId: string, origin: string): string {
  const ts = Date.now().toString();
  const b64 = Buffer.from(origin).toString("base64url");
  const secret = process.env.SESSION_SECRET || "dev-secret";
  const sig = crypto.createHmac("sha256", secret)
    .update(`${userId}:${ts}:${b64}`)
    .digest("hex")
    .slice(0, 32);
  return `${userId}:${ts}:${b64}:${sig}`;
}

interface SlackStatePayload { userId: string; origin: string }

function verifySlackState(state: string): SlackStatePayload | null {
  try {
    // format: userId:ts:b64origin:sig  (userId is a UUID — no colons)
    const parts = state.split(":");
    if (parts.length < 4) return null;
    const sig = parts[parts.length - 1];
    const b64 = parts[parts.length - 2];
    const ts = parts[parts.length - 3];
    const userId = parts.slice(0, parts.length - 3).join(":");
    if (!userId || !ts || !b64 || !sig) return null;
    if (Date.now() - parseInt(ts) > 10 * 60 * 1000) return null;
    const secret = process.env.SESSION_SECRET || "dev-secret";
    const expected = crypto.createHmac("sha256", secret)
      .update(`${userId}:${ts}:${b64}`)
      .digest("hex")
      .slice(0, 32);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const origin = Buffer.from(b64, "base64url").toString();
    return { userId, origin };
  } catch {
    return null;
  }
}

// Slack OAuth — step 1: redirect to Slack authorization page
router.get("/api/auth/slack", requireAuth, requirePremium, (req: Request, res: Response) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "Slack is not configured" });
  }

  const state = signSlackState(req.session.userId!, originBase());
  const redirectUri = slackRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "incoming-webhook",
    redirect_uri: redirectUri,
    state,
  });

  res.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
});

// Slack OAuth — step 2: handle callback — session-free; userId + origin from signed state
router.get("/api/auth/slack/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;

  const errRedirect = (key: string, origin = "https://gtmchampion.com") =>
    res.redirect(`${origin}/dashboard?slack_error=${key}`);

  if (error) return errRedirect("cancelled");

  const payload = verifySlackState(state || "");
  if (!payload) return errRedirect("invalid_state");

  const { userId, origin } = payload;

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return errRedirect("not_configured", origin);

  const redirectUri = slackRedirectUri();

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
      return errRedirect("no_webhook", origin);
    }

    await storage.updateUserSlackWebhook(userId, data.incoming_webhook.url);

    // Send a welcome test message (non-blocking)
    fetch(data.incoming_webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: ":white_check_mark: *GTM Champion connected!* Your GTM Agent will now send nudges here for milestone check-ins, stall alerts, and weekly coaching digests.",
      }),
    }).catch(() => {});

    return res.redirect(`${origin}/dashboard?slack_connected=1`);
  } catch (err: any) {
    console.error("Slack callback error:", err?.message || err);
    return errRedirect("server_error", origin);
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
