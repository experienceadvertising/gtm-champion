import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { agentSettingsSchema } from "@shared/schema";
import { requireAuth, requirePremium } from "./middleware";

const router = Router();

router.get("/api/agent/events", requireAuth, requirePremium, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const [events, nextNudge] = await Promise.all([
      storage.getRecentAgentEvents(userId, 10),
      storage.getUpcomingScheduledNudge(userId),
    ]);
    res.json({
      events,
      nextCheckIn: nextNudge
        ? { dueAt: nextNudge.dueAt, channelId: nextNudge.channelId, nudgeType: nextNudge.nudgeType }
        : null,
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

export default router;
