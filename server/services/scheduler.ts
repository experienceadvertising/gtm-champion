import cron from "node-cron";
import { storage } from "../storage";
import { generateWeeklyIdeas } from "./openai";
import { sendWeeklyEmail } from "./email";

export function startWeeklyEmailScheduler() {
  console.log("Starting weekly email scheduler...");
  
  cron.schedule("0 9 * * 1", async () => {
    console.log("Running weekly email job - Monday 9 AM...");
    await sendWeeklyEmailsToAllUsers();
  }, {
    timezone: "America/New_York"
  });

  console.log("Weekly email scheduler started - will send emails every Monday at 9 AM ET");
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

export async function sendWeeklyEmailsToAllUsers() {
  try {
    console.log("Starting weekly email batch...");
    
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

    console.log(`Weekly emails complete: ${totalSent} sent, ${totalFailed} failed, ${allUsers.length} total users`);
    return { sent: totalSent, failed: totalFailed, total: allUsers.length };
  } catch (error) {
    console.error("Weekly email batch error:", error);
    throw error;
  }
}
