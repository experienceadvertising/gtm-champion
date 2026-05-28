import { storage } from "../storage";
import {
  sendAgentMilestoneEmail,
  sendAgentStallEmail,
  sendAgentCongratsEmail,
} from "./email";

const DAYS_3_MS = 3 * 24 * 60 * 60 * 1000;
const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;

async function sendPushToUser(userId: string, title: string, body: string, url: string): Promise<void> {
  try {
    let webpush: any;
    try { webpush = await import("web-push"); } catch { return; }

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
    console.error("Push send error:", err);
  }
}

export async function fireMilestoneStart(userId: string, channelId: string, recommendationId: number): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user?.isPremium || !user.agentEnabled) return;

    const alreadySent = await storage.hasAgentEvent(userId, "milestone_start", channelId, DAYS_7_MS);
    if (alreadySent) return;

    const company = await storage.getCompanyByUserId(userId);
    if (!company?.name) return;

    await sendAgentMilestoneEmail({
      toEmail: user.email,
      userName: user.fullName,
      companyName: company.name,
      channelId,
    });

    await sendPushToUser(
      userId,
      `Great start on ${channelId}!`,
      `You've begun working on your ${channelId} strategy. Check your next milestone.`,
      `/dashboard?channel=${encodeURIComponent(channelId)}`
    );

    await storage.createAgentEvent({
      userId,
      eventType: "milestone_start",
      channelId,
      recommendationId,
      channel: "email",
    });

    const hasPending = await storage.hasPendingNudge(userId, channelId);
    if (!hasPending) {
      await storage.createScheduledNudge({
        userId,
        channelId,
        recommendationId,
        nudgeType: "stall",
        dueAt: new Date(Date.now() + DAYS_3_MS),
      });
    }

    console.log(`[GTM Agent] Milestone start fired for user ${user.email} channel ${channelId}`);
  } catch (err) {
    console.error("[GTM Agent] fireMilestoneStart error:", err);
  }
}

export async function fireStallNudge(userId: string, channelId: string, nudgeId: number): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user?.isPremium || !user.agentEnabled) {
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

    await sendAgentStallEmail({
      toEmail: user.email,
      userName: user.fullName,
      companyName: company.name,
      channelId,
      quickWin: insight?.quickWins?.[0] as any ?? null,
    });

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

    const alreadySent = await storage.hasAgentEvent(userId, "completion_congrats", channelId, DAYS_7_MS);
    if (alreadySent) return;

    const company = await storage.getCompanyByUserId(userId);
    if (!company?.name) return;

    await sendAgentCongratsEmail({
      toEmail: user.email,
      userName: user.fullName,
      companyName: company.name,
      channelId,
    });

    await storage.createAgentEvent({
      userId,
      eventType: "completion_congrats",
      channelId,
      channel: "email",
    });

    console.log(`[GTM Agent] Congrats sent for user ${user.email} channel ${channelId}`);
  } catch (err) {
    console.error("[GTM Agent] fireCompletionCongrats error:", err);
  }
}

export async function sendWeeklyCoachingDigest(userId: string): Promise<void> {
  try {
    const { sendAgentWeeklyDigestEmail } = await import("./email");
    const user = await storage.getUser(userId);
    if (!user?.isPremium || !user.agentEnabled) return;

    const company = await storage.getCompanyByUserId(userId);
    if (!company?.name) return;

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

    await sendAgentWeeklyDigestEmail({
      toEmail: user.email,
      userName: user.fullName,
      companyName: company.name,
      stalled,
      onTrack,
      notStarted,
      topFocus,
    });

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
    console.log(`[GTM Agent] Processing ${pending.length} pending stall nudges`);
    await Promise.allSettled(
      pending.map(nudge => fireStallNudge(nudge.userId, nudge.channelId, nudge.id))
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
