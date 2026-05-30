import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import crypto from "crypto";

const router = Router();

function verifyCronSecret(req: Request, res: Response): boolean {
  const cronSecret = req.headers["x-cron-secret"];
  const envSecret = process.env.CRON_SECRET;
  if (!envSecret || !cronSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(String(cronSecret)),
      Buffer.from(envSecret)
    );
    if (!isValid) {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    }
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

const GTM_TIPS = [
  { title: "GTM Tip: Focus on One Channel", body: "The most successful B2B SaaS companies master one marketing channel before expanding. Pick your highest-impact channel and double down.", url: "/dashboard" },
  { title: "Weekly Strategy Check", body: "Have you reviewed your GTM recommendations this week? Companies that act on their top 3 recommendations see 2x faster growth.", url: "/dashboard" },
  { title: "Content is King", body: "B2B buyers consume 3-7 pieces of content before talking to sales. Use our content tools to create LinkedIn posts, emails, and blog articles.", url: "/content-tools" },
  { title: "SEO Quick Win", body: "Update your page titles and meta descriptions with your target keywords. This simple change can boost organic traffic by 20-30%.", url: "/dashboard?channel=SEO" },
  { title: "Email Marketing Reminder", body: "Segmented email campaigns see 26% higher open rates. Review your email strategy and target the right audience segments.", url: "/dashboard?channel=Email%20Marketing" },
  { title: "Product-Led Growth Tip", body: "Offer a free trial or freemium tier to let users experience value before purchasing. PLG companies grow 2-3x faster than sales-led.", url: "/dashboard" },
  { title: "ABM Strategy Insight", body: "Account-Based Marketing delivers 97% higher ROI than other strategies. Identify your top 10 target accounts and create personalized outreach.", url: "/dashboard?channel=ABM" },
  { title: "Social Proof Matters", body: "92% of B2B buyers read reviews before purchasing. Collect and showcase customer testimonials on your website and social channels.", url: "/dashboard?channel=Organic%20Social" },
  { title: "Quick Win Available", body: "Check your dashboard for quick-win recommendations -- these are high-impact, low-effort actions you can complete this week.", url: "/dashboard" },
  { title: "Community Building", body: "Companies with active user communities see 5x higher retention. Start a Slack group, Discord server, or forum for your users.", url: "/dashboard?channel=Community" },
];

router.post("/api/cron/send-tips", async (req: Request, res: Response) => {
  if (!verifyCronSecret(req, res)) return;

  try {
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
    console.error("Cron send-tips error:", error?.message || error);
    res.status(500).json({ error: "Failed to send tips" });
  }
});

export default router;
