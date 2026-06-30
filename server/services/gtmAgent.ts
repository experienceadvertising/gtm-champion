import { storage } from "../storage";
import type { Company, User, Recommendation, ChannelInsight } from "@shared/schema";
import {
  sendAgentMilestoneEmail,
  sendAgentStallEmail,
  sendAgentCongratsEmail,
  sendAgentWeeklyDigestEmail,
} from "./email";

const DAYS_3_MS = 3 * 24 * 60 * 60 * 1000;
const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;

let OpenAI: any;

async function getOpenAI() {
  if (!OpenAI) {
    const m = await import("openai");
    OpenAI = m.default || m.OpenAI;
  }
  return new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "missing-key",
  });
}

async function sendSlackNudge(webhookUrl: string, blocks: object[], fallbackText: string): Promise<void> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: fallbackText, blocks }),
    });
    if (!res.ok) {
      console.error(`[GTM Agent] Slack webhook returned ${res.status}`);
    }
  } catch (err) {
    console.error("[GTM Agent] Slack send error:", err);
  }
}

async function sendPushToUser(userId: string, title: string, body: string, url: string): Promise<void> {
  try {
    let webpush: any;
    try { const mod = await import("web-push"); webpush = mod.default ?? mod; } catch { return; }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublicKey || !vapidPrivateKey) return;

    webpush.setVapidDetails("mailto:hello@gtmchampion.com", vapidPublicKey, vapidPrivateKey);

    const subs = await storage.getPushSubscriptionsByUserId(userId);
    const payload = JSON.stringify({ title, body, url });

    await Promise.allSettled(
      subs.filter(s => s.enabled).map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await storage.deletePushSubscription(sub.id);
          }
        }
      })
    );
  } catch (err) {
    console.error("[GTM Agent] Push send error:", err);
  }
}

interface AgentContext {
  user: User;
  company: Company;
  channelId: string;
  recs: Recommendation[];
  insight?: ChannelInsight;
}

async function buildContext(userId: string, channelId: string): Promise<AgentContext | null> {
  const user = await storage.getUser(userId);
  if (!user?.isPremium || !user.agentEnabled) return null;

  const company = await storage.getCompanyByUserId(userId);
  if (!company?.name) return null;

  const recs = await storage.getRecommendationsByCompanyId(company.id);
  const insight = await storage.getChannelInsightByChannelId(company.id, channelId);

  return { user, company, channelId, recs, insight: insight || undefined };
}

async function generateMilestoneMessage(ctx: AgentContext): Promise<{ goal: string; why: string }> {
  try {
    const openai = await getOpenAI();
    const profile = ctx.company.siteProfile as any;
    const rec = ctx.recs.filter(r => r.category === ctx.channelId)[0];
    const prompt = `You are a B2B SaaS GTM coach. A user just started working on their ${ctx.channelId} channel strategy.

Company: ${ctx.company.name}
Product/Summary: ${ctx.company.summary?.slice(0, 400) || ""}
${profile?.productNames?.length ? `Products: ${profile.productNames.slice(0, 3).join(", ")}` : ""}
${profile?.icpDetails ? `Target customer: ${JSON.stringify(profile.icpDetails).slice(0, 200)}` : ""}
First recommendation they're working on: "${rec?.title || ""}"

Write two short coaching messages (JSON only, no markdown):
{
  "goal": "One specific, concrete goal they should hit this week for ${ctx.channelId} (1-2 sentences, mention their company/product by name)",
  "why": "One sentence on why ${ctx.channelId} is especially important for a company like theirs right now"
}`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content = resp.choices?.[0]?.message?.content || "{}";
    return JSON.parse(content);
  } catch (err) {
    console.error("[GTM Agent] AI milestone message error:", err);
    return {
      goal: `Complete at least one ${ctx.channelId} recommendation this week.`,
      why: `${ctx.channelId} is a high-leverage channel for growing a company like ${ctx.company.name}.`,
    };
  }
}

