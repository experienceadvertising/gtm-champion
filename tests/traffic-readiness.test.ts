import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { Completions } from "openai/resources/chat/completions/completions";
import { PassThrough } from "node:stream";
import { getAnalysisState } from "../shared/analysisState";
import { insertUserSchema } from "../shared/schema";
import { generateLinkedInPost, extractCompanyProfile } from "../server/services/openai";
import { generateStrategyPDF } from "../server/services/pdfExport";

const now = Date.now();
const company = { name: null, summary: "Analyzing your website...", lastScraped: new Date(now) };

test("core failures expose retry and stale audits stop showing progress", () => {
  assert.equal(getAnalysisState(company, 0, now).analyzing, true);
  const failed = getAnalysisState({ ...company, summary: "AI analysis failed. Please try again." }, 0, now);
  assert.equal(failed.failed, true);
  assert.equal(failed.analyzing, false);
  assert.equal(getAnalysisState(company, 0, now + 11 * 60_000).failed, true);
});

test("persisted channel coverage keeps a second Autoscale worker polling", () => {
  const ready = { ...company, name: "GTM Champion", summary: "Verified company summary" };
  assert.equal(getAnalysisState(ready, 6, now).channelsPending, true);
  assert.equal(getAnalysisState(ready, 13, now).channelsPending, false);
  assert.equal(getAnalysisState(ready, 6, now + 11 * 60_000).channelsPending, false);
});

test("signup strips server-managed flags, tokens and webhook destinations", () => {
  const user = insertUserSchema.parse({ fullName: "QA User", email: "qa@example.com", password: "fixture-password", companyUrl: "https://example.com", slackWebhookUrl: "http://127.0.0.1/", isPremium: true, isAdmin: true, emailUnsubscribed: true, unsubscribeToken: "injected", agentEnabled: true });
  assert.deepEqual(Object.keys(user).sort(), ["companyUrl", "email", "fullName", "password"]);
});

test("actual content and profile calls use supported GPT-5 parameters", async () => {
  const requests: any[] = [];
  const stub = mock.method(Completions.prototype, "create", async (request: any) => {
    requests.push(request);
    assert.equal("max_tokens" in request, false);
    assert.equal(request.reasoning_effort, "minimal");
    assert.ok(request.max_completion_tokens > 0);
    return { choices: [{ message: { content: JSON.stringify(request.max_completion_tokens === 2500 ? { productNames: ["GTM Champion"], icpDetails: { persona: "SaaS founders" } } : { posts: [{ hook: "Choose one channel", content: "Review evidence before scaling.", cta: "What have you tested?" }] }) } }] } as any;
  });
  try {
    const posts = await generateLinkedInPost({ topic: "Channel priorities", tone: "educational", authorRole: "Founder" }, { companyName: "GTM Champion", summary: "GTM planning", gtmMotion: "PLG" });
    assert.equal(posts.posts.length, 1);
    const profile = await extractCompanyProfile("GTM Champion helps SaaS founders plan marketing.", "https://example.com");
    assert.equal(profile.icpDetails.persona, "SaaS founders");
    assert.equal(requests.length, 2);
  } finally { stub.mock.restore(); }
});

test("strategy PDF streams a nonempty valid PDF", async () => {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on("data", chunk => chunks.push(chunk));
  const finished = new Promise<void>((resolve, reject) => { stream.on("end", resolve); stream.on("error", reject); });
  generateStrategyPDF({ company: { name: "GTM Champion", url: "https://example.com", summary: "A marketing planning tool", gtmMotion: "PLG", siteProfile: null }, recommendations: [], channelInsights: [], weeklyIdeas: [] }, stream, {});
  await finished;
  const pdf = Buffer.concat(chunks);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 1000);
});


test("fractional confidence is normalized without reinterpreting low percentage scores", async () => {
  const { normalizeConfidence } = await import("../server/services/channelStrategy");
  assert.equal(normalizeConfidence(0.8), 80);
  assert.equal(normalizeConfidence(8), 8);
  assert.equal(normalizeConfidence(58), 58);
  assert.equal(normalizeConfidence(150), 100);
});

test("switching signed-in accounts clears cached private data", async () => {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value), removeItem: (key: string) => store.delete(key) } });
  try {
    const { queryClient } = await import("../client/src/lib/queryClient");
    const { saveSession } = await import("../client/src/lib/api");
    saveSession({ userId: "A", email: "a@example.com", fullName: "Account A", isPremium: false });
    queryClient.setQueryData(["dashboard"], { privateData: "Account A strategy" });
    saveSession({ userId: "B", email: "b@example.com", fullName: "Account B", isPremium: false });
    assert.equal(queryClient.getQueryData(["dashboard"]), undefined);
    queryClient.clear();
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
