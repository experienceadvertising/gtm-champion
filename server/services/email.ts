import { ServerClient } from "postmark";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let postmarkClient: ServerClient | null = null;

if (process.env.POSTMARK_SERVER_TOKEN) {
  postmarkClient = new ServerClient(process.env.POSTMARK_SERVER_TOKEN);
}

const FROM_ADDRESS = process.env.POSTMARK_FROM_EMAIL
  ? `GTM Champion <${process.env.POSTMARK_FROM_EMAIL}>`
  : "GTM Champion <hello@gtmchampion.com>";

export interface WelcomeEmailData {
  toEmail: string;
  userName: string;
  companyName: string;
  summary: string;
  gtmMotion: string;
  dashboardUrl: string;
  recommendations?: Array<{
    category: string;
    title: string;
    impact: string;
  }>;
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

function getImpactColor(impact: string): { bg: string; text: string; dot: string } {
  const normalized = impact.toLowerCase();
  if (normalized === "high") return { bg: "#dcfce7", text: "#166534", dot: "#22c55e" };
  if (normalized === "medium") return { bg: "#fef9c3", text: "#854d0e", dot: "#eab308" };
  return { bg: "#f1f5f9", text: "#475569", dot: "#94a3b8" };
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  if (!postmarkClient) {
    console.warn("Postmark not configured - email would be sent:", data);
    return;
  }

  const highImpactRecs = (data.recommendations || [])
    .filter(r => r.impact?.toLowerCase() === "high")
    .slice(0, 5);

  const channelSet = new Set(highImpactRecs.map(r => r.category));
  const uniqueChannels = Array.from(channelSet);

  const recsHtml = highImpactRecs.length > 0 ? `
        <div style="margin: 28px 0;">
          <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 16px; font-weight: 700; letter-spacing: -0.01em;">Your Top High-Impact Actions</h3>
          ${highImpactRecs.map(rec => {
            const colors = getImpactColor(rec.impact);
            return `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 10px; border-left: 4px solid ${colors.dot};">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="background: ${colors.bg}; color: ${colors.text}; font-size: 11px; font-weight: 600; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.05em;">${rec.impact} Impact</span>
              <span style="color: #94a3b8; font-size: 11px;">·</span>
              <span style="color: #6366f1; font-size: 12px; font-weight: 500;">${rec.category}</span>
            </div>
            <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.5; font-weight: 500;">${rec.title}</p>
          </div>`;
          }).join('')}
        </div>` : '';

  const channelLinksHtml = uniqueChannels.length > 0 ? `
        <div style="margin: 24px 0;">
          <p style="color: #64748b; font-size: 13px; margin: 0 0 12px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Jump to Channel Strategy</p>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${uniqueChannels.map(ch => {
              const channelParam = encodeURIComponent(ch);
              return `<a href="${data.dashboardUrl}?channel=${channelParam}" style="display: inline-block; background: #eef2ff; color: #4338ca; font-size: 13px; font-weight: 500; padding: 6px 14px; border-radius: 6px; text-decoration: none; border: 1px solid #c7d2fe;">${ch}</a>`;
            }).join('')}
          </div>
        </div>` : '';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f1f5f9;">
  <div style="background-color: #f1f5f9; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%); padding: 40px 32px; text-align: center;">
        <div style="font-size: 28px; font-weight: 800; color: white; letter-spacing: -0.02em;">⚡ GTM Champion</div>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 15px; font-weight: 400;">Your Go-To-Market Strategy Is Ready</p>
      </div>

      <div style="padding: 36px 32px 20px 32px;">
        <p style="color: #475569; margin: 0 0 4px 0; font-size: 15px;">Hi ${data.userName},</p>
        <h1 style="color: #0f172a; font-size: 22px; margin: 16px 0 8px 0; font-weight: 700; letter-spacing: -0.02em;">We've analyzed <span style="color: #6366f1;">${data.companyName}</span></h1>
        <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px; line-height: 1.6;">Our AI reviewed your website and built a personalized GTM playbook across 13 marketing channels. Here's what we found:</p>

        <div style="background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%); border: 1px solid #c7d2fe; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
          <p style="color: #6366f1; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px 0;">Your GTM Motion</p>
          <h2 style="margin: 0 0 12px 0; color: #1e1b4b; font-size: 20px; font-weight: 700;">${data.gtmMotion}</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0;">${data.summary}</p>
        </div>

        ${recsHtml}

        ${channelLinksHtml}

        <div style="text-align: center; margin: 32px 0 8px 0;">
          <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; letter-spacing: -0.01em; box-shadow: 0 4px 14px rgba(99,102,241,0.4);">View My Dashboard →</a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">See all 13 channel strategies, actionable tasks, and weekly ideas</p>
      </div>

      <div style="background: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
        <div style="text-align: center;">
          <p style="color: #64748b; font-size: 13px; margin: 0 0 4px 0;">📬 You'll receive weekly GTM ideas every Monday to keep your strategy fresh.</p>
          <p style="color: #94a3b8; font-size: 12px; margin: 12px 0 0 0;">Questions? Just reply to this email — a real human will get back to you.</p>
          <p style="color: #cbd5e1; font-size: 11px; margin: 16px 0 0 0;">&copy; 2026 GTM Champion. All rights reserved.</p>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;

  const recsText = highImpactRecs.length > 0
    ? `\nYour Top High-Impact Actions:\n${highImpactRecs.map((r, i) => `${i + 1}. [${r.category}] ${r.title}`).join('\n')}\n`
    : '';

  const textBody = `Welcome to GTM Champion!

Hi ${data.userName},

We've analyzed ${data.companyName} and built your personalized GTM playbook across 13 marketing channels.

Your GTM Motion: ${data.gtmMotion}

${data.summary}
${recsText}
View your full dashboard: ${data.dashboardUrl}

You'll receive weekly GTM ideas every Monday to keep your strategy fresh.
Questions? Just reply to this email.

© 2026 GTM Champion`;

  try {
    await postmarkClient.sendEmail({
      From: FROM_ADDRESS,
      To: data.toEmail,
      Subject: `Your GTM Strategy for ${data.companyName} Is Ready`,
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

  const dashboardUrl = "https://gtmchampion.com/dashboard";

  const ideasHtml = data.ideas.map((idea) => {
    let formattedDesc = idea.description;

    const maxLength = 500;
    if (formattedDesc.length > maxLength) {
      const truncated = formattedDesc.substring(0, maxLength);
      const lastPeriod = truncated.lastIndexOf('.');
      formattedDesc = lastPeriod > 200 ? truncated.substring(0, lastPeriod + 1) : truncated + '...';
    }

    const steps = formattedDesc.split(/(?:Step\s*\d+[:.]\s*|\b\d+[.)]\s+)/i).filter(s => s.trim().length > 10);
    let descHtml: string;
    if (steps.length >= 2) {
      descHtml = `<table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
        ${steps.map((step, i) => `
        <tr>
          <td style="vertical-align: top; padding: 4px 10px 4px 0; width: 24px;">
            <span style="display: inline-block; width: 22px; height: 22px; background: #eef2ff; color: #6366f1; font-size: 12px; font-weight: 700; text-align: center; line-height: 22px; border-radius: 50%;">${i + 1}</span>
          </td>
          <td style="vertical-align: top; padding: 4px 0 8px 0; color: #475569; font-size: 14px; line-height: 1.6;">${step.trim()}</td>
        </tr>`).join('')}
      </table>`;
    } else {
      descHtml = `<p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0;">${formattedDesc.replace(/\n+/g, '<br>')}</p>`;
    }

    const normalizedType = (idea.type || '').toLowerCase().trim();
    const channel = 
      normalizedType.includes('linkedin') ? 'Organic Social' :
      normalizedType.includes('email') ? 'Email Marketing' :
      normalizedType.includes('webinar') ? 'Community' :
      normalizedType.includes('partner') ? 'Partnerships' :
      normalizedType.includes('social') ? 'Organic Social' :
      normalizedType.includes('seo') ? 'SEO' :
      normalizedType.includes('paid') ? 'Paid Search' :
      'Content';
    const strategyUrl = `${dashboardUrl}?channel=${encodeURIComponent(channel)}`;

    return `
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="margin-bottom: 14px;">
        <span style="background: #eef2ff; color: #6366f1; font-weight: 600; font-size: 11px; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; display: inline-block;">${idea.type}</span>
      </div>
      <h3 style="margin: 0 0 14px 0; color: #0f172a; font-size: 18px; line-height: 1.4;">${idea.title}</h3>
      ${descHtml}
      <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #f1f5f9;">
        <a href="${strategyUrl}" style="color: #6366f1; font-size: 14px; font-weight: 600; text-decoration: none;">Read full strategy &rarr;</a>
      </div>
    </div>
  `;
  }).join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="background-color: #f8fafc; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%); padding: 32px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: white;">⚡ GTM Champion</div>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Weekly Strategy Digest</p>
      </div>

      <div style="padding: 32px;">
        <h1 style="color: #0f172a; font-size: 24px; margin: 0 0 16px 0;">Your ideas for this week 💡</h1>

        <p style="color: #475569; margin: 0 0 8px 0;">Hi ${data.userName},</p>

        <p style="color: #475569; margin: 0 0 24px 0;">Here are <strong>${data.ideas.length} actionable GTM ideas</strong> tailored for <strong>${data.companyName}</strong>:</p>

        ${ideasHtml}

        <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 14px; margin: 0 0 16px 0;">Ready to put these ideas into action?</p>
          <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white !important; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(99,102,241,0.3);">View Full Strategies</a>
        </div>
      </div>

      <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">Keep shipping! We'll be back next Monday with fresh ideas.</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 GTM Champion. All rights reserved.</p>
        <p style="margin: 12px 0 0 0;"><a href="{{{pm:unsubscribe}}}" style="color: #94a3b8; font-size: 11px; text-decoration: underline;">Unsubscribe from emails</a></p>
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

View your dashboard: ${dashboardUrl}

Keep shipping! We'll be back next Monday with fresh ideas.

Unsubscribe: {{{pm:unsubscribe}}}

© 2026 GTM Champion`;

  try {
    await postmarkClient.sendEmail({
      From: FROM_ADDRESS,
      To: data.toEmail,
      Subject: `Your Weekly GTM Ideas for ${data.companyName}`,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: "broadcast",
    });

    console.log(`Weekly email sent to ${data.toEmail}`);
  } catch (error) {
    console.error("Failed to send weekly email:", error);
    throw error;
  }
}

const ADMIN_EMAIL = "evan@experienceadvertising.com";

export async function sendNewUserNotification(data: {
  userName: string;
  email: string;
  companyUrl: string;
}): Promise<void> {
  if (!postmarkClient) {
    console.log("Postmark not configured, skipping admin notification");
    return;
  }

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
  <div style="max-width: 520px; margin: 40px auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px 28px;">
      <h1 style="color: #fff; font-size: 20px; margin: 0;">New User Signed Up</h1>
    </div>
    <div style="padding: 28px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Name</td>
          <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${data.userName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
          <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${data.email}" style="color: #4f46e5;">${data.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Website</td>
          <td style="padding: 8px 0; font-size: 14px;"><a href="${data.companyUrl}" style="color: #4f46e5;">${data.companyUrl}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time</td>
          <td style="padding: 8px 0; font-size: 14px;">${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;

  try {
    await postmarkClient.sendEmail({
      From: FROM_ADDRESS,
      To: ADMIN_EMAIL,
      Subject: `New signup: ${data.userName} (${data.companyUrl})`,
      HtmlBody: htmlBody,
      TextBody: `New user signed up:\n\nName: ${data.userName}\nEmail: ${data.email}\nWebsite: ${data.companyUrl}\nTime: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`,
      MessageStream: "outbound",
    });
    console.log(`Admin notification sent for new user: ${data.email}`);
  } catch (error) {
    console.error("Failed to send admin notification:", error);
  }
}

export interface InviteFriendData {
  toEmail: string;
  toName: string;
  fromName: string;
}

export async function sendInviteFriendEmail(data: InviteFriendData): Promise<void> {
  const safeTo = escapeHtml(data.toName || "");
  const safeFrom = escapeHtml(data.fromName || "");
  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

<tr><td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);padding:40px 40px 30px;">
  <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">You've Been Invited!</h1>
  <p style="color:#c7d2fe;font-size:15px;margin:0;">Your friend ${safeFrom} thinks you'd love GTM Champion</p>
</td></tr>

<tr><td style="padding:32px 40px;">
  <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px;">
    Hi${safeTo ? ` ${safeTo}` : ''},
  </p>
  <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px;">
    <strong>${safeFrom}</strong> has invited you to check out <strong>GTM Champion</strong> — a free AI-powered platform that builds personalized go-to-market strategies for B2B/SaaS companies.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:20px;margin:0 0 24px;">
  <tr><td>
    <p style="color:#4F46E5;font-size:13px;font-weight:600;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;">What you get (100% free):</p>
    <p style="color:#334155;font-size:14px;margin:0 0 6px;">&#10003; AI analysis of your website and market position</p>
    <p style="color:#334155;font-size:14px;margin:0 0 6px;">&#10003; Personalized strategies across 13 marketing channels</p>
    <p style="color:#334155;font-size:14px;margin:0 0 6px;">&#10003; Content tools: LinkedIn posts, email campaigns, blog articles</p>
    <p style="color:#334155;font-size:14px;margin:0;">&#10003; Weekly strategy updates delivered to your inbox</p>
  </td></tr>
  </table>

  <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
  <tr><td align="center" style="background:#4F46E5;border-radius:8px;">
    <a href="https://gtmchampion.com" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Get Your Free GTM Strategy</a>
  </td></tr>
  </table>

  <p style="color:#94a3b8;font-size:13px;text-align:center;margin:24px 0 0;">
    Takes less than 60 seconds to get started. No credit card required.
  </p>
</td></tr>

<tr><td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;">
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
    Sent via <a href="https://gtmchampion.com" style="color:#4F46E5;text-decoration:none;">GTM Champion</a> — Free AI-Powered GTM Strategies
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  if (!postmarkClient) {
    console.log("Postmark not configured — invite email:", JSON.stringify(data));
    return;
  }

  try {
    await postmarkClient.sendEmail({
      From: FROM_ADDRESS,
      To: data.toEmail,
      Subject: `${data.fromName} invited you to GTM Champion`,
      HtmlBody: htmlBody,
      TextBody: `Hi${data.toName ? ` ${data.toName}` : ''},\n\n${data.fromName} has invited you to check out GTM Champion — a free AI-powered platform that builds personalized go-to-market strategies for B2B/SaaS companies.\n\nGet your free strategy: https://gtmchampion.com\n\nTakes less than 60 seconds. No credit card required.`,
      MessageStream: "outbound",
    });
    console.log(`Invite email sent to ${data.toEmail} from ${data.fromName}`);
  } catch (error) {
    console.error("Failed to send invite email:", error);
    throw error;
  }
}

