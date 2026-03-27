import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { integrationUpdateSchema } from "@shared/schema";
import { requireAuth } from "./middleware";

const router = Router();

router.get("/api/integrations", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const integrations = await storage.getUserIntegrations(userId);
    res.json(integrations);
  } catch (error: unknown) {
    console.error("Get integrations error:", error);
    res.status(500).json({ error: "Failed to get integrations" });
  }
});

router.post("/api/integrations/:integrationId", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { integrationId } = req.params;
    const validatedData = integrationUpdateSchema.parse(req.body);

    const existing = await storage.getUserIntegration(userId, integrationId);
    
    if (existing) {
      await storage.updateUserIntegrationStatus(userId, integrationId, validatedData.isConnected);
    } else {
      await storage.createUserIntegration({
        userId,
        integrationId,
        integrationName: validatedData.integrationName,
        isConnected: validatedData.isConnected,
      });
    }

    res.json({ message: validatedData.isConnected ? "Integration connected" : "Integration disconnected" });
  } catch (error: unknown) {
    console.error("Update integration error:", error);
    res.status(500).json({ error: "Failed to update integration" });
  }
});

router.delete("/api/integrations/:integrationId", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { integrationId } = req.params;
    await storage.deleteUserIntegration(userId, integrationId);
    res.json({ message: "Integration removed" });
  } catch (error: unknown) {
    console.error("Delete integration error:", error);
    res.status(500).json({ error: "Failed to delete integration" });
  }
});

export default router;
