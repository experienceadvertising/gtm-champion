import Stripe from 'stripe';
import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from '../storage';
import { db } from '../../db/index';
import { sql } from 'drizzle-orm';

interface StripeEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    
    const result = await sync.processWebhook(payload, signature, uuid);
    
    if (result && result.event) {
      await WebhookHandlers.handleStripeEvent(result.event as StripeEvent);
    }
  }

  static async handleStripeEvent(event: StripeEvent): Promise<void> {
    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { mode?: string; customer?: string };
        if (session.mode === 'subscription' && session.customer) {
          await WebhookHandlers.activatePremiumByCustomerId(session.customer);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as { customer: string; id: string; status: string };
        const customerId = subscription.customer;
        
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          await WebhookHandlers.activatePremiumByCustomerId(customerId, subscription.id);
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await WebhookHandlers.deactivatePremiumByCustomerId(customerId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as { customer: string };
        await WebhookHandlers.deactivatePremiumByCustomerId(subscription.customer);
        break;
      }

      default:
        break;
    }
  }

  static async activatePremiumByCustomerId(customerId: string, subscriptionId?: string): Promise<void> {
    try {
      const result = await db.execute(
        sql`SELECT id FROM users WHERE stripe_customer_id = ${customerId}`
      );
      
      let userId: string | null = result.rows.length > 0 ? (result.rows[0].id as string) : null;
      
      if (!userId) {
        const stripe = await getUncachableStripeClient();
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) {
          const fullCustomer = customer as Stripe.Customer;
          if (fullCustomer.metadata?.userId) {
            userId = fullCustomer.metadata.userId;
            await storage.updateUserStripeInfo(userId!, { stripeCustomerId: customerId });
            console.log(`Linked customer ${customerId} to user ${userId} via metadata`);
          }
        }
      }
      
      if (userId) {
        await storage.updateUserPremiumStatus(userId, true);
        if (subscriptionId) {
          await storage.updateUserStripeInfo(userId, { stripeSubscriptionId: subscriptionId });
        }
        console.log(`Activated premium for user ${userId} (customer: ${customerId})`);
      } else {
        console.log(`No user found for customer ${customerId}`);
      }
    } catch (error) {
      console.error('Error activating premium:', error);
    }
  }

  static async deactivatePremiumByCustomerId(customerId: string): Promise<void> {
    try {
      const result = await db.execute(
        sql`SELECT id FROM users WHERE stripe_customer_id = ${customerId}`
      );
      
      if (result.rows.length > 0) {
        const userId = result.rows[0].id as string;
        await storage.updateUserPremiumStatus(userId, false);
        console.log(`Deactivated premium for user ${userId} (customer: ${customerId})`);
      }
    } catch (error) {
      console.error('Error deactivating premium:', error);
    }
  }
}
