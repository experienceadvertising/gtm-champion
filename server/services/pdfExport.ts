import PDFDocument from "pdfkit";
import type { PassThrough } from "stream";

interface ExportCompany {
  name: string | null;
  url: string;
  summary: string | null;
  gtmMotion: string | null;
  siteProfile: any;
}

interface ExportRecommendation {
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  status: string;
  gtmFunnel: string | null;
}

interface ExportChannelInsight {
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

interface ExportWeeklyIdea {
  title: string;
  description: string;
  type: string;
}

interface ExportData {
  company: ExportCompany;
  recommendations: ExportRecommendation[];
  channelInsights: ExportChannelInsight[];
  weeklyIdeas: ExportWeeklyIdea[];
}

const COLORS = {
  primary: "#4F46E5" as const,
  primaryLight: "#818CF8" as const,
  dark: "#1E293B" as const,
  text: "#334155" as const,
  muted: "#64748B" as const,
  light: "#F1F5F9" as const,
  white: "#FFFFFF" as const,
  green: "#059669" as const,
  amber: "#D97706" as const,
  red: "#DC2626" as const,
  border: "#E2E8F0" as const,
};

function impactColor(impact: string): string {
  if (impact === "High") return COLORS.green;
  if (impact === "Medium") return COLORS.amber;
  return COLORS.muted;
}

function priorityLabel(priority: string): string {
  return priority === "High" ? "HIGH PRIORITY" : priority === "Medium" ? "MEDIUM PRIORITY" : "PRIORITY";
}

function addPageHeader(doc: PDFKit.PDFDocument, companyName: string) {
  doc.save();
  doc.rect(0, 0, doc.page.width, 3).fill(COLORS.primary);
  doc.restore();
  doc.fontSize(7).fillColor(COLORS.muted)
    .text(`${companyName} — GTM Strategy Report`, 50, 12, { align: "left" })
    .text(`Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, 50, 12, { align: "right" });
  doc.y = 35;
}

function checkPageBreak(doc: PDFKit.PDFDocument, companyName: string, minSpace = 80) {
  if (doc.y > doc.page.height - minSpace) {
    doc.addPage();
    addPageHeader(doc, companyName);
  }
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string, companyName = "") {
  if (doc.y > doc.page.height - 120) {
    doc.addPage();
    if (companyName) addPageHeader(doc, companyName);
  }
  doc.moveDown(0.8);
  doc.save();
  doc.rect(50, doc.y, 4, 18).fill(COLORS.primary);
  doc.restore();
  doc.fontSize(14).fillColor(COLORS.dark).text(title, 60, doc.y + 1);
  doc.moveDown(0.4);
  doc.save();
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.restore();
  doc.moveDown(0.4);
}

function addSubsectionTitle(doc: PDFKit.PDFDocument, title: string, companyName = "") {
  if (doc.y > doc.page.height - 100) {
    doc.addPage();
    if (companyName) addPageHeader(doc, companyName);
  }
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor(COLORS.primary).text(title, 50);
  doc.moveDown(0.2);
}

function addBodyText(doc: PDFKit.PDFDocument, text: string, indent = 50) {
  doc.fontSize(9).fillColor(COLORS.text).text(text, indent, undefined, {
    width: doc.page.width - indent - 50,
    lineGap: 2,
  });
}

function addBullet(doc: PDFKit.PDFDocument, text: string, indent = 62) {
  if (doc.y > doc.page.height - 60) {
    doc.addPage();
  }
  doc.fontSize(9).fillColor(COLORS.muted).text("•", indent - 10, doc.y, { continued: true });
  doc.fillColor(COLORS.text).text(` ${text}`, { lineGap: 1.5 });
}

function addTag(doc: PDFKit.PDFDocument, label: string, color: string, x: number, y: number): number {
  const width = doc.widthOfString(label) + 12;
  doc.save();
  doc.roundedRect(x, y, width, 14, 3).fill(color + "18");
  doc.fontSize(7).fillColor(color).text(label, x + 6, y + 3);
  doc.restore();
  return width + 4;
}

export function generateStrategyPDF(data: ExportData, stream: PassThrough): void {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: `${data.company.name || "Company"} GTM Strategy Report`,
      Author: "GTM Champion",
      Subject: "Go-To-Market Strategy Report",
    },
  });

  doc.pipe(stream);

  const companyName = data.company.name || "Your Company";
  const profile = data.company.siteProfile;

  // ───── COVER PAGE ─────
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.dark);

  doc.rect(0, 0, doc.page.width, 6).fill(COLORS.primary);

  doc.fontSize(11).fillColor(COLORS.primaryLight).text("GTM CHAMPION", 50, 80);
  doc.moveDown(4);

  doc.fontSize(32).fillColor(COLORS.white).text("Go-To-Market", 50);
  doc.fontSize(32).fillColor(COLORS.primaryLight).text("Strategy Report", 50);

  doc.moveDown(1.5);
  doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor(COLORS.primaryLight).lineWidth(2).stroke();
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor(COLORS.white).text(companyName, 50);
  doc.fontSize(11).fillColor(COLORS.muted).text(data.company.url, 50);

  doc.moveDown(2);

  if (data.company.gtmMotion) {
    doc.fontSize(10).fillColor(COLORS.primaryLight).text("GTM MOTION", 50);
    doc.fontSize(14).fillColor(COLORS.white).text(data.company.gtmMotion, 50);
    doc.moveDown(0.8);
  }

  if (profile?.primaryCategory) {
    doc.fontSize(10).fillColor(COLORS.primaryLight).text("CATEGORY", 50);
    doc.fontSize(14).fillColor(COLORS.white).text(profile.primaryCategory, 50);
    doc.moveDown(0.8);
  }

  const recCount = data.recommendations.length;
  const channelCount = data.channelInsights.length;
  doc.fontSize(10).fillColor(COLORS.primaryLight).text("STRATEGIES", 50);
  doc.fontSize(14).fillColor(COLORS.white).text(`${recCount} recommendations across ${channelCount} channels`, 50);

  doc.moveDown(6);
  doc.fontSize(9).fillColor(COLORS.muted).text(
    `Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`,
    50
  );
  doc.fontSize(8).fillColor(COLORS.muted).text("Powered by GTM Champion — gtmchampion.com", 50);
  doc.restore();

  // ───── EXECUTIVE SUMMARY ─────
  doc.addPage();
  addPageHeader(doc, companyName);

  addSectionTitle(doc, "Executive Summary", companyName);
  if (data.company.summary) {
    addBodyText(doc, data.company.summary);
    doc.moveDown(0.5);
  }

  if (profile?.icpDetails) {
    addSubsectionTitle(doc, "Ideal Customer Profile", companyName);
    if (profile.icpDetails.persona) addBullet(doc, `Persona: ${profile.icpDetails.persona}`);
    if (profile.icpDetails.industry) addBullet(doc, `Industry: ${profile.icpDetails.industry}`);
    if (profile.icpDetails.companySize) addBullet(doc, `Company Size: ${profile.icpDetails.companySize}`);
    if (profile.icpDetails.painPoints?.length) {
      addBullet(doc, `Pain Points: ${profile.icpDetails.painPoints.join("; ")}`);
    }
  }

  if (profile?.competitors?.length) {
    addSubsectionTitle(doc, "Competitive Landscape", companyName);
    addBodyText(doc, `Direct competitors: ${profile.competitors.join(", ")}`);
    if (profile.keyDifferentiators?.length) {
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor(COLORS.muted).text("Key Differentiators:", 50);
      for (const diff of profile.keyDifferentiators) {
        addBullet(doc, diff);
      }
    }
  }

  if (profile?.contentGaps?.length) {
    addSubsectionTitle(doc, "Content Gaps Identified", companyName);
    for (const gap of profile.contentGaps) {
      addBullet(doc, gap);
    }
  }

  // ───── CHANNEL STRATEGIES ─────
  const channelOrder = ['SEO', 'LLMs', 'Content', 'Email Marketing', 'Organic Social', 'CRO', 'Community',
    'Paid Search', 'Paid Social', 'Retargeting', 'ABM', 'Partnerships', 'Outbound'];

  const sortedInsights = [...data.channelInsights].sort((a, b) => {
    const ai = channelOrder.indexOf(a.channelId);
    const bi = channelOrder.indexOf(b.channelId);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const insight of sortedInsights) {
    doc.addPage();
    addPageHeader(doc, companyName);

    const channelRecs = data.recommendations.filter(
      r => r.category.toLowerCase() === insight.channelId.toLowerCase()
    );

    // Channel header
    doc.save();
    doc.rect(50, doc.y, doc.page.width - 100, 52).fill(COLORS.light);
    const headerY = doc.y + 8;
    doc.fontSize(16).fillColor(COLORS.dark).text(insight.channelId, 62, headerY);

    const tagY = headerY + 2;
    let tagX = doc.page.width - 180;
    const pLabel = priorityLabel(insight.priority);
    const pColor = insight.priority === "High" ? COLORS.green : insight.priority === "Medium" ? COLORS.amber : COLORS.muted;
    addTag(doc, pLabel, pColor, tagX, tagY);

    doc.fontSize(8).fillColor(COLORS.muted).text(
      `${channelRecs.length} strategies`,
      62, headerY + 22
    );

    if (insight.heroStat?.value) {
      doc.fontSize(16).fillColor(COLORS.primary).text(insight.heroStat.value, doc.page.width - 180, headerY, { width: 130, align: "right" });
      doc.fontSize(7).fillColor(COLORS.muted).text(insight.heroStat.label || "", doc.page.width - 180, headerY + 20, { width: 130, align: "right" });
    }
    doc.restore();
    doc.y = headerY + 52;

    if (insight.whyItMatters) {
      addSubsectionTitle(doc, "Why It Matters", companyName);
      addBodyText(doc, insight.whyItMatters);
    }

    if (insight.companyFitSummary) {
      doc.moveDown(0.3);
      addSubsectionTitle(doc, "Company Fit", companyName);
      addBodyText(doc, insight.companyFitSummary);
    }

    if (insight.topKpis?.length) {
      addSubsectionTitle(doc, "Key KPIs", companyName);
      for (const kpi of insight.topKpis) {
        addBullet(doc, kpi);
      }
    }

    if (insight.strategicPillars?.length) {
      for (const pillar of insight.strategicPillars) {
        addSubsectionTitle(doc, pillar.title, companyName);
        if (pillar.objective) {
          doc.fontSize(9).fillColor(COLORS.muted).text(`Objective: ${pillar.objective}`, 62, undefined, {
            width: doc.page.width - 112,
          });
          doc.moveDown(0.2);
        }
        if (pillar.tactics?.length) {
          for (const tactic of pillar.tactics) {
            addBullet(doc, tactic, 72);
          }
        }
        if (pillar.measurement) {
          doc.moveDown(0.2);
          doc.fontSize(8).fillColor(COLORS.muted).text(`Measurement: ${pillar.measurement}`, 62, undefined, {
            width: doc.page.width - 112,
          });
        }
      }
    }

    if (insight.quickWins?.length) {
      addSubsectionTitle(doc, "Quick Wins", companyName);
      for (const win of insight.quickWins) {
        checkPageBreak(doc, companyName);
        doc.fontSize(9).fillColor(COLORS.dark).text(`${win.title}`, 62);
        if (win.effort || win.duration) {
          doc.fontSize(7).fillColor(COLORS.muted).text(
            [win.effort && `Effort: ${win.effort}`, win.duration && `Duration: ${win.duration}`].filter(Boolean).join("  |  "),
            72
          );
        }
        if (win.steps?.length) {
          for (const step of win.steps) {
            addBullet(doc, step, 82);
          }
        }
        doc.moveDown(0.3);
      }
    }

    if (channelRecs.length > 0) {
      addSubsectionTitle(doc, "Action Items", companyName);
      for (const rec of channelRecs) {
        if (doc.y > doc.page.height - 80) {
          doc.addPage();
          addPageHeader(doc, companyName);
        }
        doc.save();
        doc.rect(50, doc.y, 3, 14).fill(impactColor(rec.impact));
        doc.restore();

        doc.fontSize(9.5).fillColor(COLORS.dark).text(rec.title, 60, doc.y + 1, { width: doc.page.width - 110 });

        const tagsY = doc.y + 2;
        let tx = 60;
        tx += addTag(doc, `${rec.impact} Impact`, impactColor(rec.impact), tx, tagsY);
        tx += addTag(doc, `${rec.effort} Effort`, COLORS.muted, tx, tagsY);
        if (rec.gtmFunnel) {
          addTag(doc, rec.gtmFunnel.toUpperCase(), COLORS.primary, tx, tagsY);
        }
        doc.y = tagsY + 18;

        doc.fontSize(8.5).fillColor(COLORS.text).text(rec.description, 60, undefined, {
          width: doc.page.width - 110,
          lineGap: 1.5,
        });
        doc.moveDown(0.6);
      }
    }
  }

  // ───── WEEKLY CONTENT IDEAS ─────
  if (data.weeklyIdeas.length > 0) {
    doc.addPage();
    addPageHeader(doc, companyName);
    addSectionTitle(doc, "Weekly Content Sprint Ideas", companyName);

    for (const idea of data.weeklyIdeas) {
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        addPageHeader(doc, companyName);
      }
      doc.save();
      doc.rect(50, doc.y, doc.page.width - 100, 1).fill(COLORS.border);
      doc.restore();
      doc.moveDown(0.3);

      const ideaTagY = doc.y;
      addTag(doc, idea.type, COLORS.primary, 50, ideaTagY);
      doc.y = ideaTagY + 18;

      doc.fontSize(10).fillColor(COLORS.dark).text(idea.title, 50, undefined, { width: doc.page.width - 100 });
      doc.moveDown(0.2);
      addBodyText(doc, idea.description);
      doc.moveDown(0.5);
    }
  }

  // ───── ALL RECOMMENDATIONS SUMMARY ─────
  doc.addPage();
  addPageHeader(doc, companyName);
  addSectionTitle(doc, "Complete Recommendations Summary", companyName);

  const highImpact = data.recommendations.filter(r => r.impact === "High");
  const medImpact = data.recommendations.filter(r => r.impact === "Medium");
  const lowImpact = data.recommendations.filter(r => r.impact !== "High" && r.impact !== "Medium");

  const renderRecGroup = (recs: ExportRecommendation[], label: string) => {
    if (recs.length === 0) return;
    addSubsectionTitle(doc, `${label} (${recs.length})`, companyName);
    for (const rec of recs) {
      if (doc.y > doc.page.height - 60) {
        doc.addPage();
        addPageHeader(doc, companyName);
      }
      doc.fontSize(9).fillColor(COLORS.dark).text(`[${rec.category}] ${rec.title}`, 60, undefined, { width: doc.page.width - 110 });
      doc.fontSize(8).fillColor(COLORS.muted).text(
        `Impact: ${rec.impact} | Effort: ${rec.effort}${rec.gtmFunnel ? ` | Funnel: ${rec.gtmFunnel}` : ""}`,
        60
      );
      doc.moveDown(0.3);
    }
  };

  renderRecGroup(highImpact, "High Impact");
  renderRecGroup(medImpact, "Medium Impact");
  renderRecGroup(lowImpact, "Other");

  doc.end();
}

export interface ChannelPDFData {
  companyName: string;
  companyUrl: string;
  channelId: string;
  insight: ExportChannelInsight;
  recommendations: ExportRecommendation[];
}

export function generateChannelPDF(data: ChannelPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: `${data.companyName} — ${data.channelId} Strategy`,
        Author: "GTM Champion",
        Subject: `${data.channelId} Channel Strategy`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const companyName = data.companyName || "Your Company";
    const insight = data.insight;

    doc.save();
    doc.rect(0, 0, doc.page.width, doc.page.height * 0.35).fill(COLORS.dark);
    doc.rect(0, 0, doc.page.width, 6).fill(COLORS.primary);

    doc.fontSize(10).fillColor(COLORS.primaryLight).text("GTM CHAMPION", 50, 50);
    doc.moveDown(1.5);
    doc.fontSize(26).fillColor(COLORS.white).text(`${data.channelId} Strategy`, 50);
    doc.fontSize(14).fillColor(COLORS.primaryLight).text(companyName, 50);
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor(COLORS.muted).text(data.companyUrl, 50);

    if (insight.heroStat?.value) {
      doc.moveDown(1);
      doc.fontSize(28).fillColor(COLORS.white).text(insight.heroStat.value, 50);
      doc.fontSize(9).fillColor(COLORS.muted).text(insight.heroStat.label || "", 50);
    }

    const pLabel = priorityLabel(insight.priority);
    const pColor = insight.priority === "High" ? COLORS.green : insight.priority === "Medium" ? COLORS.amber : COLORS.muted;
    doc.moveDown(1);
    addTag(doc, pLabel, pColor, 50, doc.y);

    doc.restore();
    doc.y = doc.page.height * 0.35 + 20;

    if (insight.whyItMatters) {
      addSubsectionTitle(doc, "Why It Matters", companyName);
      addBodyText(doc, insight.whyItMatters);
    }

    if (insight.companyFitSummary) {
      doc.moveDown(0.3);
      addSubsectionTitle(doc, "Company Fit", companyName);
      addBodyText(doc, insight.companyFitSummary);
    }

    if (insight.topKpis?.length) {
      addSubsectionTitle(doc, "Key KPIs", companyName);
      for (const kpi of insight.topKpis) {
        addBullet(doc, kpi);
      }
    }

    if (insight.strategicPillars?.length) {
      for (const pillar of insight.strategicPillars) {
        addSubsectionTitle(doc, pillar.title, companyName);
        if (pillar.objective) {
          doc.fontSize(9).fillColor(COLORS.muted).text(`Objective: ${pillar.objective}`, 62, undefined, {
            width: doc.page.width - 112,
          });
          doc.moveDown(0.2);
        }
        if (pillar.tactics?.length) {
          for (const tactic of pillar.tactics) {
            addBullet(doc, tactic, 72);
          }
        }
        if (pillar.measurement) {
          doc.moveDown(0.2);
          doc.fontSize(8).fillColor(COLORS.muted).text(`Measurement: ${pillar.measurement}`, 62, undefined, {
            width: doc.page.width - 112,
          });
        }
      }
    }

    if (insight.quickWins?.length) {
      addSubsectionTitle(doc, "Quick Wins", companyName);
      for (const win of insight.quickWins) {
        checkPageBreak(doc, companyName);
        doc.fontSize(9).fillColor(COLORS.dark).text(`${win.title}`, 62);
        if (win.effort || win.duration) {
          doc.fontSize(7).fillColor(COLORS.muted).text(
            [win.effort && `Effort: ${win.effort}`, win.duration && `Duration: ${win.duration}`].filter(Boolean).join("  |  "),
            72
          );
        }
        if (win.steps?.length) {
          for (const step of win.steps) {
            addBullet(doc, step, 82);
          }
        }
        doc.moveDown(0.3);
      }
    }

    if (data.recommendations.length > 0) {
      addSubsectionTitle(doc, "Action Items", companyName);
      for (const rec of data.recommendations) {
        if (doc.y > doc.page.height - 80) {
          doc.addPage();
          addPageHeader(doc, companyName);
        }
        doc.save();
        doc.rect(50, doc.y, 3, 14).fill(impactColor(rec.impact));
        doc.restore();

        doc.fontSize(9.5).fillColor(COLORS.dark).text(rec.title, 60, doc.y + 1, { width: doc.page.width - 110 });

        const tagsY = doc.y + 2;
        let tx = 60;
        tx += addTag(doc, `${rec.impact} Impact`, impactColor(rec.impact), tx, tagsY);
        tx += addTag(doc, `${rec.effort} Effort`, COLORS.muted, tx, tagsY);
        if (rec.gtmFunnel) {
          addTag(doc, rec.gtmFunnel.toUpperCase(), COLORS.primary, tx, tagsY);
        }
        doc.y = tagsY + 18;

        doc.fontSize(8.5).fillColor(COLORS.text).text(rec.description, 60, undefined, {
          width: doc.page.width - 110,
          lineGap: 1.5,
        });
        doc.moveDown(0.6);
      }
    }

    doc.moveDown(2);
    doc.save();
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.restore();
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor(COLORS.muted).text(
      `Generated on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} — Powered by GTM Champion (gtmchampion.com)`,
      50, undefined, { align: "center", width: doc.page.width - 100 }
    );

    doc.end();
  });
}
