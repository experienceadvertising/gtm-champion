import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { budgetAllocationRequestSchema } from "@shared/schema";
import { requireAuth, PREMIUM_REQUIRED_CODE } from "./middleware";
import { generateBudgetAllocation, type BudgetScenario } from "../services/openai";

const router = Router();

const ALLOWED_SCENARIOS: BudgetScenario[] = ["conservative", "balanced", "aggressive"];

router.post("/api/budget/generate", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const parsed = budgetAllocationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid budget data", details: parsed.error.flatten() });
    }

    const requestedScenarios = Array.isArray(req.body?.scenarios)
      ? req.body.scenarios.filter((s: unknown): s is BudgetScenario =>
          typeof s === "string" && ALLOWED_SCENARIOS.includes(s as BudgetScenario)
        )
      : [];

    const scenarios: BudgetScenario[] = requestedScenarios.length > 0 ? requestedScenarios : ["balanced"];

    if (!user.isPremium && (scenarios.length > 1 || (scenarios[0] && scenarios[0] !== "balanced"))) {
      return res.status(403).json({
        error: "Multiple budget scenarios and aggressive/conservative modes are a Pro feature.",
        code: PREMIUM_REQUIRED_CODE,
        upgradeUrl: "/pricing",
      });
    }

    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const channelInsights = await storage.getChannelInsightsByCompanyId(company.id);
    const recommendations = await storage.getRecommendationsByCompanyId(company.id);

    const context = {
      companyName: company.name || "Unknown",
      summary: company.summary || "",
      gtmMotion: company.gtmMotion || "Unknown",
      siteProfile: company.siteProfile || undefined,
    };

    const results = await Promise.all(
      scenarios.map(async (scenario) => {
        const allocation = await generateBudgetAllocation(
          parsed.data.totalBudget,
          context,
          channelInsights,
          recommendations,
          scenario,
        );
        return { scenario, ...allocation };
      })
    );

    const primary = results[0];
    const saved = await storage.createBudgetAllocation({
      companyId: company.id,
      totalBudget: parsed.data.totalBudget,
      allocations: primary.allocations,
    });

    res.json({
      ...saved,
      scenarios: results.map((r) => ({ scenario: r.scenario, allocations: r.allocations })),
    });
  } catch (error: any) {
    console.error("Budget generation error:", error?.message || error);
    res.status(500).json({ error: error?.message || "Failed to generate budget allocation" });
  }
});

router.get("/api/budget", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const allocations = await storage.getBudgetAllocationsByCompanyId(company.id);
    res.json(allocations);
  } catch (error: any) {
    console.error("Budget fetch error:", error?.message || error);
    res.status(500).json({ error: "Failed to fetch budget allocations" });
  }
});

router.get("/api/budget/latest", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const latest = await storage.getLatestBudgetAllocation(company.id);
    res.json(latest || null);
  } catch (error: any) {
    console.error("Budget latest error:", error?.message || error);
    res.status(500).json({ error: "Failed to fetch latest allocation" });
  }
});

router.post("/api/budget/save", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const company = await storage.getCompanyByUserId(userId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const { totalBudget, allocations } = req.body;
    if (!totalBudget || !allocations || !Array.isArray(allocations)) {
      return res.status(400).json({ error: "Invalid allocation data" });
    }

    const saved = await storage.createBudgetAllocation({
      companyId: company.id,
      totalBudget,
      allocations,
    });

    res.json(saved);
  } catch (error: any) {
    console.error("Budget save error:", error?.message || error);
    res.status(500).json({ error: "Failed to save budget allocation" });
  }
});

router.delete("/api/budget/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const company = await storage.getCompanyByUserId(req.session.userId!);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    await storage.deleteBudgetAllocation(id, company.id);
    res.json({ message: "Deleted" });
  } catch (error: any) {
    console.error("Budget delete error:", error?.message || error);
    res.status(500).json({ error: "Failed to delete allocation" });
  }
});

export default router;
