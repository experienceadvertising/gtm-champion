import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import { insertUserSchema, loginSchema } from "@shared/schema";
import { sendNewUserNotification } from "../services/email";
import { processCompanyAnalysis } from "./company";
import { pgRateLimitStore } from "./rateLimitStore";

const router = Router();

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
      if (validPassword) {
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

          processCompanyAnalysis(company.id, validatedData.companyUrl, validatedData.fullName, validatedData.email).catch(
            err => console.error("Background analysis failed:", err)
          );
        }

        req.session.userId = existingUser.id;
      }

      return res.status(200).json({
        message: "Check your email to continue.",
      });
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const user = await storage.createUser({
      ...validatedData,
      password: hashedPassword,
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

    processCompanyAnalysis(company.id, validatedData.companyUrl, validatedData.fullName, validatedData.email).catch(
      err => console.error("Background analysis failed:", err)
    );

    sendNewUserNotification({
      userName: validatedData.fullName,
      email: validatedData.email,
      companyUrl: validatedData.companyUrl,
    }).catch(err => console.error("Admin notification failed:", err));

    req.session.userId = user.id;

    res.status(201).json({
      message: "Check your email to continue.",
    });
  } catch (error: unknown) {
    console.error("Registration error:", error);
    const err = error as { code?: string };
    if (err.code === '23505') {
      return res.status(200).json({ message: "Check your email to continue." });
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

    req.session.userId = user.id;

    res.json({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      isPremium: user.isPremium,
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
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
  res.json({
    authenticated: true,
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
  });
});

export default router;
