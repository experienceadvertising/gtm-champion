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


export default router;
