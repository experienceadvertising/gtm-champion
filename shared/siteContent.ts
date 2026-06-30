/**
 * Canonical marketing content for the home page.
 *
 * Single source of truth shared by the client landing page
 * (`client/src/pages/landing-page.tsx`) and the build-time prerenderer
 * (`scripts/generate-prerender.ts`), so the content crawlers/LLMs receive in
 * server-rendered HTML stays identical to what users see. Pure data only — no
 * React or icon imports — so it can be imported in a plain Node context.
 */

export const HERO = {
  headline: "AI-Powered Go-To-Market Strategy for B2B SaaS",
  subhead:
    "Paste your URL. Our AI scrapes your site, analyzes your business, and builds a custom GTM strategy across 13 channels with weekly updates every Monday. The kind of strategy agencies charge $5,000+ to create. Free to start, Pro from $29/mo.",
};

export interface HowItWorksStep {
  step: string;
  title: string;
  description: string;
}

export const STEPS: HowItWorksStep[] = [
  {
    step: "1",
    title: "Enter Your Website URL",
    description:
      "Paste your company URL. Our AI scrapes your site content, captures a screenshot, and runs a PageSpeed audit, all in parallel.",
  },
  {
    step: "2",
    title: "AI Builds Your Strategy",
    description:
      "GPT-5 classifies your GTM motion, generates personalized recommendations across 13 channels, and identifies your highest-impact quick wins.",
  },
  {
    step: "3",
    title: "Execute & Get Weekly Updates",
    description:
      "Track recommendations, generate content with built-in writing tools, and receive fresh strategy ideas in your inbox every Monday morning.",
  },
];

export interface ChannelInfo {
  id: string;
  description: string;
}

export const CHANNELS: ChannelInfo[] = [
  { id: "SEO", description: "Organic search optimization" },
  { id: "LLMs", description: "AI search visibility" },
  { id: "Paid Search", description: "Google & Bing ads" },
  { id: "Paid Social", description: "LinkedIn & social ads" },
  { id: "Organic Social", description: "LinkedIn & Twitter growth" },
  { id: "Retargeting", description: "Re-engage visitors" },
  { id: "CRO", description: "Conversion optimization" },
  { id: "Email", description: "Nurture campaigns" },
  { id: "Content", description: "Blogs, guides & webinars" },
  { id: "Community", description: "Build your audience" },
  { id: "ABM", description: "Account-based marketing" },
  { id: "Partnerships", description: "Partner ecosystem" },
  { id: "Outbound", description: "Cold email & sales" },
];

export const CHANNEL_GROUPS: Record<string, { label: string; channels: string[] }> = {
  organic: {
    label: "Organic Growth",
    channels: ["SEO", "LLMs", "Organic Social", "Content", "Community"],
  },
  paid: {
    label: "Paid Acquisition",
    channels: ["Paid Search", "Paid Social", "Retargeting"],
  },
  growth: {
    label: "Growth & Outreach",
    channels: ["CRO", "Email", "ABM", "Partnerships", "Outbound"],
  },
};

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is GTM Champion?",
    answer:
      "GTM Champion is an AI-powered Go-To-Market strategy platform for B2B SaaS companies. It analyzes your website, understands your product and target audience, and generates personalized marketing recommendations across 13 channels including SEO, paid search, content marketing, ABM, and partnerships.",
  },
  {
    question: "How does GTM Champion work?",
    answer:
      "Simply enter your website URL and GTM Champion's AI will scrape and analyze your site content. Within seconds, you'll receive a comprehensive GTM strategy with channel-specific recommendations, quick wins, KPIs to track, and weekly content ideas tailored to your business.",
  },
  {
    question: "What marketing channels does GTM Champion cover?",
    answer:
      "GTM Champion provides strategies for 13 marketing channels: SEO, LLMs/AI Search, Paid Search, Paid Social, Organic Social, Retargeting, CRO (Conversion Rate Optimization), Email Marketing, Content Marketing, Community Building, ABM (Account-Based Marketing), Partnerships, and Outbound Sales.",
  },
  {
    question: "Is GTM Champion free to use?",
    answer:
      "Yes — the free plan is generous. You get full GTM analysis across all 13 channels, AI chat, content tools (with daily limits), weekly strategy emails, and one website re-analysis per week. No credit card required to start. GTM Champion Pro ($29/mo or $290/yr) unlocks 10x higher AI limits, branded multi-page PDF exports, unlimited re-analysis with 12-month strategy history, and up to 8 buyer personas with A/B budget scenarios.",
  },
  {
    question: "What are the weekly AI content sprints?",
    answer:
      "Every Monday morning, GTM Champion sends you a fresh batch of actionable content ideas and marketing tactics via email. These are personalized to your business and designed to be executed within the week for maximum impact.",
  },
  {
    question: "Can I ask questions about my GTM strategy?",
    answer:
      "Yes! GTM Champion includes an AI assistant that answers your marketing questions with personalized advice based on your company's specific context, business model, and GTM motion. Ask about any channel and get actionable recommendations.",
  },
];
