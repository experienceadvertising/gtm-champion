import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { requireAdmin } from "./middleware";
import { generateWeeklyIdeas } from "../services/openai";
import { sendWeeklyEmail } from "../services/email";
import {
  fireMilestoneStart,
  fireStallNudge,
  sendWeeklyCoachingDigest,
} from "../services/gtmAgent";

const router = Router();

router.get("/api/admin/users", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const allUsers = await storage.getAllUsers();
    const allCompanies = await storage.getAllCompanies();

    const companyMap = new Map(allCompanies.map(c => [c.userId, c]));

    const usersWithCompany = allUsers.map(u => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      companyUrl: u.companyUrl,
      isPremium: u.isPremium,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      company: companyMap.get(u.id) ? {
        name: companyMap.get(u.id)!.name,
        gtmMotion: companyMap.get(u.id)!.gtmMotion,
        lastScraped: companyMap.get(u.id)!.lastScraped,
      } : null,
    }));

    res.json(usersWithCompany);
  } catch (error: unknown) {
    console.error("Admin get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/api/admin/analytics", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const allUsers = await storage.getAllUsers();
    const allCompanies = await storage.getAllCompanies();

    const totalUsers = allUsers.length;
    const premiumUsers = allUsers.filter(u => u.isPremium).length;
    const analyzedCompanies = allCompanies.filter(c => c.name && c.name !== "").length;

    const gtmMotions: Record<string, number> = {};
    allCompanies.forEach(c => {
      if (c.gtmMotion) {
        gtmMotions[c.gtmMotion] = (gtmMotions[c.gtmMotion] || 0) + 1;
      }
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = allUsers.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length;
    const weeklyUsers = allUsers.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length;

    const signupsByDay: Record<string, number> = {};
    allUsers.forEach(u => {
      const day = new Date(u.createdAt).toISOString().split('T')[0];
      signupsByDay[day] = (signupsByDay[day] || 0) + 1;
    });

    const recentSignups = Object.entries(signupsByDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 30)
      .reverse();

    const allRecs = await storage.getAllRecommendations();
    const totalRecs = allRecs.length;
    const completedRecs = allRecs.filter(r => r.status === "Completed").length;
    const recsByCategory: Record<string, number> = {};
    allRecs.forEach(r => {
      recsByCategory[r.category] = (recsByCategory[r.category] || 0) + 1;
    });

    res.json({
      totalUsers,
      premiumUsers,
      analyzedCompanies,
      recentUsers,
      weeklyUsers,
      gtmMotions,
      recentSignups,
      totalRecs,
      completedRecs,
      recsByCategory,
    });
  } catch (error: unknown) {
    console.error("Admin analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.patch("/api/admin/users/:userId/premium", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const target = await storage.getUser(userId);
    if (!target) return res.status(404).json({ error: "User not found" });
    const newStatus = !target.isPremium;
    await storage.updateUserPremiumStatus(userId, newStatus);
    res.json({ isPremium: newStatus });
  } catch (err: any) {
    console.error("Admin toggle premium error:", err?.message || err);
    res.status(500).json({ error: "Failed to update premium status" });
  }
});

router.post("/api/admin/agent/trigger/:userId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { type } = req.body as { type: string };

    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (type === "weekly_digest") {
      await sendWeeklyCoachingDigest(userId);
      return res.json({ message: "Weekly digest sent" });
    }

    const company = await storage.getCompanyByUserId(userId);
    if (!company) return res.status(400).json({ error: "User has no company data yet" });

    const recs = await storage.getRecommendationsByCompanyId(company.id);
    const inProgress = recs.find(r => r.status === "In Progress") ?? recs[0];
    if (!inProgress) return res.status(400).json({ error: "User has no recommendations yet" });

    const channelId = inProgress.category.toLowerCase().replace(/\s+/g, "-");

    if (type === "milestone_start") {
      await fireMilestoneStart(userId, channelId, inProgress.id);
      return res.json({ message: `Milestone start fired for channel "${channelId}"` });
    }

    if (type === "stall_nudge") {
      const nudge = await storage.createScheduledNudge({
        userId,
        channelId,
        nudgeType: "stall",
        dueAt: new Date(Date.now() - 1000),
      });
      await fireStallNudge(userId, channelId, nudge.id);
      return res.json({ message: `Stall nudge fired for channel "${channelId}"` });
    }

    return res.status(400).json({ error: "Unknown trigger type" });
  } catch (err: any) {
    console.error("Admin agent trigger error:", err?.message || err);
    res.status(500).json({ error: err?.message || "Failed to trigger agent event" });
  }
});

router.delete("/api/admin/users/:userId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const targetUser = await storage.getUser(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (targetUser.isAdmin) {
      return res.status(400).json({ error: "Cannot delete admin users" });
    }
    await storage.deleteUser(userId);
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Admin delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.get("/api/admin/agent-events", requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const eventType = req.query.eventType as string | undefined;
    const since = req.query.since ? new Date(req.query.since as string) : undefined;
    const until = req.query.until ? new Date(req.query.until as string) : undefined;

    const data = await storage.getAgentEventsForAdmin({ limit, offset, eventType, since, until });
    res.json(data);
  } catch (error: unknown) {
    console.error("Admin agent events error:", error);
    res.status(500).json({ error: "Failed to fetch agent events" });
  }
});

router.post("/api/send-weekly-email/:userId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const company = await storage.getCompanyByUserId(userId);
    if (!company || !company.name) {
      return res.status(400).json({ error: "Company data not available" });
    }

    const freshIdeas = await generateWeeklyIdeas(
      company.name,
      company.summary || "",
      company.gtmMotion || "Growth"
    );

    await storage.deleteWeeklyIdeasByCompanyId(company.id);
    await storage.createWeeklyIdeasBatch(
      freshIdeas.map((idea) => ({
        companyId: company.id,
        title: idea.title,
        description: idea.description,
        type: idea.type,
      }))
    );

    await sendWeeklyEmail({
      toEmail: user.email,
      userName: user.fullName,
      companyName: company.name,
      ideas: freshIdeas,
    });

    res.json({ 
      message: "Weekly email sent successfully",
      ideas: freshIdeas
    });
  } catch (error: unknown) {
    console.error("Send weekly email error:", error);
    res.status(500).json({ error: "Failed to send weekly email" });
  }
});

export default router;
