import { getUncachableStripeClient } from '../server/services/stripeClient';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    
    console.log('Checking for existing products...');
    const existingProducts = await stripe.products.search({ 
      query: "name:'GTM Champion Pro'" 
    });
    
    if (existingProducts.data.length > 0) {
      console.log('GTM Champion Pro product already exists');
      const product = existingProducts.data[0];
      const prices = await stripe.prices.list({ product: product.id, active: true });
      console.log('Product ID:', product.id);
      console.log('Prices:', prices.data.map(p => ({ id: p.id, amount: p.unit_amount, interval: p.recurring?.interval })));
      return;
    }

    console.log('Creating GTM Champion Pro product...');
    const product = await stripe.products.create({
      name: 'GTM Champion Pro',
      description: 'Premium GTM intelligence platform with unlimited AI recommendations, advanced channel insights, weekly strategy emails, and priority support.',
      metadata: {
        tier: 'premium',
        features: 'unlimited_recommendations,advanced_insights,weekly_emails,ai_chat,integrations'
      }
    });
    console.log('Created product:', product.id);

    console.log('Creating monthly price...');
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 2900,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: {
        billing_period: 'monthly'
      }
    });
    console.log('Created monthly price:', monthlyPrice.id, '($29/month)');

    console.log('Creating annual price...');
    const annualPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 29000,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: {
        billing_period: 'annual',
        savings: '17%'
      }
    });
    console.log('Created annual price:', annualPrice.id, '($290/year - save 17%)');

    console.log('\n=== Product Setup Complete ===');
    console.log('Product ID:', product.id);
    console.log('Monthly Price ID:', monthlyPrice.id);
    console.log('Annual Price ID:', annualPrice.id);
    console.log('\nThese will be synced to the database automatically via webhooks.');
  } catch (error) {
    console.error('Failed to create products:', error);
    process.exit(1);
  }
}

createProducts();
