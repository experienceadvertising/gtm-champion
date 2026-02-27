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

export async function sendWeeklyEmailsToAllUsers() {
  try {
    console.log("Starting weekly email batch...");
    
    const allUsers = await storage.getAllUsers();
    let sent = 0;
    let failed = 0;

    for (const user of allUsers) {
      try {
        const company = await storage.getCompanyByUserId(user.id);
        if (!company || !company.name) {
          console.log(`Skipping user ${user.email} - no company data`);
          continue;
        }

        const freshIdeas = await generateWeeklyIdeas(
          company.name,
          company.summary || "",
          company.gtmMotion || "Growth"
        );

        await storage.deleteWeeklyIdeasByCompanyId(company.id);
        for (const idea of freshIdeas) {
          await storage.createWeeklyIdea({
            companyId: company.id,
            title: idea.title,
            description: idea.description,
            type: idea.type,
          });
        }

        await sendWeeklyEmail({
          toEmail: user.email,
          userName: user.fullName,
          companyName: company.name,
          ideas: freshIdeas,
        });

        sent++;
        console.log(`Weekly email sent to ${user.email}`);
      } catch (userError) {
        console.error(`Failed to process user ${user.email}:`, userError);
        failed++;
      }
    }

    console.log(`Weekly emails complete: ${sent} sent, ${failed} failed, ${allUsers.length} total users`);
    return { sent, failed, total: allUsers.length };
  } catch (error) {
    console.error("Weekly email batch error:", error);
    throw error;
  }
}
