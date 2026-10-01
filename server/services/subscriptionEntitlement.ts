interface Subscription {
  id: string;
  status: string;
  created?: number;
  items: { data: Array<{ price: { recurring?: unknown; product: string | { deleted?: boolean | void; name?: string; metadata?: Record<string, string> } } }> };
}
export function selectPremiumSubscription<T extends Subscription>(subscriptions: T[]): T | null {
  return subscriptions.filter(subscription => ['active', 'trialing'].includes(subscription.status)
    && subscription.items.data.some(({ price }) => {
      const product = price.product;
      return Boolean(price.recurring) && typeof product !== 'string' && !product.deleted
        && ((product.metadata?.tier === 'premium' && product.metadata?.app === 'gtm-champion') || product.name === 'GTM Champion Pro');
    })).sort((a, b) => (b.created || 0) - (a.created || 0))[0] || null;
}