export interface ShareStrategyData {
  toEmail: string;
  toName: string;
  fromName: string;
  companyName: string;
  channelName: string;
  channelStrategy: {
    whyItMatters: string;
    companyFitSummary: string;
    heroStat: { value: string; label: string };
    strategicPillars: Array<{ title: string; objective: string; tactics: string[] }>;
    quickWins: Array<{ title: string; steps: string[]; effort: string }>;
  };
  recommendations: Array<{ title: string; impact: string; description: string }>;
  pdfAttachment?: Buffer;
}

export async function sendShareStrategyEmail(data: ShareStrategyData): Promise<void> {
  const safeTo = escapeHtml(data.toName || "");
  const safeFrom = escapeHtml(data.fromName || "");
  const safeCompany = escapeHtml(data.companyName || "");
  const safeChannel = escapeHtml(data.channelName || "");

  const pillarsHtml = (data.channelStrategy.strategicPillars || []).map(p => `
    <div style="margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-radius:6px;border-left:3px solid #4F46E5;">
      <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0 0 4px;">${escapeHtml(p.title)}</p>
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;">${escapeHtml(p.objective)}</p>
      ${(p.tactics || []).map(t => `<p style="color:#334155;font-size:13px;margin:0 0 3px;">• ${escapeHtml(t)}</p>`).join('')}
    </div>
  `).join('');

  const quickWinsHtml = (data.channelStrategy.quickWins || []).slice(0, 3).map(w => `
    <div style="margin:0 0 12px;padding:10px 14px;background:#f0fdf4;border-radius:6px;">
      <p style="color:#166534;font-size:13px;font-weight:600;margin:0 0 4px;">⚡ ${escapeHtml(w.title)} <span style="color:#94a3b8;font-weight:400;font-size:11px;">(${escapeHtml(w.effort)})</span></p>
      ${(w.steps || []).slice(0, 3).map(s => `<p style="color:#334155;font-size:12px;margin:0 0 2px;">• ${escapeHtml(s)}</p>`).join('')}
    </div>
  `).join('');

  const recsHtml = (data.recommendations || []).slice(0, 5).map(r => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">
        <p style="color:#1e293b;font-size:13px;font-weight:500;margin:0;">${escapeHtml(r.title)}</p>
        <p style="color:#64748b;font-size:12px;margin:2px 0 0;">${escapeHtml(r.description.slice(0, 120))}${r.description.length > 120 ? '...' : ''}</p>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">
        <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;${r.impact === 'High' ? 'background:#dcfce7;color:#166534;' : 'background:#fef3c7;color:#92400e;'}">${escapeHtml(r.impact)}</span>
      </td>
    </tr>
  `).join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

<tr><td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);padding:32px 40px 24px;">
  <p style="color:#c7d2fe;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">SHARED STRATEGY</p>
  <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px;">${safeChannel} Strategy for ${safeCompany}</h1>
  <p style="color:#c7d2fe;font-size:14px;margin:0;">Shared by ${safeFrom}</p>
</td></tr>

<tr><td style="padding:28px 40px;">
  <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">
    Hi${safeTo ? ` ${safeTo}` : ''},
  </p>
  <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px;">
    <strong>${safeFrom}</strong> shared ${safeCompany}'s <strong>${safeChannel}</strong> channel strategy with you from GTM Champion.
  </p>

  ${data.channelStrategy.heroStat?.value ? `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
  <tr><td align="center">
    <p style="color:#4F46E5;font-size:28px;font-weight:700;margin:0;">${escapeHtml(data.channelStrategy.heroStat.value)}</p>
    <p style="color:#64748b;font-size:12px;margin:4px 0 0;">${escapeHtml(data.channelStrategy.heroStat.label)}</p>
  </td></tr>
  </table>` : ''}

  ${data.channelStrategy.whyItMatters ? `
  <h3 style="color:#1e293b;font-size:15px;margin:0 0 8px;">Why It Matters</h3>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 24px;">${escapeHtml(data.channelStrategy.whyItMatters)}</p>` : ''}

  ${pillarsHtml ? `
  <h3 style="color:#1e293b;font-size:15px;margin:0 0 12px;">Strategic Pillars</h3>
  ${pillarsHtml}` : ''}

  ${quickWinsHtml ? `
  <h3 style="color:#1e293b;font-size:15px;margin:0 0 12px;">Quick Wins</h3>
  ${quickWinsHtml}` : ''}

  ${recsHtml ? `
  <h3 style="color:#1e293b;font-size:15px;margin:0 0 12px;">Action Items</h3>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
  <tr style="background:#f8fafc;">
    <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">Strategy</th>
    <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;">Impact</th>
  </tr>
  ${recsHtml}
  </table>` : ''}

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;border-radius:8px;padding:14px 20px;margin:24px 0 0;">
  <tr><td>
    <p style="color:#4F46E5;font-size:13px;font-weight:600;margin:0 0 4px;">&#128206; PDF Strategy Report Attached</p>
    <p style="color:#64748b;font-size:12px;margin:0;">The complete ${safeChannel} strategy is attached as a professionally formatted PDF you can save, print, or share with your team.</p>
  </td></tr>
  </table>

  <table cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
  <tr><td align="center" style="background:#4F46E5;border-radius:8px;">
    <a href="https://gtmchampion.com" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Get Your Own Free GTM Strategy</a>
  </td></tr>
  </table>
</td></tr>

<tr><td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;">
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
    Powered by <a href="https://gtmchampion.com" style="color:#4F46E5;text-decoration:none;">GTM Champion</a> — Free AI-Powered GTM Strategies for B2B/SaaS
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const textPillars = (data.channelStrategy.strategicPillars || []).map(p =>
    `${p.title}\n${p.objective}\n${(p.tactics || []).map(t => `  • ${t}`).join('\n')}`
  ).join('\n\n');

  if (!postmarkClient) {
    console.log("Postmark not configured — share strategy email:", JSON.stringify({ to: data.toEmail, channel: data.channelName }));
    return;
  }

  try {
    const sanitizedChannel = (data.channelName || "channel").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const sanitizedCompany = (data.companyName || "company").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const pdfFilename = `${sanitizedCompany}_${sanitizedChannel}_strategy.pdf`;

    const emailPayload: any = {
      From: FROM_ADDRESS,
      To: data.toEmail,
      Subject: `${data.fromName} shared ${data.companyName}'s ${data.channelName} strategy with you`,
      HtmlBody: htmlBody,
      TextBody: `Hi${data.toName ? ` ${data.toName}` : ''},\n\n${data.fromName} shared ${data.companyName}'s ${data.channelName} channel strategy with you.\n\n${data.channelStrategy.whyItMatters || ''}\n\n${textPillars}\n\nGet your own free GTM strategy: https://gtmchampion.com`,
      MessageStream: "outbound",
    };

    if (data.pdfAttachment) {
      emailPayload.Attachments = [{
        Name: pdfFilename,
        Content: data.pdfAttachment.toString("base64"),
        ContentType: "application/pdf",
      }];
    }

    await postmarkClient.sendEmail(emailPayload);
    console.log(`Strategy share email sent to ${data.toEmail} (${data.channelName})${data.pdfAttachment ? ' with PDF attachment' : ''}`);
  } catch (error) {
    console.error("Failed to send strategy share email:", error);
    throw error;
  }
}

// Channel Strategy Deep-Dive Email
export interface ChannelStrategyEmailData {
  toEmail: string;
  userName: string;
  companyName: string;
  channelId: string;
  priority: string;
  whyItMatters: string;
  companyFitSummary: string;
  heroStat: { value: string; label: string };
  topKpis: string[];
  strategicPillars: Array<{
    title: string;
    objective: string;
    tactics: string[];
    measurement: string;
  }>;
  quickWins: Array<{
    title: string;
    steps: string[];
    effort: string;
    duration: string;
  }>;
}

function getPriorityStyle(priority: string): { bg: string; text: string; label: string } {
  const p = priority.toLowerCase();
  if (p === "high") return { bg: "#dcfce7", text: "#166534", label: "High Priority" };
  if (p === "medium") return { bg: "#fef9c3", text: "#854d0e", label: "Medium Priority" };
  return { bg: "#f1f5f9", text: "#475569", label: "Lower Priority" };
}

function getEffortBadge(effort: string): { bg: string; text: string } {
  const e = effort.toLowerCase();
  if (e === "low") return { bg: "#dcfce7", text: "#166534" };
  return { bg: "#fef9c3", text: "#854d0e" };
}

export async function sendChannelStrategyEmail(data: ChannelStrategyEmailData): Promise<void> {
  if (!postmarkClient) {
    console.log("Postmark not configured, skipping channel strategy email");
    return;
  }

  const firstName = escapeHtml(data.userName.split(' ')[0]);
  const companyName = escapeHtml(data.companyName);
  const channelName = escapeHtml(data.channelId);
  const priorityStyle = getPriorityStyle(data.priority);
  const dashboardUrl = `https://gtmchampion.com/dashboard?channel=${encodeURIComponent(data.channelId)}`;

  const pillarsHtml = data.strategicPillars.slice(0, 3).map((pillar, idx) => {
    const colors = ["#6366f1", "#8b5cf6", "#a855f7"];
    const tacticsHtml = pillar.tactics.slice(0, 4).map(t =>
      `<li style="padding: 4px 0; color: #475569; font-size: 14px;">${escapeHtml(t)}</li>`
    ).join('');
    return `
    <div style="margin-bottom: 20px; border-left: 4px solid ${colors[idx] || '#6366f1'}; padding-left: 16px;">
      <h3 style="margin: 0 0 4px; font-size: 16px; color: #1e293b;">${escapeHtml(pillar.title)}</h3>
      <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; font-style: italic;">${escapeHtml(pillar.objective)}</p>
      <ul style="margin: 0; padding-left: 18px;">${tacticsHtml}</ul>
      <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">📊 Measure: ${escapeHtml(pillar.measurement)}</p>
    </div>`;
  }).join('');

  const quickWinsHtml = data.quickWins.slice(0, 3).map((qw) => {
    const effortStyle = getEffortBadge(qw.effort);
    const stepsHtml = qw.steps.slice(0, 5).map((s, i) =>
      `<tr><td style="padding: 4px 8px 4px 0; vertical-align: top; color: #6366f1; font-weight: 600; font-size: 13px;">${i + 1}.</td><td style="padding: 4px 0; color: #475569; font-size: 13px;">${escapeHtml(s)}</td></tr>`
    ).join('');
    return `
    <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h4 style="margin: 0; font-size: 15px; color: #1e293b;">${escapeHtml(qw.title)}</h4>
      </div>
      <div style="margin-bottom: 8px;">
        <span style="display: inline-block; background: ${effortStyle.bg}; color: ${effortStyle.text}; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">${escapeHtml(qw.effort)} effort</span>
        <span style="display: inline-block; background: #ede9fe; color: #5b21b6; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; margin-left: 4px;">${escapeHtml(qw.duration)}</span>
      </div>
      <table style="width: 100%; border-collapse: collapse;">${stepsHtml}</table>
    </div>`;
  }).join('');

  const kpisHtml = data.topKpis.slice(0, 5).map(k =>
    `<span style="display: inline-block; background: #ede9fe; color: #5b21b6; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; margin: 3px 4px 3px 0;">${escapeHtml(k)}</span>`
  ).join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7); padding: 32px 28px; text-align: center;">
      <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">This week's deep dive</p>
      <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px; font-weight: 700;">${channelName} Strategy</h1>
      <p style="color: rgba(255,255,255,0.9); font-size: 15px; margin: 0;">Personalized for ${companyName}</p>
    </div>

    <div style="padding: 28px;">
      <!-- Greeting -->
      <p style="font-size: 15px; color: #334155; margin: 0 0 20px;">Hey ${firstName},</p>
      <p style="font-size: 15px; color: #334155; margin: 0 0 24px;">This week we're diving deep into your <strong>${channelName}</strong> strategy. Here's your personalized playbook for ${companyName}.</p>

      <!-- Hero Stat + Priority -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <div style="flex: 1; background: linear-gradient(135deg, #eef2ff, #e0e7ff); border-radius: 12px; padding: 20px; text-align: center;">
          <p style="font-size: 28px; font-weight: 800; color: #4f46e5; margin: 0;">${escapeHtml(data.heroStat.value)}</p>
          <p style="font-size: 13px; color: #6366f1; margin: 4px 0 0;">${escapeHtml(data.heroStat.label)}</p>
        </div>
        <div style="display: flex; align-items: center;">
          <span style="background: ${priorityStyle.bg}; color: ${priorityStyle.text}; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">${priorityStyle.label}</span>
        </div>
      </div>

      <!-- Why It Matters -->
      <div style="background: #fefce8; border-left: 4px solid #eab308; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px; font-size: 16px; color: #854d0e;">Why ${channelName} Matters for ${companyName}</h2>
        <p style="margin: 0; font-size: 14px; color: #713f12; line-height: 1.6;">${escapeHtml(data.whyItMatters)}</p>
      </div>

      <!-- Company Fit -->
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">${escapeHtml(data.companyFitSummary)}</p>

      <!-- Strategic Pillars -->
      <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">📋 Strategic Pillars</h2>
      ${pillarsHtml}

      <!-- Quick Wins -->
      <h2 style="font-size: 18px; color: #1e293b; margin: 24px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">⚡ Quick Wins You Can Do This Week</h2>
      ${quickWinsHtml}

      <!-- KPIs -->
      <h2 style="font-size: 18px; color: #1e293b; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">📊 KPIs to Track</h2>
      <div style="margin-bottom: 24px;">${kpisHtml}</div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">View Full ${channelName} Strategy →</a>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 12px;">
        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0 0 8px;">Next week we'll deep dive into another channel. Stay tuned!</p>
        <p style="font-size: 12px; color: #cbd5e1; text-align: center; margin: 0;">
          <a href="{{{pm:unsubscribe}}}" style="color: #94a3b8;">Unsubscribe</a> · © 2026 GTM Champion
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const textBody = `${channelName} Strategy for ${companyName}

Hey ${firstName},

This week we're diving deep into your ${channelName} strategy.

${data.heroStat.value} - ${data.heroStat.label}
Priority: ${data.priority}

WHY IT MATTERS
${data.whyItMatters}

${data.companyFitSummary}

STRATEGIC PILLARS
${data.strategicPillars.map((p, i) => `${i + 1}. ${p.title}\n   ${p.objective}\n   Tactics: ${p.tactics.join(', ')}\n   Measure: ${p.measurement}`).join('\n\n')}

QUICK WINS
${data.quickWins.map((qw, i) => `${i + 1}. ${qw.title} (${qw.effort} effort, ${qw.duration})\n   ${qw.steps.join('\n   ')}`).join('\n\n')}

KPIs TO TRACK
${data.topKpis.join(', ')}

View full strategy: ${dashboardUrl}

Unsubscribe: {{{pm:unsubscribe}}}

© 2026 GTM Champion`;

  try {
    await postmarkClient.sendEmail({
      From: FROM_ADDRESS,
      To: data.toEmail,
      Subject: `This Week's Deep Dive: ${channelName} Strategy for ${companyName}`,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: "broadcast",
    });

    console.log(`Channel strategy email (${data.channelId}) sent to ${data.toEmail}`);
  } catch (error) {
    console.error(`Failed to send channel strategy email (${data.channelId}):`, error);
    throw error;
  }
}

