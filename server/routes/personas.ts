import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { buyerPersonaUpdateSchema } from "@shared/schema";
import { requireAuth } from "./middleware";
import { generateBuyerPersonas } from "../services/openai";

const router = Router();

router.post("/api/personas/generate", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const existingPersonas = await storage.getBuyerPersonasByCompanyId(company.id);

    const personas = await generateBuyerPersonas({
      companyName: company.name || "Unknown",
      summary: company.summary || "",
      gtmMotion: company.gtmMotion || "Unknown",
      siteProfile: company.siteProfile || undefined,
    });

    if (existingPersonas.length > 0) {
      await storage.deleteBuyerPersonasByCompanyId(company.id);
    }

    const saved = await storage.createBuyerPersonasBatch(
      personas.map(p => ({ ...p, companyId: company.id }))
    );

    res.json(saved);
  } catch (error: any) {
    console.error("Persona generation error:", error?.message || error);
    res.status(500).json({ error: error?.message || "Failed to generate personas" });
  }
});

router.get("/api/personas", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const personas = await storage.getBuyerPersonasByCompanyId(company.id);
    res.json(personas);
  } catch (error: any) {
    console.error("Personas fetch error:", error?.message || error);
    res.status(500).json({ error: "Failed to fetch personas" });
  }
});

router.patch("/api/personas/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const parsed = buyerPersonaUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid update data", details: parsed.error.flatten() });
    }

    const persona = await storage.getBuyerPersona(id);
    if (!persona) {
      return res.status(404).json({ error: "Persona not found" });
    }

    await storage.updateBuyerPersona(id, parsed.data);
    const updated = await storage.getBuyerPersona(id);
    res.json(updated);
  } catch (error: any) {
    console.error("Persona update error:", error?.message || error);
    res.status(500).json({ error: "Failed to update persona" });
  }
});

router.post("/api/personas/add", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const persona = await storage.createBuyerPersona({
      companyId: company.id,
      name: req.body.name || "New Persona",
      jobTitle: req.body.jobTitle || "Role Title",
      seniority: req.body.seniority || "Mid-Level",
      department: req.body.department || "General",
      companySizeRange: req.body.companySizeRange || "10-50",
      industryVerticals: req.body.industryVerticals || ["Technology"],
      geographicFocus: req.body.geographicFocus || "North America",
      painPoints: req.body.painPoints || ["To be defined"],
      goals: req.body.goals || ["To be defined"],
      buyingTriggers: req.body.buyingTriggers || ["To be defined"],
      preferredChannels: req.body.preferredChannels || ["Email"],
      objections: req.body.objections || ["To be defined"],
      dayInTheLife: req.body.dayInTheLife || "A typical day for this persona...",
    });

    res.json(persona);
  } catch (error: any) {
    console.error("Persona add error:", error?.message || error);
    res.status(500).json({ error: "Failed to add persona" });
  }
});

router.delete("/api/personas/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    await storage.deleteBuyerPersona(id);
    res.json({ message: "Deleted" });
  } catch (error: any) {
    console.error("Persona delete error:", error?.message || error);
    res.status(500).json({ error: "Failed to delete persona" });
  }
});

export default router;
