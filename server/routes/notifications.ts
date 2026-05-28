import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { pushSubscribeSchema } from "@shared/schema";
import { requireAuth } from "./middleware";

const router = Router();

router.get("/api/notifications/vapid-key", requireAuth, (_req: Request, res: Response) => {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return res.status(500).json({ error: "Push notifications not configured" });
  }
  res.json({ publicKey: vapidPublicKey });
});

router.post("/api/notifications/subscribe", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const parsed = pushSubscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid subscription data", details: parsed.error.flatten() });
    }

    const existing = await storage.getPushSubscriptionByEndpoint(userId, parsed.data.endpoint);
    if (existing) {
      await storage.updatePushSubscriptionEnabled(existing.id, true);
      return res.json({ message: "Subscription re-enabled" });
    }

    await storage.createPushSubscription({
      userId,
      endpoint: parsed.data.endpoint,
      keys: parsed.data.keys,
      enabled: true,
    });

    res.json({ message: "Subscribed to push notifications" });
  } catch (error: any) {
    console.error("Push subscribe error:", error?.message || error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

router.post("/api/notifications/unsubscribe", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint required" });
    }
    await storage.deletePushSubscriptionByEndpoint(userId, endpoint);
    res.json({ message: "Unsubscribed from push notifications" });
  } catch (error: any) {
    console.error("Push unsubscribe error:", error?.message || error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

router.get("/api/notifications/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const subs = await storage.getPushSubscriptionsByUserId(userId);
    const enabled = subs.some(s => s.enabled);
    res.json({ subscribed: subs.length > 0, enabled });
  } catch (error: any) {
    console.error("Push status error:", error?.message || error);
    res.status(500).json({ error: "Failed to get status" });
  }
});

router.post("/api/notifications/toggle", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "enabled (boolean) required" });
    }
    const subs = await storage.getPushSubscriptionsByUserId(userId);
    for (const sub of subs) {
      await storage.updatePushSubscriptionEnabled(sub.id, enabled);
    }
    res.json({ message: enabled ? "Notifications enabled" : "Notifications disabled" });
  } catch (error: any) {
    console.error("Push toggle error:", error?.message || error);
    res.status(500).json({ error: "Failed to toggle notifications" });
  }
});

const GTM_TIPS = [
  { title: "🎯 GTM Tip: Focus on One Channel", body: "The most successful B2B SaaS companies master one marketing channel before expanding. Pick your highest-impact channel and double down.", url: "/dashboard" },
  { title: "📊 Weekly Strategy Check", body: "Have you reviewed your GTM recommendations this week? Companies that act on their top 3 recommendations see 2x faster growth.", url: "/dashboard" },
  { title: "✍️ Content is King", body: "B2B buyers consume 3-7 pieces of content before talking to sales. Use our content tools to create LinkedIn posts, emails, and blog articles.", url: "/content-tools" },
  { title: "🔍 SEO Quick Win", body: "Update your page titles and meta descriptions with your target keywords. This simple change can boost organic traffic by 20-30%.", url: "/dashboard?channel=SEO" },
  { title: "📧 Email Marketing Reminder", body: "Segmented email campaigns see 26% higher open rates. Review your email strategy and target the right audience segments.", url: "/dashboard?channel=Email%20Marketing" },
  { title: "💡 Product-Led Growth Tip", body: "Offer a free trial or freemium tier to let users experience value before purchasing. PLG companies grow 2-3x faster than sales-led.", url: "/dashboard" },
  { title: "🤝 ABM Strategy Insight", body: "Account-Based Marketing delivers 97% higher ROI than other strategies. Identify your top 10 target accounts and create personalized outreach.", url: "/dashboard?channel=ABM" },
  { title: "📱 Social Proof Matters", body: "92% of B2B buyers read reviews before purchasing. Collect and showcase customer testimonials on your website and social channels.", url: "/dashboard?channel=Organic%20Social" },
  { title: "🚀 Quick Win Available", body: "Check your dashboard for quick-win recommendations — these are high-impact, low-effort actions you can complete this week.", url: "/dashboard" },
  { title: "📈 Community Building", body: "Companies with active user communities see 5x higher retention. Start a Slack group, Discord server, or forum for your users.", url: "/dashboard?channel=Community" },
];

router.post("/api/notifications/send-tips", async (req: Request, res: Response) => {
  try {
    const cronSecret = req.headers["x-cron-secret"];
    const envSecret = process.env.CRON_SECRET;
    if (!envSecret || !cronSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const crypto = await import("crypto");
    const isValid = crypto.timingSafeEqual(
      Buffer.from(String(cronSecret)),
      Buffer.from(envSecret)
    );
    if (!isValid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let webpush: any;
    try {
      const mod = await import("web-push");
      webpush = mod.default ?? mod;
    } catch {
      return res.status(500).json({ error: "web-push not available" });
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublicKey || !vapidPrivateKey) {
      return res.status(500).json({ error: "VAPID keys not configured" });
    }

    webpush.setVapidDetails("mailto:hello@gtmchampion.com", vapidPublicKey, vapidPrivateKey);

    const subscriptions = await storage.getAllEnabledPushSubscriptions();
    const tip = GTM_TIPS[Math.floor(Math.random() * GTM_TIPS.length)];

    let sent = 0;
    let failed = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ title: tip.title, body: tip.body, url: tip.url })
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await storage.deletePushSubscription(sub.id);
        }
      }
    }

    res.json({ sent, failed, total: subscriptions.length });
  } catch (error: any) {
    console.error("Send tips error:", error?.message || error);
    res.status(500).json({ error: "Failed to send tips" });
  }
});

export default router;
