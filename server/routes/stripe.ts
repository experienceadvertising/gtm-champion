import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { checkoutSchema } from "@shared/schema";
import { requireAuth } from "./middleware";
import { stripeService } from "../services/stripeService";
import { getStripePublishableKey } from "../services/stripeClient";

const router = Router();

interface StripeProductRow {
  product_id: string;
  product_name: string;
  product_description: string;
  product_active: boolean;
  product_metadata: Record<string, string>;
  price_id: string | null;
  unit_amount: number;
  currency: string;
  recurring: { interval: string; interval_count: number };
  price_active: boolean;
  price_metadata: Record<string, string>;
}

router.get("/api/stripe/config", async (_req: Request, res: Response) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error: unknown) {
    console.error("Stripe config error:", error);
    res.status(500).json({ error: "Failed to get Stripe config" });
  }
});

router.get("/api/stripe/products", async (_req: Request, res: Response) => {
  try {
    const products = await stripeService.listProductsWithPrices();
    
    const productsMap = new Map<string, {
      id: string;
      name: string;
      description: string;
      active: boolean;
      metadata: Record<string, string>;
      prices: Array<{
        id: string;
        unit_amount: number;
        currency: string;
        recurring: { interval: string; interval_count: number };
        active: boolean;
        metadata: Record<string, string>;
      }>;
    }>();

    for (const row of products as unknown as StripeProductRow[]) {
      if (!productsMap.has(row.product_id)) {
        productsMap.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          active: row.product_active,
          metadata: row.product_metadata,
          prices: []
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id)!.prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
          active: row.price_active,
          metadata: row.price_metadata,
        });
      }
    }

    res.json({ data: Array.from(productsMap.values()) });
  } catch (error: unknown) {
    console.error("Get products error:", error);
    res.status(500).json({ error: "Failed to get products" });
  }
});

router.post("/api/stripe/checkout", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const validatedData = checkoutSchema.parse(req.body);

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(user.email, user.id, user.fullName);
      await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const session = await stripeService.createCheckoutSession(
      customerId,
      validatedData.priceId,
      `${baseUrl}/dashboard?upgrade=success`,
      `${baseUrl}/dashboard?upgrade=cancelled`
    );

    res.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/api/stripe/portal", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const user = await storage.getUser(userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ error: "No subscription found" });
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const session = await stripeService.createCustomerPortalSession(
      user.stripeCustomerId,
      `${baseUrl}/dashboard`
    );

    res.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Portal error:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

router.get("/api/stripe/subscription", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.stripeCustomerId) {
      return res.json({ subscription: null, isPremium: user.isPremium });
    }

    const subscription = await stripeService.getSubscriptionByCustomerId(user.stripeCustomerId);
    
    if (subscription && subscription.status === 'active' && !user.isPremium) {
      await storage.updateUserPremiumStatus(userId, true);
    }

    res.json({ 
      subscription,
      isPremium: user.isPremium || (subscription?.status === 'active')
    });
  } catch (error: unknown) {
    console.error("Subscription error:", error);
    res.status(500).json({ error: "Failed to get subscription" });
  }
});

export default router;
