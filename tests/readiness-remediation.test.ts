import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPremiumSubscription } from '../server/services/subscriptionEntitlement';
import { groundEvidence } from '../server/services/grounding';
import { requestPageSpeed,clearPageSpeedCacheForTests } from '../server/services/pageSpeedRequest';
import { normalizeBudget } from '../shared/budgetMath';
const subscription = (id:string,status:string,tier='premium',created=1) => ({id,status,created,items:{data:[{price:{recurring:{interval:'month'},product:{metadata:{tier},name:'Plan',active:false}}}]}});
test('only a qualifying active or trialing product grants Pro, including archived price plans', () => {
  assert.equal(selectPremiumSubscription([subscription('canceled','canceled')]),null);
  assert.equal(selectPremiumSubscription([subscription('wrong','active','other')]),null);
  assert.equal(selectPremiumSubscription([subscription('trial','trialing')])?.id,'trial');
  assert.equal(selectPremiumSubscription([subscription('older','active'),subscription('new','canceled','premium',3),subscription('unrelated','active','other',5)])?.id,'older');
});
test('uncited claims become assumptions, exact retrieved quotes have evidence',()=>{
  const content='Our software helps marketing teams plan their first campaign.';
  const items=groundEvidence([{claim:'A proven ROI increase',source:'fake',sourceType:'benchmark',confidence:95,url:'javascript:alert(1)'},{claim:'Marketing planning',source:'site',sourceType:'website',confidence:90,quote:content}],content,'https://example.com');
  assert.equal(items[0].verified,false);assert.equal(items[0].url,undefined);assert.equal(items[0].sourceType,'assumption');
  assert.equal(items[1].verified,true);assert.equal(items[1].quote,content);
});
test('PageSpeed shares requests and caches quota failure without inventing measurements',async()=>{
  clearPageSpeedCacheForTests();let calls=0;
  const fetcher = async()=>{calls++;return new Response('{}',{status:429});};
  const results=await Promise.all([requestPageSpeed('https://example.com',fetcher as typeof fetch),requestPageSpeed('https://example.com',fetcher as typeof fetch)]);
  assert.deepEqual(results,[null,null]);assert.equal(calls,1);
  assert.equal(await requestPageSpeed('https://different.example',fetcher as typeof fetch),null);assert.equal(calls,1);
  clearPageSpeedCacheForTests();
});
test('extreme budget weights fail safely rather than overflow or loop',()=>{
  assert.throws(()=>normalizeBudget(1000,[{amount:1e308,percentage:0},{amount:1e308,percentage:0}]));
  assert.throws(()=>normalizeBudget(Number.MAX_VALUE,[{amount:1,percentage:100}]));
});

 test('Slack deliveries accept only official HTTPS webhook destinations',async()=>{
const {isSlackWebhook}=await import('../server/services/notificationSafety');
assert.equal(isSlackWebhook('https://hooks.slack.com/services/T/B/token'),true);
for(const url of ['http://127.0.0.1/services/T/B/token','https://hooks.slack.com.evil.example/services/T/B/token','https://hooks.slack.com/services/T/B/token?redirect=evil','https://user:pass@hooks.slack.com/services/T/B/token']) assert.equal(isSlackWebhook(url),false);
});
test('transactional report email escapes untrusted company and recommendation text',async()=>{
  const {ServerClient}=await import('postmark');
  const {mock}=await import('node:test');
  const previous=process.env.POSTMARK_SERVER_TOKEN;process.env.POSTMARK_SERVER_TOKEN='isolated-fixture-token';
  let html='';
  const stub=mock.method(ServerClient.prototype,'sendEmail',async (message:any)=>{html=message.HtmlBody;return {} as any;});
  try {
    const {sendWelcomeEmail}=await import('../server/services/email');
    await sendWelcomeEmail({toEmail:'fixture@example.com',userName:'<script>name</script>',companyName:'<img src=x onerror=alert(1)>',summary:'<script>summary</script>',gtmMotion:'<b>PLG</b>',dashboardUrl:'https://gtmchampion.com/dashboard',recommendations:[{category:'<script>channel</script>',title:'<img src=x onerror=alert(1)>',impact:'High'}]});
    assert.ok(html.includes('&lt;script&gt;'));assert.equal(html.includes('<script>'),false);assert.equal(html.includes('<img src=x'),false);
  } finally {stub.mock.restore();if(previous)process.env.POSTMARK_SERVER_TOKEN=previous;else delete process.env.POSTMARK_SERVER_TOKEN;}
});
