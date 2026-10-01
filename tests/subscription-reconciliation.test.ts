import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_URL = 'postgresql://fixture:fixture@localhost:55473/isolated';
process.env.STRIPE_SECRET_KEY='sk_test_isolated_fixture';
process.env.STRIPE_PUBLISHABLE_KEY='pk_test_isolated_fixture';
test('subscription read revokes stale access, preserves manual grants and writes nothing on provider failure',async()=>{
  const {stripeService}=await import('../server/services/stripeService');
  const {storage}=await import('../server/storage');
  const writes:any[]=[];
  const write=mock.method(storage,'updateUserPremiumStatus',async(...args:any[])=>{writes.push(args);});
  const link=mock.method(storage,'updateUserStripeInfo',async()=>{});
  const read=mock.method(stripeService,'getSubscriptionByCustomerId',async()=>null);
  try {
    assert.equal((await stripeService.reconcileUser({id:'qa',stripeCustomerId:'cus_fixture',isPremium:true})).isPremium,false);
    assert.deepEqual(writes,[['qa',false]]);
    assert.equal((await stripeService.reconcileUser({id:'manual',stripeCustomerId:null,isPremium:true})).isPremium,true);
    read.mock.mockImplementation(async()=>{throw new Error('Fixture provider outage');});
    await assert.rejects(()=>stripeService.reconcileUser({id:'qa',stripeCustomerId:'cus_fixture',isPremium:true}));
    assert.equal(writes.length,1);
  }finally{write.mock.restore();link.mock.restore();read.mock.restore();}
});
test('deleting one subscription reconciles remaining valid subscriptions instead of blindly downgrading',async()=>{
  const {WebhookHandlers}=await import('../server/services/webhookHandlers');
  const {stripeService}=await import('../server/services/stripeService');
  const activated:any[]=[];const deactivated:any[]=[];
  const read=mock.method(stripeService,'getSubscriptionByCustomerId',async()=>({id:'sub_remaining',status:'active'}) as any);
  const activate=mock.method(WebhookHandlers,'activatePremiumByCustomerId',async(...args:any[])=>{activated.push(args);});
  const deactivate=mock.method(WebhookHandlers,'deactivatePremiumByCustomerId',async(...args:any[])=>{deactivated.push(args);});
  try {
    await WebhookHandlers.handleStripeEvent({type:'customer.subscription.deleted',data:{object:{customer:'cus_fixture',id:'sub_old'}}});
    assert.deepEqual(activated,[['cus_fixture','sub_remaining']]);assert.equal(deactivated.length,0);
    read.mock.mockImplementation(async()=>null);
    await WebhookHandlers.handleStripeEvent({type:'customer.subscription.updated',data:{object:{customer:'cus_fixture',id:'sub_old',status:'canceled'}}});
    assert.deepEqual(deactivated,[['cus_fixture']]);
  }finally{read.mock.restore();activate.mock.restore();deactivate.mock.restore();}
});

test('production recovery and checkout URLs stay canonical despite another app environment',async()=>{
const {getPublicAppUrl}=await import('../server/appUrl');
const previous={mode:process.env.NODE_ENV,url:process.env.PUBLIC_APP_URL,domains:process.env.REPLIT_DOMAINS};
process.env.NODE_ENV='production';process.env.PUBLIC_APP_URL='https://mydetailerpro.com';process.env.REPLIT_DOMAINS='other-app.replit.app';
try{assert.equal(getPublicAppUrl(),'https://gtmchampion.com');}
finally{for(const [key,value] of Object.entries({NODE_ENV:previous.mode,PUBLIC_APP_URL:previous.url,REPLIT_DOMAINS:previous.domains})){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
