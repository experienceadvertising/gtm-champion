import cron from "node-cron";
import { storage } from "../storage";
import { generateWeeklyIdeas } from "./openai";
import { sendWeeklyEmail, sendChannelStrategyEmail } from "./email";

const CHANNEL_ROTATION = [
  "SEO", "Content", "LLMs", "Email Marketing", "Organic Social",
  "Paid Search", "Paid Social", "CRO", "Retargeting",
  "Community", "ABM", "Partnerships", "Outbound"
];

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

export function startWeeklyEmailScheduler() {
  console.log("Starting weekly email scheduler...");

  cron.schedule("0 9 * * 1", async () => {
    const weekNum = getWeekNumber();
    const isChannelWeek = weekNum % 2 === 0;

    if (isChannelWeek) {
      console.log("Running channel deep-dive email job - Monday 9 AM...");
      await sendChannelEmailsToAllUsers();
    } else {
      console.log("Running weekly ideas email job - Monday 9 AM...");
      await sendWeeklyEmailsToAllUsers();
    }
  }, {
    timezone: "America/New_York"
  });

  console.log("Weekly email scheduler started - alternates between channel deep-dives and weekly ideas every Monday at 9 AM ET");
}

async function processUserBatch(users: any[]): Promise<{ sent: number; failed: number }> {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      const company = await storage.getCompanyByUserId(user.id);
      if (!company || !company.name) {
        console.log(`Skipping user ${user.email} - no company data`);
        return false;
      }

      const freshIdeas = await generateWeeklyIdeas(
        company.name,
        company.summary || "",
        company.gtmMotion || "Growth"
      );

      await storage.deleteWeeklyIdeasByCompanyId(company.id);
      await storage.createWeeklyIdeasBatch(
        freshIdeas.map((idea) => ({
          companyId: company.id,
          title: idea.title,
          description: idea.description,
          type: idea.type,
        }))
      );

      await sendWeeklyEmail({
        toEmail: user.email,
        userName: user.fullName,
        companyName: company.name,
        ideas: freshIdeas,
      });

      console.log(`Weekly email sent to ${user.email}`);
      return true;
    })
  );

  let sent = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === "fulfilled" && result.value === true) {
      sent++;
    } else if (result.status === "rejected") {
      console.error("User processing failed:", result.reason);
      failed++;
    }
  }
  return { sent, failed };
}

async function processChannelBatch(users: any[]): Promise<{ sent: number; failed: number }> {
  const weekNum = getWeekNumber();

  const results = await Promise.allSettled(
    users.map(async (user) => {
      const company = await storage.getCompanyByUserId(user.id);
      if (!company || !company.name) {
        console.log(`Skipping user ${user.email} - no company data`);
        return false;
      }

      // Each user gets a different channel offset by their company ID
      // so not everyone receives the same channel the same week
      const channelIndex = (Math.floor(weekNum / 2) + company.id) % CHANNEL_ROTATION.length;
      const channelId = CHANNEL_ROTATION[channelIndex];

      const channelInsights = await storage.getChannelInsightsByCompanyId(company.id);
      const insight = channelInsights.find(ci => ci.channelId === channelId);

      if (!insight) {
        console.log(`Skipping user ${user.email} - no insight for channel ${channelId}`);
        return false;
      }

      await sendChannelStrategyEmail({
        toEmail: user.email,
        userName: user.fullName,
        companyName: company.name,
        channelId: insight.channelId,
        priority: insight.priority,
        whyItMatters: insight.whyItMatters || "",
        companyFitSummary: insight.companyFitSummary || "",
        heroStat: insight.heroStat as { value: string; label: string },
        topKpis: insight.topKpis as string[],
        strategicPillars: insight.strategicPillars as Array<{
          title: string;
          objective: string;
          tactics: string[];
          measurement: string;
        }>,
        quickWins: insight.quickWins as Array<{
          title: string;
          steps: string[];
          effort: string;
          duration: string;
        }>,
      });

      console.log(`Channel strategy email (${channelId}) sent to ${user.email}`);
      return true;
    })
  );

  let sent = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === "fulfilled" && result.value === true) {
      sent++;
    } else if (result.status === "rejected") {
      console.error("Channel email processing failed:", result.reason);
      failed++;
    }
  }
  return { sent, failed };
}

export async function sendWeeklyEmailsToAllUsers() {
  try {
    console.log("Starting weekly ideas email batch...");

    const allUsers = await storage.getAllUsers();
    const BATCH_SIZE = 5;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
      const batch = allUsers.slice(i, i + BATCH_SIZE);
      const { sent, failed } = await processUserBatch(batch);
      totalSent += sent;
      totalFailed += failed;
    }

    console.log(`Weekly ideas emails complete: ${totalSent} sent, ${totalFailed} failed, ${allUsers.length} total users`);
    return { sent: totalSent, failed: totalFailed, total: allUsers.length };
  } catch (error) {
    console.error("Weekly email batch error:", error);
    throw error;
  }
}

export async function sendChannelEmailsToAllUsers() {
  try {
    console.log("Starting channel deep-dive email batch...");

    const allUsers = await storage.getAllUsers();
    const BATCH_SIZE = 5;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
      const batch = allUsers.slice(i, i + BATCH_SIZE);
      const { sent, failed } = await processChannelBatch(batch);
      totalSent += sent;
      totalFailed += failed;
    }

    console.log(`Channel deep-dive emails complete: ${totalSent} sent, ${totalFailed} failed, ${allUsers.length} total users`);
    return { sent: totalSent, failed: totalFailed, total: allUsers.length };
  } catch (error) {
    console.error("Channel email batch error:", error);
    throw error;
  }
}