async function generateStallMessage(ctx: AgentContext): Promise<{ nudge: string; action: string }> {
  try {
    const openai = await getOpenAI();
    const profile = ctx.company.siteProfile as any;
    const inProgress = ctx.recs.filter(r => r.category === ctx.channelId && r.status === "In Progress");
    const quickWin = (ctx.insight?.quickWins as any[])?.[0];

    const prompt = `You are a B2B SaaS GTM coach doing a 3-day check-in. A user started but hasn't completed anything on their ${ctx.channelId} strategy.

Company: ${ctx.company.name}
Summary: ${ctx.company.summary?.slice(0, 300) || ""}
${profile?.productNames?.length ? `Products: ${profile.productNames.slice(0, 2).join(", ")}` : ""}
In-progress recommendations: ${inProgress.map(r => `"${r.title}"`).join(", ") || "none listed"}
${quickWin ? `Suggested quick win: ${quickWin.title}` : ""}

Write a coaching check-in (JSON only, no markdown):
{
  "nudge": "One warm, specific sentence acknowledging what they're working on and encouraging them to keep going (mention their company or product)",
  "action": "One very concrete action they can take today — something small and specific that moves the needle on their ${ctx.channelId} strategy"
}`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content = resp.choices?.[0]?.message?.content || "{}";
    return JSON.parse(content);
  } catch (err) {
    console.error("[GTM Agent] AI stall message error:", err);
    return {
      nudge: `Your ${ctx.channelId} strategy is in progress — let's keep the momentum going!`,
      action: `Spend 20 minutes today on one specific task from your ${ctx.channelId} recommendations list.`,
    };
  }
}

async function generateWeeklyFocus(ctx: AgentContext & { stalled: string[]; onTrack: string[]; notStarted: string[] }): Promise<{ recommendation: string; reason: string }> {
  try {
    const openai = await getOpenAI();
    const profile = ctx.company.siteProfile as any;
    const topHighImpact = ctx.recs
      .filter(r => r.impact === "High" && r.status === "New")
      .slice(0, 3)
      .map(r => `${r.category}: "${r.title}"`);

    const prompt = `You are a B2B SaaS GTM coach writing a weekly focus recommendation for a company.

Company: ${ctx.company.name}
GTM motion: ${ctx.company.gtmMotion || "unknown"}
${profile?.productNames?.length ? `Products: ${profile.productNames.slice(0, 2).join(", ")}` : ""}
Stalled channels (in progress, nothing completed): ${ctx.stalled.join(", ") || "none"}
On-track channels (have completions): ${ctx.onTrack.join(", ") || "none"}
Not started channels: ${ctx.notStarted.slice(0, 4).join(", ") || "none"}
Top unstarted high-impact actions: ${topHighImpact.join(" | ") || "none"}

Write a focused weekly recommendation (JSON only, no markdown):
{
  "recommendation": "One clear, specific recommendation for what they should focus on this week (1-2 sentences, mention the channel and why it matters for their business)",
  "reason": "One sentence explaining why this week's focus will move the needle most for ${ctx.company.name}"
}`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content = resp.choices?.[0]?.message?.content || "{}";
    return JSON.parse(content);
  } catch (err) {
    console.error("[GTM Agent] AI weekly focus error:", err);
    return {
      recommendation: ctx.stalled[0]
        ? `Unblock your ${ctx.stalled[0]} strategy by completing one small action this week.`
        : `Start on your highest-priority channel this week.`,
      reason: `Consistent progress across channels compounds into real GTM momentum.`,
    };
  }
}

async function generateWhatsNextRecommendation(ctx: AgentContext): Promise<void> {
  try {
    const openai = await getOpenAI();
    const profile = ctx.company.siteProfile as any;
    const completedRec = ctx.recs.filter(r => r.category === ctx.channelId && r.status === "Completed")[0];
    const otherChannels = Array.from(new Set(ctx.recs.map(r => r.category))).filter(c => c !== ctx.channelId);
    const unstarted = otherChannels.filter(ch =>
      ctx.recs.filter(r => r.category === ch).every(r => r.status === "New")
    );
    const highImpactNew = ctx.recs.filter(r => r.status === "New" && r.impact === "High").slice(0, 3);

    const prompt = `A B2B SaaS company just completed their ${ctx.channelId} channel strategy. Suggest their best next action.

Company: ${ctx.company.name}
Summary: ${ctx.company.summary?.slice(0, 300) || ""}
${profile?.productNames?.length ? `Products: ${profile.productNames.slice(0, 2).join(", ")}` : ""}
Channels not started yet: ${unstarted.slice(0, 5).join(", ") || "all started"}
High-impact actions still new: ${highImpactNew.map(r => `${r.category}: "${r.title}"`).join(" | ") || "none"}

Write one "what's next" recommendation (JSON only, no markdown):
{
  "title": "Specific next action title (under 80 chars)",
  "description": "2-3 sentences: what to do next, why it's the right move for ${ctx.company.name} after completing ${ctx.channelId}",
  "category": "The channel or category this falls under",
  "impact": "High"
}`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = resp.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    if (parsed.title && parsed.description && ctx.company) {
      await storage.createRecommendation({
        companyId: ctx.company.id,
        category: parsed.category || unstarted[0] || "General",
        title: parsed.title.slice(0, 200),
        description: parsed.description,
        impact: "High",
        effort: "Low",
        status: "New",
        gtmFunnel: "both",
      });
      console.log(`[GTM Agent] Created "what's next" recommendation for user ${ctx.user.email} after completing ${ctx.channelId}`);
    }
  } catch (err) {
    console.error("[GTM Agent] generateWhatsNextRecommendation error:", err);
  }
}

