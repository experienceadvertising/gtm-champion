import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import { ZodError } from "zod";
import { storage } from "../storage";
import { insertUserSchema, loginSchema } from "@shared/schema";
import { sendNewUserNotification } from "../services/email";
import { processCompanyAnalysis } from "./company";
import { issueRecoveryToken, redeemRecoveryToken, validRecoveryInput } from "../services/passwordRecovery";
import { recoveryEmailConfigured, sendPasswordRecoveryEmail } from "../services/email";
import { getPublicAppUrl } from "../appUrl";
import { pgRateLimitStore } from "./rateLimitStore";

const router = Router();

function sessionPayload(user: {
  id: string;
  email: string;
  fullName: string;
  isPremium: boolean;
  isAdmin: boolean;
}) {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    isPremium: user.isPremium,
    isAdmin: user.isAdmin,
  };
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Please try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
  store: pgRateLimitStore("login", 60 * 1000),
});

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: "Too many registration attempts. Please try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
  store: pgRateLimitStore("register", 60 * 1000),
});

router.post("/api/register", registerLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = insertUserSchema.parse(req.body);
    
    const existingUser = await storage.getUserByEmail(validatedData.email);
    if (existingUser) {
      const validPassword = await bcrypt.compare(validatedData.password, existingUser.password);
      if (!validPassword) {
        return res.status(409).json({
          error: "An account already exists for this email. Sign in instead.",
        });
      }

      const existingCompany = await storage.getCompanyByUserId(existingUser.id);
      if (!existingCompany) {
        const company = await storage.createCompany({
          userId: existingUser.id,
          url: validatedData.companyUrl,
          name: null,
          summary: "Analyzing your website...",
          gtmMotion: null,
          icpScore: null,
        });

        await processCompanyAnalysis(company.id, validatedData.companyUrl, validatedData.fullName, validatedData.email).catch(
          err => console.error("Background analysis failed:", err)
        );
      }

      await regenerateSession(req);
      req.session.userId = existingUser.id;
      req.session.isPremium = existingUser.isPremium;
      await saveSession(req);

      return res.status(200).json(sessionPayload(existingUser));
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const { randomUUID } = await import("crypto");
    const user = await storage.createUser({
      ...validatedData,
      password: hashedPassword,
      unsubscribeToken: randomUUID(),
    });

    let company;
    try {
      company = await storage.createCompany({
        userId: user.id,
        url: validatedData.companyUrl,
        name: null,
        summary: "Analyzing your website...",
        gtmMotion: null,
        icpScore: null,
      });
    } catch (companyError) {
      console.error("Company creation failed, cleaning up user:", companyError);
      await storage.deleteUser(user.id).catch(err => console.error("User cleanup failed:", err));
      throw companyError;
    }

    await processCompanyAnalysis(company.id, validatedData.companyUrl, validatedData.fullName, validatedData.email).catch(
      err => console.error("Background analysis failed:", err)
    );

    sendNewUserNotification({
      userName: validatedData.fullName,
      email: validatedData.email,
      companyUrl: validatedData.companyUrl,
    }).catch(err => console.error("Admin notification failed:", err));

    await regenerateSession(req);
    req.session.userId = user.id;
    req.session.isPremium = user.isPremium;
    await saveSession(req);

    res.status(201).json(sessionPayload(user));
  } catch (error: unknown) {
    if (error instanceof ZodError) return res.status(400).json({ error: error.issues[0]?.message || "Invalid registration details" });
    console.error("Registration error:", error);
    const err = error as { code?: string };
    if (err.code === '23505') {
      return res.status(409).json({ error: "An account already exists for this email. Sign in instead." });
    }
    if (error instanceof Error && error.message.includes("must be at least")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(400).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/api/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await storage.getUserByEmail(validatedData.email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(validatedData.password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await regenerateSession(req);
    req.session.userId = user.id;
    req.session.isPremium = user.isPremium;
    await saveSession(req);

    res.json(sessionPayload(user));
  } catch (error: unknown) {
    if (error instanceof ZodError) return res.status(400).json({ error: "Please enter a valid email and password." });
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

const recoveryLimiter = rateLimit({windowMs:15*60*1000,max:10,standardHeaders:true,legacyHeaders:false,
  store:pgRateLimitStore('password-recovery',15*60*1000),message:{error:'Too many attempts. Please try again later.'}});
router.post('/api/forgot-password', recoveryLimiter, async (req,res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) return res.status(400).json({error:'Please enter a valid email address.'});
  if (!recoveryEmailConfigured()) return res.status(503).json({error:'Password recovery is temporarily unavailable. Please try again later.'});
  // Match observable response and timing for known and unknown addresses.
  const started = Date.now();
  try {
    const user = await storage.getUserByEmail(email);
    if (user) {
      const token = await issueRecoveryToken(user.id);
      if (token) await sendPasswordRecoveryEmail(email,`${getPublicAppUrl()}/reset-password#token=${token}`);
    }
  } catch { console.error('Password recovery delivery unavailable'); }
  await new Promise(resolve => setTimeout(resolve, Math.max(0,1500-(Date.now()-started))));
  res.json({message:'If an account uses that email, a reset link will arrive shortly. Check your spam folder too.'});
});
router.post('/api/reset-password', recoveryLimiter, async (req,res) => {
  if (!validRecoveryInput(req.body.token,req.body.password)) return res.status(400).json({error:'Enter a valid reset link and a password of 8 to 72 bytes.'});
  try {
    if (!await redeemRecoveryToken(req.body.token,req.body.password)) return res.status(400).json({error:'This reset link has expired or was already used. Request a new one.'});
    res.clearCookie('connect.sid');
    res.json({message:'Password updated. Sign in with your new password.'});
  } catch { res.status(503).json({error:'Password recovery is temporarily unavailable. Please try again later.'}); }
});

router.post("/api/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

router.get("/api/session", async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    return res.json({ authenticated: false });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.json({ authenticated: false });
  }
  req.session.isPremium = user.isPremium;
  res.json({
    authenticated: true,
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    isPremium: user.isPremium,
    isAdmin: user.isAdmin,
  });
});

export default router;
