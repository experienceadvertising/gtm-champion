import assert from "node:assert/strict";
import test from "node:test";
import {
  CHANNEL_IDS,
  buildCrossChannelStrategyPlan,
  buildFallbackChannelInsight,
  markTopChannels,
} from "../server/services/channelStrategy";

const company = "Acme Analytics";
const summary = "Acme Analytics helps revenue teams find and fix conversion friction.";
const motion = "B2B SaaS sales-led growth";

function buildAllFallbacks() {
  return CHANNEL_IDS.map(channel =>
    buildFallbackChannelInsight(channel, company, summary, motion),
  );
}

test("every supported channel has a complete, channel-specific recovery playbook", () => {
  const insights = buildAllFallbacks();

  assert.equal(insights.length, 13);
  assert.equal(new Set(insights.map(insight => insight.channelId)).size, 13);
  assert.equal(
    new Set(insights.map(insight => JSON.stringify({
      hero: insight.heroStat,
      kpis: insight.topKpis,
      pillars: insight.strategicPillars.map(pillar => pillar.title),
    }))).size,
    13,
    "channel playbooks must not collapse into duplicated generic advice",
  );

  for (const insight of insights) {
    assert.equal(insight.generationStatus, "fallback");
    assert.match(insight.whyItMatters, /planning playbook/i);
    assert.ok(insight.strategyMeta.qualityScore >= 70, `${insight.channelId} quality is too low`);
    assert.ok(insight.topKpis.length >= 3);
    assert.ok(insight.strategicPillars.length >= 2);
    assert.ok(insight.quickWins.length >= 2);
    assert.ok(insight.strategyMeta.prerequisites.length >= 2);
    assert.ok(insight.strategyMeta.risks.length >= 2);
    assert.ok(insight.strategyMeta.evidence.length >= 2);
    assert.ok(insight.strategyMeta.roadmap.first30Days.length);
    assert.ok(insight.strategyMeta.roadmap.days31To60.length);
    assert.ok(insight.strategyMeta.roadmap.days61To90.length);
  }
});

test("high-risk channels include their essential operating guardrails", () => {
  const byChannel = new Map(buildAllFallbacks().map(insight => [insight.channelId, JSON.stringify(insight).toLowerCase()]));

  assert.match(byChannel.get("Paid Search")!, /negative keyword/);
  assert.match(byChannel.get("Paid Search")!, /unit economics|cac/);
  assert.match(byChannel.get("ABM")!, /buying[- ]group/);
  assert.match(byChannel.get("ABM")!, /account tier/);
  assert.match(byChannel.get("Outbound")!, /deliverability/);
  assert.match(byChannel.get("Retargeting")!, /frequency cap/);
  assert.match(byChannel.get("LLMs")!, /citation|answer engine/);
});

test("the cross-channel plan marks and summarizes exactly three priorities", () => {
  const marked = markTopChannels(buildAllFallbacks());
  const top = marked.filter(insight => insight.strategyMeta.isTopChannel);
  const plan = buildCrossChannelStrategyPlan(marked, company);

  assert.equal(top.length, 3);
  assert.deepEqual(
    plan.topChannelIds,
    [...top]
      .sort((a, b) => b.strategyMeta.priorityScore - a.strategyMeta.priorityScore)
      .map(insight => insight.channelId),
  );
  assert.match(plan.executiveSummary, /next 90 days/i);
  assert.ok(plan.prerequisites.length);
  assert.ok(plan.roadmap.first30Days.length);
  assert.ok(plan.roadmap.days31To60.length);
  assert.ok(plan.roadmap.days61To90.length);
});