export async function fireMilestoneStart(userId: string, channelId: string, recommendationId: number): Promise<void> {
  try {
    const ctx = await buildContext(userId, channelId);
    if (!ctx) return;

    const alreadySent = await storage.hasAgentEvent(userId, "milestone_start", channelId, DAYS_7_MS);
    if (alreadySent) return;

    const [aiMsg] = await Promise.all([
      generateMilestoneMessage(ctx),
    ]);

    await sendAgentMilestoneEmail({
      toEmail: ctx.user.email,
      userName: ctx.user.fullName,
      companyName: ctx.company.name!,
      channelId,
      personalizedGoal: aiMsg.goal,
      personalizedWhy: aiMsg.why,
      unsubscribeToken: ctx.user.unsubscribeToken ?? undefined,
    });

    if (ctx.user.slackWebhookUrl) {
      await sendSlackNudge(
        ctx.user.slackWebhookUrl,
        [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:rocket: *GTM Agent: Great start on ${channelId}!*\n\n*Why it matters:* ${aiMsg.why}\n\n*Your first milestone:* ${aiMsg.goal}`,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: `View ${channelId} Strategy` },
                url: `https://gtmchampion.com/dashboard?channel=${encodeURIComponent(channelId)}`,
                style: "primary",
              },
            ],
          },
        ],
        `GTM Agent: Great start on ${channelId}! ${aiMsg.goal}`
      );
    }

    await sendPushToUser(
      userId,
      `GTM Agent: Great start on ${channelId}!`,
      aiMsg.goal,
      `/dashboard?channel=${encodeURIComponent(channelId)}`
    );

    await storage.createAgentEvent({
      userId,
      eventType: "milestone_start",
      channelId,
      recommendationId,
      channel: "email",
    });

    const hasPending = await storage.hasPendingNudge(userId, channelId, "stall");
    if (!hasPending) {
      await storage.createScheduledNudge({
        userId,
        channelId,
        recommendationId,
        nudgeType: "stall",
        dueAt: new Date(Date.now() + DAYS_3_MS),
      });
    }

    console.log(`[GTM Agent] Milestone start fired for user ${ctx.user.email} channel ${channelId}`);
  } catch (err) {
    console.error("[GTM Agent] fireMilestoneStart error:", err);
  }
}

export async function fireStallNudge(userId: string, channelId: string, nudgeId: number): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user?.isPremium || !user.agentEnabled || user.emailUnsubscribed) {
      await storage.markScheduledNudgeSent(nudgeId);
      return;
    }

    const company = await storage.getCompanyByUserId(userId);
    if (!company?.name) {
      await storage.markScheduledNudgeSent(nudgeId);
      return;
    }

    const recs = await storage.getRecommendationsByCompanyId(company.id);
    const channelRecs = recs.filter(r => r.category === channelId);
    const inProgress = channelRecs.filter(r => r.status === "In Progress");

    if (inProgress.length === 0) {
      await storage.markScheduledNudgeSent(nudgeId);
      return;
    }

    const insight = await storage.getChannelInsightByChannelId(company.id, channelId);
    const ctx: AgentContext = { user, company, channelId, recs, insight: insight || undefined };
    const aiMsg = await generateStallMessage(ctx);

    const quickWin = (insight?.quickWins as any[])?.[0] ?? null;

    await sendAgentStallEmail({
      toEmail: user.email,
      userName: user.fullName,
      companyName: company.name,
      channelId,
      quickWin,
      personalizedNudge: aiMsg.nudge,
      personalizedAction: aiMsg.action,
      unsubscribeToken: user.unsubscribeToken ?? undefined,
    });

    if (user.slackWebhookUrl) {
      const slackBlocks: object[] = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:alarm_clock: *GTM Agent: ${channelId} check-in*\n\n${aiMsg.nudge}\n\n*Action for today:* ${aiMsg.action}`,
          },
        },
      ];
      if (quickWin) {
        slackBlocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:white_check_mark: *Quick win to try:* ${quickWin.title}`,
          },
        });
      }
      slackBlocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: `Resume ${channelId}` },
            url: `https://gtmchampion.com/dashboard?channel=${encodeURIComponent(channelId)}`,
            style: "primary",
          },
        ],
      });
      await sendSlackNudge(user.slackWebhookUrl, slackBlocks, `GTM Agent: ${channelId} check-in — ${aiMsg.action}`);
    }

    await sendPushToUser(
      userId,
      `GTM Agent: ${channelId} check-in`,
      quickWin?.title || aiMsg.action,
      `/dashboard?channel=${encodeURIComponent(channelId)}`
    );

    await storage.createAgentEvent({
      userId,
      eventType: "stall_nudge",
      channelId,
      channel: "email",
    });

    await storage.markScheduledNudgeSent(nudgeId);
    console.log(`[GTM Agent] Stall nudge sent for user ${user.email} channel ${channelId}`);
  } catch (err) {
    console.error("[GTM Agent] fireStallNudge error:", err);
  }
}

