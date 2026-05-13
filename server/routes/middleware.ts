import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export const PREMIUM_REQUIRED_CODE = "PREMIUM_REQUIRED";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export async function requirePremium(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  // Cache hit fast-path. Hot endpoints (chat, content gen) trade a stale-cancel
  // window for one fewer DB read per request; cache is refreshed on next /api/session
  // call or login.
  if (req.session.isPremium === true) return next();

  const user = await storage.getUser(req.session.userId);
  if (!user?.isPremium) {
    req.session.isPremium = false;
    return res.status(403).json({
      error: "Pro subscription required",
      code: PREMIUM_REQUIRED_CODE,
      upgradeUrl: "/pricing",
    });
  }
  req.session.isPremium = true;
  next();
}
