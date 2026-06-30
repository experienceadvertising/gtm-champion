import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "./middleware";

const router = Router();

/**
 * POST /api/email-preferences/unsubscribe?token=<token>
 * One-click unsubscribe — no auth required (linked from emails).
 */
router.post("/unsubscribe", async (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    const user = await storage.getUserByUnsubscribeToken(token);
    if (!user) {
      return res.status(404).json({ error: "Invalid token" });
    }

    const alreadyUnsubscribed = user.emailUnsubscribed;
    if (!alreadyUnsubscribed) {
      await storage.updateEmailUnsubscribed(user.id, true);
    }

    return res.json({ ok: true, email: user.email, alreadyUnsubscribed });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/email-preferences/resubscribe?token=<token>
 * Re-subscribe — no auth required (linked from unsubscribe confirmation page).
 */
router.post("/resubscribe", async (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    const user = await storage.getUserByUnsubscribeToken(token);
    if (!user) {
      return res.status(404).json({ error: "Invalid token" });
    }

    await storage.updateEmailUnsubscribed(user.id, false);
    return res.json({ ok: true, email: user.email });
  } catch (err) {
    console.error("Resubscribe error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/email-preferences
 * Returns the current user's email preferences (requires login).
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ emailUnsubscribed: user.emailUnsubscribed });
  } catch (err) {
    console.error("Get email preferences error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /api/email-preferences
 * Update email subscription preference (requires login).
 */
router.patch("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { emailUnsubscribed } = req.body as { emailUnsubscribed?: boolean };
    if (typeof emailUnsubscribed !== "boolean") {
      return res.status(400).json({ error: "emailUnsubscribed must be a boolean" });
    }
    await storage.updateEmailUnsubscribed(req.session.userId!, emailUnsubscribed);
    return res.json({ ok: true, emailUnsubscribed });
  } catch (err) {
    console.error("Update email preferences error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
