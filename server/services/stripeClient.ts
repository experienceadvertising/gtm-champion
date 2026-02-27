import Stripe from 'stripe';

function getCredentials() {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    throw new Error('Stripe API keys not configured. Please set STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY.');
  }

  return {
    publishableKey,
    secretKey,
  };
}

export function getStripeClient() {
  const { secretKey } = getCredentials();
  return new Stripe(secretKey);
}

export async function getUncachableStripeClient() {
  return getStripeClient();
}

export function getStripePublishableKey() {
  const { publishableKey } = getCredentials();
  return publishableKey;
}

export function getStripeSecretKey() {
  const { secretKey } = getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
