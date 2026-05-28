import crypto from "crypto";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startWeeklyEmailScheduler } from "./services/scheduler";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from "./services/stripeClient";
import { WebhookHandlers } from "./services/webhookHandlers";
import { pgRateLimitStore } from "./routes/rateLimitStore";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId: string;
    isPremium?: boolean;
    slackOAuthState?: string;
  }
}

const isProduction = process.env.NODE_ENV === "production";

let sessionSecret: string;
if (process.env.SESSION_SECRET) {
  sessionSecret = process.env.SESSION_SECRET;
} else if (isProduction) {
  throw new Error("SESSION_SECRET environment variable is required in production");
} else {
  sessionSecret = crypto.randomBytes(32).toString("hex");
  console.warn("WARNING: SESSION_SECRET not set. Using random secret — sessions will not persist across restarts.");
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ['*'],
        description: 'Managed webhook for Stripe sync',
      }
    );
    console.log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`);

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => {
        console.log('Stripe data synced');
      })
      .catch((err: unknown) => {
        console.error('Error syncing Stripe data:', err);
      });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

app.post(
  '/api/stripe/webhook/:uuid',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);

      res.status(200).json({ received: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Webhook error:', message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression());

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: false,
    referrerPolicy: false,
    frameguard: false,
  })
);

const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: pgRateLimitStore("api-global", 15 * 60 * 1000),
  skip: (req) => req.path.startsWith("/api/stripe/webhook") || req.path.startsWith("/api/cron/"),
  message: { error: "Too many requests, please try again later." },
});
app.use("/api", globalApiLimiter);

async function ensureSessionTable() {
  if (!process.env.DATABASE_URL) return;
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    await pool.end();
    console.log("Session table verified/created");
  } catch (err) {
    console.error("Failed to ensure session table:", err);
  }
}

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.cookies['csrf-token']) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie('csrf-token', token, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
    });
  }
  next();
});

function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  if (req.path.startsWith('/api/stripe/webhook')) {
    return next();
  }
  if (req.path.startsWith('/api/cron/')) {
    return next();
  }

  const cookieToken = req.cookies['csrf-token'];
  const headerToken = req.headers['x-csrf-token'] as string | undefined;

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: "CSRF token missing" });
  }

  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);
  if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    return res.status(403).json({ error: "CSRF token invalid" });
  }

  next();
}

app.use(csrfProtection);

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  res.setHeader(
    "Content-Security-Policy",
    isProduction
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com https://api.stripe.com; frame-src https://js.stripe.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self' https://*.replit.dev https://*.replit.app;"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self' ws: wss: https:; object-src 'none'; base-uri 'self';"
  );
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

const MAX_LOGGED_RESPONSE_CHARS = 500;

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  if (!isProduction) {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const serialized = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${serialized.length > MAX_LOGGED_RESPONSE_CHARS
          ? serialized.slice(0, MAX_LOGGED_RESPONSE_CHARS) + `…(${serialized.length} chars)`
          : serialized}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  await ensureSessionTable();
  await initStripe();
  await registerRoutes(httpServer, app);

  app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;

    if (isProduction) {
      console.error("Server error:", err.message, err.stack);
      res.status(status).json({ message: status < 500 ? err.message : "Internal Server Error" });
    } else {
      res.status(status).json({ message: err.message || "Internal Server Error" });
    }
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      startWeeklyEmailScheduler();
    },
  );
})();
