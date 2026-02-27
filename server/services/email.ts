import { ServerClient } from "postmark";

// Initialize Postmark client
// Note: User needs to provide POSTMARK_SERVER_TOKEN in environment variables
let postmarkClient: ServerClient | null = null;

if (process.env.POSTMARK_SERVER_TOKEN) {
  postmarkClient = new ServerClient(process.env.POSTMARK_SERVER_TOKEN);
}

export interface WelcomeEmailData {
  toEmail: string;
  userName: string;
  companyName: string;
  summary: string;
  gtmMotion: string;
  dashboardUrl: string;
}

export interface WeeklyEmailData {
  toEmail: string;
  userName: string;
  companyName: string;
  ideas: Array<{
    title: string;
    description: string;
    type: string;
  }>;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  if (!postmarkClient) {
    console.warn("Postmark not configured - email would be sent:", data);
    return;
  }

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0; }
    .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
    .content { background: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0; }
    .highlight { background: #eef2ff; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ GTM Champion</div>
    </div>
    
    <h2 style="color: #0f172a;">Welcome to GTM Champion! 🚀</h2>
    
    <p>Hi ${data.userName},</p>
    
    <p>Thanks for signing up! We've successfully analyzed <strong>${data.companyName}</strong> and our AI has generated your initial Go-To-Market profile.</p>
    
    <div class="highlight">
      <h3 style="margin-top: 0; color: #4338ca;">Your GTM Motion: ${data.gtmMotion}</h3>
      <p style="color: #475569;">${data.summary}</p>
    </div>
    
    <p>We've identified several high-impact channels for you to focus on this week. Log in to your dashboard to see the full breakdown of recommendations tailored specifically for your business.</p>
    
    <div style="text-align: center;">
      <a href="${data.dashboardUrl}" class="button">View My Dashboard</a>
    </div>
    
    <div class="footer">
      <p>You'll receive weekly GTM ideas every Monday to keep your strategy fresh.</p>
      <p style="margin-top: 20px;">P.S. You can reply directly to this email if you have any questions about your strategy.</p>
      <p style="margin-top: 20px;">© 2025 GTM Champion. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  const textBody = `Welcome to GTM Champion!

Hi ${data.userName},

Thanks for signing up! We've successfully analyzed ${data.companyName} and our AI has generated your initial Go-To-Market profile.

Your GTM Motion: ${data.gtmMotion}

${data.summary}

We've identified several high-impact channels for you to focus on this week. Log in to your dashboard to see the full breakdown: ${data.dashboardUrl}

P.S. You can reply directly to this email if you have any questions about your strategy.

© 2025 GTM Champion`;

  try {
    await postmarkClient.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL || "noreply@gtmchampion.com",
      To: data.toEmail,
      Subject: "Welcome to GTM Champion - Your Analysis is Ready",
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: "outbound",
    });
    
    console.log(`Welcome email sent to ${data.toEmail}`);
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    throw error;
  }
}

export async function sendWeeklyEmail(data: WeeklyEmailData): Promise<void> {
  if (!postmarkClient) {
    console.warn("Postmark not configured - weekly email would be sent:", data);
    return;
  }

  const ideasHtml = data.ideas.map((idea, idx) => {
    // Format description with better structure - convert numbered lists to HTML
    let formattedDesc = idea.description;
    
    // Truncate if too long (keep first 300 chars for email readability)
    const maxLength = 400;
    if (formattedDesc.length > maxLength) {
      // Try to cut at a sentence boundary
      const truncated = formattedDesc.substring(0, maxLength);
      const lastPeriod = truncated.lastIndexOf('.');
      formattedDesc = lastPeriod > 200 ? truncated.substring(0, lastPeriod + 1) : truncated + '...';
    }
    
    // Convert numbered patterns like "1)" or "1." to cleaner format
    formattedDesc = formattedDesc
      .replace(/(\d+)\)\s*/g, '<br>• ')
      .replace(/;\s*(\d+)\)/g, '<br>• ')
      .replace(/^• /, '');
    
    return `
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="background: #eef2ff; color: #6366f1; font-weight: 600; font-size: 11px; text-transform: uppercase; padding: 4px 10px; border-radius: 4px;">${idea.type}</span>
      </div>
      <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; line-height: 1.4;">${idea.title}</h3>
      <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0;">${formattedDesc}</p>
      <a href="https://gtmchampion.com/dashboard" style="display: inline-block; margin-top: 16px; color: #6366f1; font-size: 14px; font-weight: 600; text-decoration: none;">Read full strategy →</a>
    </div>
  `;
  }).join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
    .wrapper { background-color: #f8fafc; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center; }
    .logo { font-size: 24px; font-weight: bold; color: white; }
    .content { padding: 32px; }
    .button { display: inline-block; background: #6366f1; color: white !important; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .footer { background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">⚡ GTM Champion</div>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Weekly Strategy Digest</p>
      </div>
      
      <div class="content">
        <h1 style="color: #0f172a; font-size: 24px; margin: 0 0 16px 0;">Your ideas for this week 💡</h1>
        
        <p style="color: #475569; margin: 0 0 8px 0;">Hi ${data.userName},</p>
        
        <p style="color: #475569; margin: 0 0 24px 0;">Here are <strong>${data.ideas.length} actionable GTM ideas</strong> tailored for <strong>${data.companyName}</strong>:</p>
        
        ${ideasHtml}
        
        <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 14px; margin: 0 0 16px 0;">Ready to put these ideas into action?</p>
          <a href="https://gtmchampion.com/dashboard" class="button">View Full Strategies</a>
        </div>
      </div>
      
      <div class="footer">
        <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">Keep shipping! We'll be back next Monday with fresh ideas.</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 GTM Champion. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const ideasText = data.ideas.map((idea, idx) => 
    `${idx + 1}. [${idea.type}] ${idea.title}\n   ${idea.description}`
  ).join('\n\n');

  const textBody = `Here are your ideas for the week

Hi ${data.userName},

Based on recent trends in your industry, here are ${data.ideas.length} actionable GTM ideas for ${data.companyName}:

${ideasText}

Keep shipping! We'll be back next Monday with fresh ideas.

© 2025 GTM Champion`;

  try {
    await postmarkClient.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL || "noreply@gtmchampion.com",
      To: data.toEmail,
      Subject: `Your Weekly GTM Ideas for ${data.companyName}`,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: "outbound",
    });
    
    console.log(`Weekly email sent to ${data.toEmail}`);
  } catch (error) {
    console.error("Failed to send weekly email:", error);
    throw error;
  }
}