export async function fireCompletionCongrats(userId: string, channelId: string): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user?.isPremium || !user.agentEnabled) return;

    const alreadyScheduled = await storage.hasPendingNudge(userId, channelId, "completion_congrats");
    if (alreadyScheduled) return;

    const alreadySent = await storage.hasAgentEvent(userId, "completion_congrats", channelId, DAYS_7_MS);
    if (alreadySent) return;

    await storage.createScheduledNudge({
      userId,
      channelId,
      nudgeType: "completion_congrats",
      dueAt: new Date(Date.now() + DAYS_7_MS),
    });

    console.log(`[GTM Agent] Scheduled 7-day completion congrats for user ${user.email} channel ${channelId}`);
  } catch (err) {
    console.error("[GTM Agent] fireCompletionCongrats error:", err);
  }
}

async function sendCompletionCongrats(userId: string, channelId: string, nudgeId: number): Promise<void> {
  try {
    const ctx = await buildContext(userId, channelId);
    if (!ctx) {
      await storage.markScheduledNudgeSent(nudgeId);
      return;
    }

    const channelRecs = ctx.recs.filter(r => r.category === channelId);
    const stillComplete = channelRecs.length > 0 && channelRecs.every(r => r.status === "Completed");
    if (!stillComplete) {
      console.log(`[GTM Agent] Skipping completion congrats for ${userId}/${channelId} — channel no longer fully completed`);
      await storage.markScheduledNudgeSent(nudgeId);
      return;
    }

    await Promise.all([
      sendAgentCongratsEmail({
        toEmail: ctx.user.email,
        userName: ctx.user.fullName,
        companyName: ctx.company.name!,
        channelId,
        unsubscribeToken: ctx.user.unsubscribeToken ?? undefined,
      }),
      generateWhatsNextRecommendation(ctx),
    ]);

    if (ctx.user.slackWebhookUrl) {
      await sendSlackNudge(
        ctx.user.slackWebhookUrl,
        [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:tada: *${ctx.company.name} just completed their ${channelId} strategy!*\n\nEvery recommendation is done. We've added a "what's next" suggestion to your dashboard to keep the momentum going.`,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "See What's Next" },
                url: "https://gtmchampion.com/dashboard",
                style: "primary",
              },
            ],
          },
        ],
        `GTM Agent: ${channelId} strategy complete! Check your dashboard for what to do next.`
      );
    }

    await sendPushToUser(
      userId,
      `GTM Agent: ${channelId} complete!`,
      `You've completed your full ${channelId} strategy. We've added a "what's next" recommendation to your dashboard.`,
      `/dashboard`
    );

    await storage.createAgentEvent({
      userId,
      eventType: "completion_congrats",
      channelId,
      channel: "email",
    });

    await storage.markScheduledNudgeSent(nudgeId);
    console.log(`[GTM Agent] Completion congrats sent for user ${ctx.user.email} channel ${channelId}`);
  } catch (err) {
    console.error("[GTM Agent] sendCompletionCongrats error:", err);
  }
}

