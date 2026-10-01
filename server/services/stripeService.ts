import { storage } from '../storage';
import { selectPremiumSubscription } from './subscriptionEntitlement';
import { getUncachableStripeClient } from './stripeClient';
import { sql } from 'drizzle-orm';
import { db } from '../db';

export class StripeService {
  async createCustomer(email: string, userId: string, name: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async listProductsWithPrices(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`
        WITH paginated_products AS (
          SELECT DISTINCT ON (name) id, name, description, metadata, active
          FROM stripe.products
          WHERE active = ${active}
            AND (
              metadata->>'tier' = 'premium'
              OR name = 'GTM Champion Pro'
            )
          ORDER BY name, id DESC
          LIMIT ${limit} OFFSET ${offset}
        )
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM paginated_products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getPrice(priceId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] || null;
  }

  async isEligiblePremiumPrice(priceId: string): Promise<boolean> {
    const result = await db.execute(
      sql`
        SELECT 1
        FROM stripe.prices pr
        INNER JOIN stripe.products p ON p.id = pr.product
        WHERE pr.id = ${priceId}
          AND pr.active = true
          AND p.active = true
          AND pr.recurring IS NOT NULL
          AND (
            p.metadata->>'tier' = 'premium'
            OR p.name = 'GTM Champion Pro'
          )
        LIMIT 1
      `
    );
    return result.rows.length === 1;
  }

  async listPrices(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async getSubscriptionByCustomerId(customerId: string) {
    // Read Stripe directly so delayed or reordered sync events cannot revoke another plan.
    const stripe = await getUncachableStripeClient();
    const subscriptions = [];
    const products = new Map<string, Awaited<ReturnType<typeof stripe.products.retrieve>>>();
    for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 })) {
      if (!['active','trialing'].includes(subscription.status)) continue;
      for (const item of subscription.items.data) {
        if (typeof item.price.product === 'string') {
          const id = item.price.product;
          if (!products.has(id)) products.set(id,await stripe.products.retrieve(id));
          item.price.product = products.get(id)!;
        }
      }
      subscriptions.push(subscription);
    }
    return selectPremiumSubscription(subscriptions);
  }

  async reconcileUser(user: { id: string; stripeCustomerId: string | null; isPremium: boolean }) {
    if (!user.stripeCustomerId) return { subscription: null, isPremium: user.isPremium };
    const subscription = await this.getSubscriptionByCustomerId(user.stripeCustomerId);
    const isPremium = Boolean(subscription);
    if (isPremium !== user.isPremium) await storage.updateUserPremiumStatus(user.id, isPremium);
    if (subscription) await storage.updateUserStripeInfo(user.id, { stripeSubscriptionId: subscription.id });
    return { subscription, isPremium };
  }
}

export const stripeService = new StripeService();
