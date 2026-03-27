import { Router, type Request, type Response } from "express";
import { PassThrough } from "stream";
import { storage } from "../storage";
import type {
  ChannelInsightHeroStat,
  ChannelInsightStrategicPillar,
  ChannelInsightQuickWin,
} from "@shared/schema";
import { requireAuth } from "./middleware";
import { generateStrategyPDF } from "../services/pdfExport";

const router = Router();

router.get("/api/export/csv", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const company = await storage.getCompanyByUserId(userId);
    if (!company || !company.name) {
      return res.status(404).json({ error: "No analysis data available to export" });
    }

    const recs = await storage.getRecommendationsByCompanyId(company.id);

    const escapeCSV = (val: string) => {
      if (!val) return '';
      let safe = val;
      if (/^[=+\-@\t\r]/.test(safe)) {
        safe = "'" + safe;
      }
      if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
        return `"${safe.replace(/"/g, '""')}"`;
      }
      return safe;
    };

    const header = 'Channel,Title,Description,Impact,Effort,Status,GTM Funnel';
    const rows = recs.map(r =>
      [r.category, r.title, r.description, r.impact, r.effort, r.status, r.gtmFunnel || 'both']
        .map(v => escapeCSV(v || ''))
        .join(',')
    );

    const csv = [header, ...rows].join('\n');
    const sanitizedName = (company.name || "company").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const filename = `${sanitizedName}_recommendations.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error: unknown) {
    console.error("CSV export error:", error);
    res.status(500).json({ error: "Failed to generate CSV" });
  }
});

router.get("/api/export/pdf", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const company = await storage.getCompanyByUserId(userId);
    if (!company || !company.name) {
      return res.status(404).json({ error: "No analysis data available to export" });
    }

    const recommendations = await storage.getRecommendationsByCompanyId(company.id);
    const channelInsights = await storage.getChannelInsightsByCompanyId(company.id);
    const weeklyIdeas = await storage.getWeeklyIdeasByCompanyId(company.id);

    const sanitizedName = (company.name || "company").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const filename = `${sanitizedName}_gtm_strategy.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const stream = new PassThrough();
    stream.pipe(res);

    generateStrategyPDF({
      company: {
        name: company.name,
        url: company.url,
        summary: company.summary,
        gtmMotion: company.gtmMotion,
        siteProfile: company.siteProfile,
      },
      recommendations: recommendations.map(r => ({
        category: r.category,
        title: r.title,
        description: r.description,
        impact: r.impact,
        effort: r.effort,
        status: r.status,
        gtmFunnel: r.gtmFunnel,
      })),
      channelInsights: channelInsights.map(ci => ({
        channelId: ci.channelId,
        priority: ci.priority,
        whyItMatters: ci.whyItMatters,
        companyFitSummary: ci.companyFitSummary,
        heroStat: ci.heroStat as ChannelInsightHeroStat,
        topKpis: ci.topKpis as string[],
        strategicPillars: ci.strategicPillars as ChannelInsightStrategicPillar[],
        quickWins: ci.quickWins as ChannelInsightQuickWin[],
      })),
      weeklyIdeas: weeklyIdeas.map(wi => ({
        title: wi.title,
        description: wi.description,
        type: wi.type,
      })),
    }, stream);
  } catch (error: unknown) {
    console.error("PDF export error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  }
});

export default router;