export async function sendWeeklyCoachingDigest(userId: string): Promise<void> {
  try {
    const company = await storage.getCompanyByUserId(userId);
    const user = await storage.getUser(userId);
    if (!user?.isPremium || !user.agentEnabled || !company?.name || user.emailUnsubscribed) return;

    const recs = await storage.getRecommendationsByCompanyId(company.id);

    const byChannel: Record<string, { new: number; inProgress: number; completed: number }> = {};
    for (const rec of recs) {
      if (!byChannel[rec.category]) byChannel[rec.category] = { new: 0, inProgress: 0, completed: 0 };
      if (rec.status === "New") byChannel[rec.category].new++;
      else if (rec.status === "In Progress") byChannel[rec.category].inProgress++;
      else if (rec.status === "Completed") byChannel[rec.category].completed++;
    }

    const stalled = Object.entries(byChannel)
      .filter(([, v]) => v.inProgress > 0 && v.completed === 0)
      .map(([ch]) => ch);

    const onTrack = Object.entries(byChannel)
      .filter(([, v]) => v.completed > 0)
      .map(([ch]) => ch);

    const notStarted = Object.entries(byChannel)
      .filter(([, v]) => v.inProgress === 0 && v.completed === 0 && v.new > 0)
      .map(([ch]) => ch);

    const topFocus = stalled[0] || notStarted[0] || onTrack[0] || "";

    const ctx = { user, company, channelId: topFocus, recs, stalled, onTrack, notStarted };
    const aiMsg = await generateWeeklyFocus(ctx as any);

    await sendAgentWeeklyDigestEmail({
      toEmail: user.email,
      userName: user.fullName,
      companyName: company.name,
      stalled,
      onTrack,
      notStarted,
      topFocus,
      aiRecommendation: aiMsg.recommendation,
      aiReason: aiMsg.reason,
      unsubscribeToken: user.unsubscribeToken ?? undefined,
    });

    if (user.slackWebhookUrl) {
      const statusLines: string[] = [];
      if (stalled.length) statusLines.push(`:warning: *Stalled:* ${stalled.join(", ")}`);
      if (onTrack.length) statusLines.push(`:white_check_mark: *On track:* ${onTrack.join(", ")}`);
      if (notStarted.length) statusLines.push(`:hourglass_flowing_sand: *Not started:* ${notStarted.slice(0, 4).join(", ")}${notStarted.length > 4 ? ` +${notStarted.length - 4} more` : ""}`);

      await sendSlackNudge(
        user.slackWebhookUrl,
        [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:bar_chart: *GTM Agent Weekly Report — ${company.name}*\n\n${aiMsg.recommendation}\n_${aiMsg.reason}_`,
            },
          },
          ...(statusLines.length ? [{
            type: "section",
            text: { type: "mrkdwn", text: statusLines.join("\n") },
          }] : []),
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Open Dashboard" },
                url: "https://gtmchampion.com/dashboard",
                style: "primary",
              },
            ],
          },
        ],
        `GTM Agent Weekly Report for ${company.name}: ${aiMsg.recommendation}`
      );
    }

    await storage.createAgentEvent({
      userId,
      eventType: "weekly_digest",
      channelId: topFocus || undefined,
      channel: "email",
    });

    console.log(`[GTM Agent] Weekly digest sent to ${user.email}`);
  } catch (err) {
    console.error("[GTM Agent] sendWeeklyCoachingDigest error:", err);
  }
}

export async function processStallNudges(): Promise<void> {
  try {
    const pending = await storage.getPendingScheduledNudges();
    console.log(`[GTM Agent] Processing ${pending.length} pending nudges`);
    await Promise.allSettled(
      pending.map(nudge => {
        if (nudge.nudgeType === "completion_congrats") {
          return sendCompletionCongrats(nudge.userId, nudge.channelId, nudge.id);
        }
        return fireStallNudge(nudge.userId, nudge.channelId, nudge.id);
      })
    );
  } catch (err) {
    console.error("[GTM Agent] processStallNudges error:", err);
  }
}

export async function sendWeeklyDigestsToAllProUsers(): Promise<void> {
  try {
    const pairs = await storage.getUsersWithCompanies();
    const proUsers = pairs.filter(p => p.user.isPremium && p.user.agentEnabled);
    console.log(`[GTM Agent] Sending weekly digests to ${proUsers.length} Pro users`);
    await Promise.allSettled(proUsers.map(p => sendWeeklyCoachingDigest(p.user.id)));
  } catch (err) {
    console.error("[GTM Agent] sendWeeklyDigestsToAllProUsers error:", err);
  }
}