// Feature Announcement Email
export interface FeatureAnnouncementEmailData {
  toEmail: string;
  userName: string;
  featureName: string;
  featureTagline: string;
  featureDescription: string;
  benefits: Array<{ icon: string; title: string; description: string }>;
  ctaText: string;
  ctaUrl: string;
}

export async function sendFeatureAnnouncementEmail(data: FeatureAnnouncementEmailData): Promise<void> {
  if (!postmarkClient) {
    console.warn("Postmark not configured - feature announcement email would be sent:", data);
    return;
  }

  const firstName = data.userName.split(' ')[0];

  const benefitsHtml = data.benefits.map(benefit => `
            <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 12px;">
              <div style="font-size: 28px; margin-bottom: 8px;">${escapeHtml(benefit.icon)}</div>
              <h3 style="margin: 0 0 6px 0; color: #1e293b; font-size: 15px; font-weight: 700;">${escapeHtml(benefit.title)}</h3>
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">${escapeHtml(benefit.description)}</p>
            </div>`).join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f1f5f9;">
  <div style="background-color: #f1f5f9; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%); padding: 40px 32px; text-align: center;">
        <div style="margin-bottom: 16px;">
          <span style="display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 5px 14px; border-radius: 20px;">✨ New Feature</span>
        </div>
        <div style="font-size: 28px; font-weight: 800; color: white; letter-spacing: -0.02em;">⚡ GTM Champion</div>
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 16px 0 8px 0; letter-spacing: -0.01em;">${escapeHtml(data.featureName)}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 15px; font-weight: 400;">${escapeHtml(data.featureTagline)}</p>
      </div>

      <div style="padding: 36px 32px 20px 32px;">
        <p style="color: #475569; margin: 0 0 20px 0; font-size: 15px;">Hi ${escapeHtml(firstName)},</p>

        <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 28px 0;">${escapeHtml(data.featureDescription)}</p>

        <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 700; letter-spacing: -0.01em;">What you'll get</h2>

        <div style="margin: 0 0 28px 0;">
          ${benefitsHtml}
        </div>

        <div style="text-align: center; margin: 32px 0 8px 0;">
          <a href="${escapeHtml(data.ctaUrl)}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; letter-spacing: -0.01em; box-shadow: 0 4px 14px rgba(99,102,241,0.4);">${escapeHtml(data.ctaText)}</a>
        </div>
      </div>

      <div style="background: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
        <div style="text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0;">Questions? Just reply to this email — a real human will get back to you.</p>
          <p style="color: #cbd5e1; font-size: 11px; margin: 12px 0 0 0;">&copy; 2026 GTM Champion. All rights reserved.</p>
          <p style="margin: 12px 0 0 0;"><a href="{{{pm:unsubscribe}}}" style="color: #94a3b8; font-size: 11px; text-decoration: underline;">Unsubscribe from emails</a></p>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;

  const benefitsText = data.benefits.map(b => `${b.icon} ${b.title}\n   ${b.description}`).join('\n\n');

  const textBody = `New in GTM Champion: ${data.featureName}

Hi ${firstName},

${data.featureTagline}

${data.featureDescription}

WHAT YOU'LL GET
${benefitsText}

${data.ctaText}: ${data.ctaUrl}

Questions? Just reply to this email.

Unsubscribe: {{{pm:unsubscribe}}}

© 2026 GTM Champion`;

  try {
    await postmarkClient.sendEmail({
      From: FROM_ADDRESS,
      To: data.toEmail,
      Subject: `New in GTM Champion: ${data.featureName}`,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: "broadcast",
    });

    console.log(`Feature announcement email (${data.featureName}) sent to ${data.toEmail}`);
  } catch (error) {
    console.error(`Failed to send feature announcement email (${data.featureName}):`, error);
    throw error;
  }
}
