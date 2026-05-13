import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { requireAuth, requirePremium } from "./middleware";

const router = Router();

router.get("/api/strategy/history", requireAuth, requirePremium, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const snapshots = await storage.getStrategySnapshotsByUserId(userId);
    res.json({
      snapshots: snapshots.map((s) => ({
        id: s.id,
        label: s.label,
        createdAt: s.createdAt,
        companyId: s.companyId,
      })),
    });
  } catch (error: unknown) {
    console.error("History list error:", error);
    res.status(500).json({ error: "Failed to load strategy history" });
  }
});

router.get("/api/strategy/history/:id", requireAuth, requirePremium, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid snapshot id" });
    }
    const userId = req.session.userId!;
    const snapshot = await storage.getStrategySnapshot(id, userId);
    if (!snapshot) {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    res.json({ snapshot });
  } catch (error: unknown) {
    console.error("History detail error:", error);
    res.status(500).json({ error: "Failed to load snapshot" });
  }
});

export default router;
