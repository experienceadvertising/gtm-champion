import type {
  ChannelInsightGenerationStatus,
  ChannelInsightStrategyMeta,
  CrossChannelStrategyPlan,
  SiteProfile,
} from "@shared/schema";

export const CHANNEL_IDS = [
  "SEO",
  "Content",
  "LLMs",
  "CRO",
  "Email Marketing",
  "Paid Search",
  "Paid Social",
  "Organic Social",
  "Retargeting",
  "Community",
  "ABM",
  "Partnerships",
  "Outbound",
] as const;

export type ChannelId = (typeof CHANNEL_IDS)[number];

export interface ChannelInsightDraft {
  channelId: string;
  priority: "High" | "Medium" | "Low";
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
    effort: "Low" | "Medium";
    duration: string;
  }>;
  resources: string[];
  generationStatus: ChannelInsightGenerationStatus;
  strategyMeta: ChannelInsightStrategyMeta;
}

interface Playbook {
  basePriority: number;
  heroStat: { value: string; label: string };
  kpis: string[];
  why: string;
  pillarOne: {
    title: string;
    objective: string;
    tactics: string[];
    measurement: string;
  };
  pillarTwo: {
    title: string;
    objective: string;
    tactics: string[];
    measurement: string;
  };
  quickWins: Array<{
    title: string;
    steps: string[];
    effort: "Low" | "Medium";
    duration: string;
  }>;
  resources: string[];
  prerequisites: string[];
  budget: {
    minimumMonthly: number | null;
    recommendedMonthly: number | null;
    rationale: string;
  };
  cadence: { daily: string[]; weekly: string[] };
  risks: string[];
  roadmap: {
    first30Days: string[];
    days31To60: string[];
    days61To90: string[];
  };
}

const PLAYBOOKS: Record<ChannelId, Playbook> = {
  SEO: {
    basePriority: 78,
    heroStat: { value: "90 days", label: "Initial compounding window" },
    kpis: ["Qualified organic conversions", "Non-brand rankings", "Pipeline influenced", "Indexed high-intent pages"],
    why: "SEO captures durable demand when buyers research problems, implementation options, and category alternatives before speaking with sales.",
    pillarOne: {
      title: "{company} commercial search architecture",
      objective: "Own the highest-intent searches connected to {company}'s product, use cases, and alternatives.",
      tactics: [
        "Map problem, category, use-case, integration, pricing, and comparison queries to distinct pages.",
        "Build pages around {company}'s real features and buyer pain points instead of broad traffic topics.",
        "Add internal links from educational content into the most relevant commercial conversion path.",
      ],
      measurement: "Track qualified organic conversions and influenced pipeline by landing-page cluster.",
    },
    pillarTwo: {
      title: "Technical authority and proof",
      objective: "Make {company}'s expertise easy for search engines and buyers to verify.",
      tactics: [
        "Fix indexing, canonical, Core Web Vitals, structured-data, and duplicate-content issues before scaling content.",
        "Publish evidence-led case studies, implementation guides, and direct category comparisons.",
        "Earn relevant third-party mentions through partners, customers, directories, and digital PR.",
      ],
      measurement: "Monitor indexed pages, referring domains, conversion rate, and rankings for commercial query groups.",
    },
    quickWins: [
      { title: "Create the first high-intent topic map", steps: ["Export current ranking pages and queries.", "Group 20 buyer queries by problem, use case, comparison, and implementation.", "Assign one conversion page to each group and flag missing pages."], effort: "Low", duration: "1-2 days" },
      { title: "Upgrade one commercial page", steps: ["Choose the page closest to revenue.", "Add a direct answer, proof, use cases, FAQs, and a clear next step.", "Add internal links from three relevant existing pages."], effort: "Medium", duration: "3-5 days" },
    ],
    resources: ["Google Search Console", "GA4", "PageSpeed Insights", "Ahrefs or Semrush", "Schema validator"],
    prerequisites: ["Verified conversion events", "Search Console access", "Indexable website", "Clear commercial page ownership"],
    budget: { minimumMonthly: 1500, recommendedMonthly: 4000, rationale: "Covers technical work, one strong commercial asset, and ongoing measurement; exclude paid placement costs." },
    cadence: { daily: [], weekly: ["Review indexing and technical errors", "Review qualified conversions by landing page", "Refresh one decaying or underperforming page"] },
    risks: ["Publishing high-volume content without buyer intent", "Measuring rankings without pipeline", "Creating overlapping pages that compete with each other"],
    roadmap: { first30Days: ["Technical and conversion baseline", "Commercial query map"], days31To60: ["Publish priority commercial pages", "Build internal-link paths"], days61To90: ["Earn third-party mentions", "Refresh based on qualified conversion data"] },
  },
  Content: {
    basePriority: 75,
    heroStat: { value: "1:5", label: "Core asset to derivative content target" },
    kpis: ["Content-assisted pipeline", "Engaged ICP accounts", "Email capture rate", "Sales usage"],
    why: "Content should reduce buyer uncertainty and create reusable proof for search, social, email, partners, and sales rather than functioning as an isolated publishing calendar.",
    pillarOne: {
      title: "{company} buyer-enablement library",
      objective: "Answer the questions that block buyers from understanding, trusting, and adopting {company}.",
      tactics: ["Build content around pains, implementation, ROI, objections, integrations, and alternatives.", "Use customer language and product evidence in every major asset.", "Attach a clear conversion or next-step path to each asset."],
      measurement: "Measure engaged target accounts, assisted opportunities, and conversion rate by content theme.",
    },
    pillarTwo: {
      title: "Distribution and repurposing engine",
      objective: "Turn each high-value asset into repeatable distribution across owned and earned channels.",
      tactics: ["Convert each core asset into founder posts, sales snippets, email modules, webinar material, and partner content.", "Assign distribution ownership before the asset is produced.", "Refresh winning assets with new proof instead of constantly starting over."],
      measurement: "Track derivative assets produced, qualified reach, sales usage, and influenced pipeline.",
    },
    quickWins: [
      { title: "Build a five-question buyer content backlog", steps: ["Interview sales or customer-facing staff for recurring objections.", "Rank questions by revenue impact and frequency.", "Draft one proof-led answer with a clear CTA."], effort: "Low", duration: "1-2 days" },
      { title: "Repurpose the strongest proof asset", steps: ["Select one case study, webinar, or product demonstration.", "Create five channel-native derivatives.", "Distribute them over two weeks with consistent tracking."], effort: "Medium", duration: "3-5 days" },
    ],
    resources: ["Content brief template", "GA4", "CRM campaign tracking", "Customer interview notes", "Content calendar"],
    prerequisites: ["Documented ICP questions", "Named distribution owner", "Conversion path for each content type"],
    budget: { minimumMonthly: 2000, recommendedMonthly: 6000, rationale: "Supports one high-quality core asset plus repurposing and distribution." },
    cadence: { daily: [], weekly: ["Review content-assisted opportunities", "Repurpose one proof point", "Collect new questions from sales and support"] },
    risks: ["Publishing without distribution", "Optimizing for volume instead of buyer progression", "Using unsupported claims or invented customer proof"],
    roadmap: { first30Days: ["Buyer-question inventory", "Content-to-funnel map"], days31To60: ["Publish two proof-led assets", "Launch repurposing cadence"], days61To90: ["Refresh winners", "Connect CRM influence reporting"] },
  },
  LLMs: {
    basePriority: 72,
    heroStat: { value: "25 prompts", label: "Minimum visibility benchmark set" },
    kpis: ["AI citation share", "Brand mention rate", "Prompt coverage", "AI-referred conversions"],
    why: "AI answer engines increasingly shape category discovery and vendor shortlists, but visibility depends on broad topic coverage, consistent entities, useful source material, and credible third-party references.",
    pillarOne: {
      title: "{company} AI visibility benchmark",
      objective: "Measure where {company} appears, is cited, or is absent across buyer prompts.",
      tactics: ["Create a fixed prompt set spanning category, comparison, pricing, use case, implementation, and troubleshooting.", "Test the same prompt set across major answer engines and record mentions, citations, competitors, and cited URLs.", "Repeat the benchmark monthly using the same methodology."],
      measurement: "Track citation share, mention rate, competitor share, and prompt-level movement.",
    },
    pillarTwo: {
      title: "Entity, evidence, and topic coverage",
      objective: "Give answer engines consistent, authoritative material they can retrieve and cite.",
      tactics: ["Create direct-answer pages, comparison tables, implementation guides, FAQs, and evidence-led case studies.", "Keep product, organization, author, and offering details consistent across first- and third-party sources.", "Use appropriate structured data for machine readability without treating it as a citation guarantee."],
      measurement: "Measure covered prompt categories, cited pages, third-party mentions, and AI-referred qualified conversions.",
    },
    quickWins: [
      { title: "Create the first AI visibility benchmark", steps: ["Write 25 prompts representing real buyer research.", "Test them consistently across selected engines.", "Record citations, mentions, competitors, and missing topic categories."], effort: "Low", duration: "1-2 days" },
      { title: "Build one citation-ready answer page", steps: ["Choose a high-value missing prompt.", "Answer it directly with clear headings, evidence, steps, and comparison context.", "Add relevant schema and connect it to supporting internal pages."], effort: "Medium", duration: "3-5 days" },
    ],
    resources: ["Prompt benchmark sheet", "Search Console", "Schema validator", "AI referral tracking", "Third-party citation tracker"],
    prerequisites: ["Stable product positioning", "Indexable source content", "Consistent company and product entities", "A repeatable prompt set"],
    budget: { minimumMonthly: 1000, recommendedMonthly: 3500, rationale: "Covers benchmark monitoring, source-content improvements, and third-party authority work." },
    cadence: { daily: [], weekly: ["Test a rotating prompt sample", "Review new citations and competitor appearances", "Improve one citation-worthy source page"] },
    risks: ["Treating heuristic scores as industry standards", "Assuming schema guarantees citations", "Publishing thin AI-generated pages without original evidence"],
    roadmap: { first30Days: ["Prompt benchmark", "Entity consistency audit"], days31To60: ["Close highest-value topic gaps", "Improve citation-ready pages"], days61To90: ["Expand third-party authority", "Compare citation movement and referred conversions"] },
  },
  CRO: {
    basePriority: 85,
    heroStat: { value: "3 tests", label: "Initial hypothesis backlog" },
    kpis: ["Qualified conversion rate", "Demo completion rate", "Form abandonment", "Pipeline per visitor"],
    why: "Conversion work improves the economics of every acquisition channel and should be validated before meaningful traffic or budget is scaled.",
    pillarOne: {
      title: "{company} conversion diagnosis",
      objective: "Identify the highest-friction step between buyer intent and a qualified conversion.",
      tactics: ["Instrument the full path from landing page to qualified opportunity.", "Review message clarity, proof, CTA hierarchy, mobile usability, speed, and form friction.", "Segment behavior by channel, device, ICP, and landing page."],
      measurement: "Track qualified conversion rate and drop-off at each funnel step.",
    },
    pillarTwo: {
      title: "Evidence-led experiment program",
      objective: "Run prioritized experiments tied to observed friction rather than cosmetic opinions.",
      tactics: ["Rank hypotheses by expected impact, evidence, and implementation effort.", "Define the primary metric, guardrails, and minimum evidence before launch.", "Document wins, losses, and learnings in a reusable experiment log."],
      measurement: "Measure incremental qualified conversions and pipeline per visitor.",
    },
    quickWins: [
      { title: "Run a conversion friction review", steps: ["Complete the primary conversion on desktop and mobile.", "List clarity, proof, speed, and form issues.", "Fix the most obvious blocker before launching a test."], effort: "Low", duration: "1 day" },
      { title: "Launch one proof-and-CTA experiment", steps: ["Choose the highest-traffic commercial page.", "Add specific outcomes, relevant proof, and one primary CTA.", "Measure qualified conversion rate with a documented baseline."], effort: "Medium", duration: "3-5 days" },
    ],
    resources: ["GA4 funnel exploration", "Microsoft Clarity or Hotjar", "PageSpeed Insights", "Experiment log", "CRM qualification data"],
    prerequisites: ["Reliable conversion tracking", "Meaningful traffic or qualitative evidence", "CRM definition of a qualified conversion"],
    budget: { minimumMonthly: 1000, recommendedMonthly: 4000, rationale: "Covers instrumentation, research, design, and a sustainable testing cadence." },
    cadence: { daily: ["Check broken forms and major tracking drops"], weekly: ["Review funnel drop-off", "Prioritize the next hypothesis", "Audit lead quality with sales"] },
    risks: ["Optimizing form fills instead of qualified pipeline", "Calling tests too early", "Scaling traffic into an unclear or slow page"],
    roadmap: { first30Days: ["Instrument funnel", "Fix obvious friction"], days31To60: ["Run first prioritized experiments", "Segment results by channel"], days61To90: ["Scale winning patterns", "Build ongoing test backlog"] },
  },
  "Email Marketing": {
    basePriority: 76,
    heroStat: { value: "4 flows", label: "Core lifecycle foundation" },
    kpis: ["Activation rate", "Qualified reply rate", "Pipeline influenced", "Deliverability"],
    why: "Lifecycle email converts existing attention into activation, expansion, and pipeline while reinforcing the same proof used across acquisition and sales.",
    pillarOne: {
      title: "{company} lifecycle architecture",
      objective: "Match email timing and content to the buyer or user stage.",
      tactics: ["Define welcome, activation, nurture, and re-engagement flows.", "Segment by ICP, use case, lifecycle stage, and observed product or website behavior.", "Use one primary action per email and suppress irrelevant contacts."],
      measurement: "Track activation, qualified replies, demo progression, and influenced pipeline by flow.",
    },
    pillarTwo: {
      title: "Deliverability and learning loop",
      objective: "Protect inbox placement while improving messages from real buyer behavior.",
      tactics: ["Validate SPF, DKIM, DMARC, list hygiene, consent, and suppression practices.", "Test subject, opening hook, proof, CTA, and timing separately.", "Feed objections and winning proof back into sales, content, and landing pages."],
      measurement: "Monitor delivery, bounce, complaint, reply, conversion, and unsubscribe rates.",
    },
    quickWins: [
      { title: "Map the four essential lifecycle flows", steps: ["Define entry and exit conditions.", "Choose one business outcome for each flow.", "Identify missing emails, events, and suppression rules."], effort: "Low", duration: "1-2 days" },
      { title: "Improve the highest-volume email", steps: ["Review deliverability and downstream conversion.", "Replace generic copy with one pain, proof point, and action.", "Measure qualified behavior rather than opens alone."], effort: "Medium", duration: "3-5 days" },
    ],
    resources: ["Email service provider", "Postmaster tools", "CRM", "Lifecycle map", "Deliverability checklist"],
    prerequisites: ["Consent and suppression rules", "Authenticated sending domain", "Lifecycle events", "CRM or product segmentation"],
    budget: { minimumMonthly: 500, recommendedMonthly: 2500, rationale: "Covers platform costs, deliverability, lifecycle design, and ongoing optimization." },
    cadence: { daily: ["Monitor delivery failures and complaints"], weekly: ["Review conversion by flow", "Audit inactive and unengaged segments", "Test one message variable"] },
    risks: ["Judging success on opens", "Over-mailing unengaged contacts", "Mixing sales outreach with lifecycle communication"],
    roadmap: { first30Days: ["Deliverability audit", "Lifecycle map"], days31To60: ["Launch core flows", "Connect downstream conversion"], days61To90: ["Segment by use case", "Optimize based on activation and pipeline"] },
  },
  "Paid Search": {
    basePriority: 80,
    heroStat: { value: "4 splits", label: "Minimum campaign architecture" },
    kpis: ["Qualified opportunity CPA", "Pipeline ROAS", "Search-term waste", "Landing-page conversion rate"],
    why: "Paid search captures active demand, but its value depends on intent control, conversion quality, landing-page match, and reliable offline feedback from the CRM.",
    pillarOne: {
      title: "{company} intent-controlled search structure",
      objective: "Separate fundamentally different intent so budget and messaging can be managed accurately.",
      tactics: ["Separate brand, non-brand, competitor, and remarketing campaigns.", "Group keywords tightly by buyer problem and landing-page promise.", "Review search terms frequently and maintain shared and campaign-level negatives."],
      measurement: "Track qualified opportunity CPA, pipeline ROAS, and wasted spend by intent group.",
    },
    pillarTwo: {
      title: "Conversion quality and landing-page match",
      objective: "Optimize bidding toward qualified revenue events rather than cheap form fills.",
      tactics: ["Send each intent group to a message-matched landing page.", "Import qualified lead, opportunity, and revenue outcomes where possible.", "Hold automation and broad expansion until tracking and negatives are trustworthy."],
      measurement: "Compare click-to-qualified-opportunity rate and pipeline value by campaign.",
    },
    quickWins: [
      { title: "Build the first search-term control sheet", steps: ["Export recent queries or draft the likely query set.", "Classify brand, problem, category, competitor, research, and irrelevant intent.", "Create the first negative list and matching landing-page map."], effort: "Low", duration: "1 day" },
      { title: "Launch one high-intent campaign", steps: ["Choose one narrow use case.", "Create tightly themed ads and a message-matched page.", "Use qualified conversion tracking and a clear stop-loss threshold."], effort: "Medium", duration: "3-5 days" },
    ],
    resources: ["Google Ads", "Microsoft Ads", "Google Tag Manager", "CRM offline conversions", "Search-term review sheet"],
    prerequisites: ["Qualified conversion tracking", "Message-matched landing page", "Negative keyword process", "Documented CAC payback or unit-economics threshold"],
    budget: { minimumMonthly: 3000, recommendedMonthly: 8000, rationale: "A planning range for a narrow B2B test; validate CPCs and conversion economics before launch." },
    cadence: { daily: ["Review spend spikes and disapprovals", "Check high-cost search terms"], weekly: ["Add negatives", "Review lead quality with CRM data", "Reallocate budget by qualified pipeline"] },
    risks: ["Scaling broad match before conversion quality is reliable", "Mixing brand and non-brand reporting", "Optimizing to unqualified leads"],
    roadmap: { first30Days: ["Tracking and keyword economics", "Launch narrow intent test"], days31To60: ["Expand winning query groups", "Import offline outcomes"], days61To90: ["Test competitors or Microsoft Ads", "Scale only profitable intent segments"] },
  },
  "Paid Social": {
    basePriority: 70,
    heroStat: { value: "3×3", label: "Audience-to-creative test matrix" },
    kpis: ["Qualified pipeline", "Cost per engaged account", "Creative fatigue", "Landing-page conversion rate"],
    why: "Paid social can create and accelerate demand when targeting, creative, proof, and retargeting are treated as a test system rather than a single campaign.",
    pillarOne: {
      title: "{company} audience and creative matrix",
      objective: "Learn which ICP, pain, proof, and format combinations create qualified engagement.",
      tactics: ["Test three audience hypotheses against three distinct creative angles.", "Use founder or expert-led content, proof, problem education, and product demonstrations.", "Keep creative variables clear enough to identify why a concept won."],
      measurement: "Track qualified engagement, account quality, conversion rate, and pipeline by audience-creative cell.",
    },
    pillarTwo: {
      title: "Demand capture and retargeting bridge",
      objective: "Move engaged prospects from platform attention to proof and conversion.",
      tactics: ["Retarget video viewers, site visitors, and high-intent engagers with sequenced proof.", "Match landing pages to the promise and audience.", "Monitor frequency and rotate concepts before fatigue damages performance."],
      measurement: "Measure assisted conversions, retargeting lift, frequency, and qualified pipeline.",
    },
    quickWins: [
      { title: "Create the first 3×3 test matrix", steps: ["Define three ICP or account hypotheses.", "Create three genuinely different hooks.", "Predefine the conversion and quality signal for each test."], effort: "Low", duration: "1-2 days" },
      { title: "Launch one expert-led proof campaign", steps: ["Select a credible founder or subject-matter expert.", "Turn one customer problem and proof point into native content.", "Promote it to a precise audience and retarget engaged viewers."], effort: "Medium", duration: "3-5 days" },
    ],
    resources: ["LinkedIn Campaign Manager", "Meta Ads Manager", "Creative test matrix", "CRM campaign tracking", "Frequency dashboard"],
    prerequisites: ["Three distinct creative concepts", "Precise audience hypothesis", "Conversion and CRM tracking", "Retargeting audience"],
    budget: { minimumMonthly: 3000, recommendedMonthly: 10000, rationale: "Supports multiple creative and audience cells; LinkedIn CPMs may require a higher floor." },
    cadence: { daily: ["Check spend, delivery, disapprovals, and frequency"], weekly: ["Review creative fatigue", "Compare audience quality", "Launch or pause test cells"] },
    risks: ["Judging B2B performance on cheap clicks", "Testing minor visual variations instead of new concepts", "Scaling without message-matched conversion paths"],
    roadmap: { first30Days: ["Audience and creative matrix", "Launch first test cells"], days31To60: ["Build retargeting sequence", "Promote winning expert content"], days61To90: ["Refresh fatigued concepts", "Scale only qualified-pipeline winners"] },
  },
  "Organic Social": {
    basePriority: 66,
    heroStat: { value: "3 pillars", label: "Sustainable editorial foundation" },
    kpis: ["ICP engagement", "Qualified conversations", "Profile-to-site conversion", "Sales-assisted opportunities"],
    why: "Organic social builds familiarity and trust when credible people consistently share useful expertise, proof, and customer insight in a format native to the platform.",
    pillarOne: {
      title: "{company} expert-led editorial system",
      objective: "Make {company}'s expertise visible through consistent, recognizable points of view.",
      tactics: ["Define three content pillars tied to buyer pain, category insight, and proof.", "Build posts from founder, customer, sales, and product knowledge.", "Use native text, document, short video, and conversation formats."],
      measurement: "Track ICP engagement, qualified conversations, profile visits, and assisted opportunities.",
    },
    pillarTwo: {
      title: "Conversation and distribution loop",
      objective: "Turn publishing into relationships rather than one-way reach.",
      tactics: ["Create a focused commenting and relationship-building list.", "Repurpose winning ideas across employees, email, sales, and paid thought-leader formats.", "Respond to high-value engagement with useful follow-up rather than immediate pitching."],
      measurement: "Measure qualified commenters, direct conversations, repeat engagement, and sales usage.",
    },
    quickWins: [
      { title: "Create three editorial pillars", steps: ["List the questions buyers repeatedly ask.", "Choose one problem, proof, and point-of-view pillar.", "Draft one native post for each pillar."], effort: "Low", duration: "1 day" },
      { title: "Start a focused engagement routine", steps: ["Identify 25 customers, prospects, partners, and category voices.", "Leave useful comments on relevant discussions.", "Track conversations that progress into meetings or opportunities."], effort: "Low", duration: "1-2 days" },
    ],
    resources: ["Editorial calendar", "CRM influence tracking", "Employee advocacy guide", "Native analytics", "Conversation tracker"],
    prerequisites: ["Named subject-matter experts", "Clear editorial point of view", "Permission to reuse customer proof"],
    budget: { minimumMonthly: 500, recommendedMonthly: 2500, rationale: "Primarily covers editorial support, repurposing, and expert enablement." },
    cadence: { daily: ["Respond to high-value comments and conversations"], weekly: ["Publish across three pillars", "Review ICP engagement", "Repurpose the strongest idea"] },
    risks: ["Chasing broad reach instead of relevant buyers", "Creating a community group before earning participation", "Publishing generic AI-written posts"],
    roadmap: { first30Days: ["Editorial pillars", "Expert voice and engagement list"], days31To60: ["Consistent publishing and conversation routine", "Repurpose winners"], days61To90: ["Add employee or partner voices", "Measure assisted pipeline"] },
  },
  Retargeting: {
    basePriority: 82,
    heroStat: { value: "5 steps", label: "Recommended message sequence" },
    kpis: ["Incremental conversions", "Qualified visitor return rate", "Frequency", "Cost per opportunity"],
    why: "Retargeting keeps {company} visible during a long buying cycle, but it works best when audiences, exclusions, frequency, and message progression are deliberately controlled.",
    pillarOne: {
      title: "{company} intent-based audience architecture",
      objective: "Separate visitors by intent and recency so budget and messaging match buyer readiness.",
      tactics: ["Segment all visitors, content visitors, high-intent pages, pricing or demo visitors, video viewers, and CRM lists.", "Use 7-, 30-, and 90-day windows where traffic supports them.", "Exclude customers, converters, employees, and irrelevant audiences."],
      measurement: "Track audience size, qualified return visits, conversions, and incremental lift by segment.",
    },
    pillarTwo: {
      title: "Sequential proof and objection handling",
      objective: "Move prospects from problem awareness to credible proof and a clear next step.",
      tactics: ["Sequence problem, proof, product, objection, and CTA messages.", "Coordinate Google, LinkedIn, Meta, YouTube, or other suitable platforms.", "Set frequency caps by recency window and refresh creative before fatigue."],
      measurement: "Measure conversion by sequence stage, frequency, assisted pipeline, and holdout lift where feasible.",
    },
    quickWins: [
      { title: "Build the first audience and exclusion map", steps: ["List high-intent events and pages.", "Create recency windows and conversion exclusions.", "Estimate audience sizes before splitting too narrowly."], effort: "Low", duration: "1 day" },
      { title: "Create a five-message proof sequence", steps: ["Choose one problem, proof point, product demonstration, objection, and CTA.", "Match each message to audience intent.", "Set frequency alerts and a creative refresh date."], effort: "Medium", duration: "3-5 days" },
    ],
    resources: ["Google Ads", "LinkedIn Insight Tag", "Meta Pixel/CAPI", "GA4 audiences", "CRM lists"],
    prerequisites: ["Consent-compliant audience tracking", "Conversion exclusions", "Enough audience volume", "Multiple proof-led creatives"],
    budget: { minimumMonthly: 500, recommendedMonthly: 2500, rationale: "Start with controlled budgets across the platforms where audience volume already exists." },
    cadence: { daily: ["Watch frequency and delivery anomalies"], weekly: ["Review segment conversion quality", "Refresh fatigued creative", "Audit exclusions and audience overlap"] },
    risks: ["Over-frequency", "Claiming view-through conversions as fully incremental", "Retargeting low-intent traffic with the same hard CTA"],
    roadmap: { first30Days: ["Audience and exclusion map", "Launch basic proof retargeting"], days31To60: ["Add message sequence", "Expand to a second suitable platform"], days61To90: ["Test holdouts or incrementality", "Optimize by qualified opportunity"] },
  },
  Community: {
    basePriority: 58,
    heroStat: { value: "10 members", label: "Founding cohort target" },
    kpis: ["Active qualified members", "Meaningful contributions", "Product feedback", "Community-influenced pipeline"],
    why: "Community can create durable trust and feedback when it begins with a narrow recurring need and member value, not an empty branded group.",
    pillarOne: {
      title: "{company} community wedge",
      objective: "Start with one high-value recurring problem that qualified members want to solve together.",
      tactics: ["Interview prospective members before choosing a platform.", "Recruit a small founding cohort personally.", "Design a recurring ritual such as office hours, teardown, benchmark, or peer roundtable."],
      measurement: "Track active qualified members, repeat participation, and member-created contributions.",
    },
    pillarTwo: {
      title: "Member value and feedback loop",
      objective: "Turn participation into useful peer value, product insight, and earned advocacy.",
      tactics: ["Create clear moderation and participation norms.", "Capture recurring questions for product, content, and sales enablement.", "Recognize member expertise without turning every interaction into promotion."],
      measurement: "Measure retention, contributions, referrals, feedback implemented, and influenced opportunities.",
    },
    quickWins: [
      { title: "Validate the community wedge", steps: ["Interview five prospective members.", "Identify the recurring problem they would return to solve.", "Choose a lightweight recurring format before opening a group."], effort: "Low", duration: "3-5 days" },
      { title: "Recruit a founding cohort", steps: ["Invite ten qualified customers, prospects, or partners personally.", "Host one focused session.", "Ask what would make the next session worth attending."], effort: "Medium", duration: "1 week" },
    ],
    resources: ["Member interview guide", "Slack or Circle", "Event platform", "Community health tracker", "Moderation guide"],
    prerequisites: ["Validated recurring member need", "Named community owner", "Founding member list", "Participation ritual"],
    budget: { minimumMonthly: 500, recommendedMonthly: 3000, rationale: "Community cost is driven more by owner time and programming than platform fees." },
    cadence: { daily: ["Respond to member questions and moderate"], weekly: ["Run or prepare one member ritual", "Review participation quality", "Share feedback with product and sales"] },
    risks: ["Launching an empty branded group", "Measuring member count instead of participation", "Using community primarily as a lead list"],
    roadmap: { first30Days: ["Member interviews", "Founding cohort and ritual"], days31To60: ["Run recurring programming", "Capture feedback themes"], days61To90: ["Add member-led contributions", "Measure retention and influence"] },
  },
  ABM: {
    basePriority: 73,
    heroStat: { value: "3 tiers", label: "Recommended account model" },
    kpis: ["Engaged target accounts", "Account penetration", "Qualified meetings", "Pipeline per account"],
    why: "ABM fits concentrated enterprise markets when account selection, personalization, media, and sales actions are coordinated around evidence rather than aspirational logo lists.",
    pillarOne: {
      title: "{company} account selection and tiering",
      objective: "Focus resources on accounts with fit, need, timing, and access.",
      tactics: ["Define tier-one, tier-two, and programmatic account criteria.", "Use firmographic fit, technology, trigger events, engagement, and relationship signals.", "Document the buying committee and likely operational pain for priority accounts."],
      measurement: "Track account coverage, engaged roles, meetings, and pipeline per account tier.",
    },
    pillarTwo: {
      title: "Coordinated account plays",
      objective: "Align content, advertising, outbound, partners, and sales around account-specific evidence.",
      tactics: ["Create tier-appropriate personalization rather than custom pages for every account.", "Sequence awareness, proof, executive outreach, and sales follow-up.", "Hold weekly sales-marketing account reviews with next actions and owners."],
      measurement: "Measure account progression, buying-group engagement, meetings, and sourced or influenced pipeline.",
    },
    quickWins: [
      { title: "Build a 25-account pilot", steps: ["Define evidence-based fit and timing criteria.", "Score 25 accounts and identify known relationships.", "Assign one hypothesis and next action per account."], effort: "Low", duration: "2-3 days" },
      { title: "Launch one coordinated account play", steps: ["Select five tier-one accounts.", "Create one relevant proof asset and outreach angle.", "Coordinate media, relationship, and sales follow-up for two weeks."], effort: "Medium", duration: "1 week" },
    ],
    resources: ["CRM account views", "Intent and firmographic data", "LinkedIn Campaign Manager", "Account plan template", "Sales engagement platform"],
    prerequisites: ["Evidence-based account criteria", "Sales ownership", "Buying-group data", "Relevant proof assets"],
    budget: { minimumMonthly: 5000, recommendedMonthly: 15000, rationale: "ABM requires data, media, content, and coordinated sales capacity; start with a small account pilot." },
    cadence: { daily: ["Respond to high-intent account signals"], weekly: ["Review account progression with sales", "Update contacts and next actions", "Shift spend toward engaged qualified accounts"] },
    risks: ["Targeting Fortune 1000 accounts without evidence", "Calling display advertising ABM", "Personalizing before validating account fit"],
    roadmap: { first30Days: ["Account criteria and pilot list", "Buying-group coverage"], days31To60: ["Launch coordinated pilot plays", "Review sales progression"], days61To90: ["Expand winning account patterns", "Measure pipeline per tier"] },
  },
  Partnerships: {
    basePriority: 68,
    heroStat: { value: "10 partners", label: "Initial recruitment list" },
    kpis: ["Partner-sourced pipeline", "Activated partners", "Referral conversion rate", "Time to first referral"],
    why: "Partnerships can add trusted distribution and implementation leverage when partner economics, audience overlap, enablement, and attribution are explicit.",
    pillarOne: {
      title: "{company} partner portfolio",
      objective: "Prioritize partner types that reach the same buyer with a complementary reason to collaborate.",
      tactics: ["Map integration, services, referral, affiliate, technology, and content partners.", "Score audience overlap, strategic fit, activation effort, and revenue potential.", "Start with partners where a warm relationship or shared customer already exists."],
      measurement: "Track recruited, activated, and productive partners plus sourced pipeline.",
    },
    pillarTwo: {
      title: "Partner activation system",
      objective: "Make it easy for partners to explain, refer, and co-sell {company}.",
      tactics: ["Define incentive, rules of engagement, lead ownership, and attribution.", "Provide proof, positioning, referral assets, and a clear first campaign.", "Review inactive partners and recruit replacements continuously."],
      measurement: "Measure activation rate, first-referral time, conversion, and partner-sourced revenue.",
    },
    quickWins: [
      { title: "Build a ten-partner target list", steps: ["Choose two complementary partner types.", "Score ten candidates for overlap and activation likelihood.", "Write a specific mutual-value hypothesis for each."], effort: "Low", duration: "1-2 days" },
      { title: "Design the first partner activation kit", steps: ["Create a one-page positioning and proof summary.", "Define referral process, attribution, and incentive.", "Package one co-marketing or co-selling play."], effort: "Medium", duration: "3-5 days" },
    ],
    resources: ["Partner CRM", "Referral tracking", "Enablement kit", "Co-marketing brief", "Partner scorecard"],
    prerequisites: ["Clear partner value exchange", "Referral attribution", "Enablement owner", "Proof of customer value"],
    budget: { minimumMonthly: 1000, recommendedMonthly: 5000, rationale: "Excludes commissions; supports recruitment, enablement, co-marketing, and partner operations." },
    cadence: { daily: [], weekly: ["Recruit new candidates", "Follow up with inactive partners", "Review sourced opportunities and next actions"] },
    risks: ["Signing partners without activation plans", "Relying on last-click coupon behavior", "Leaving attribution and lead ownership ambiguous"],
    roadmap: { first30Days: ["Partner portfolio and target list", "Program economics"], days31To60: ["Recruit and activate first partners", "Launch first joint play"], days61To90: ["Double down on productive partner types", "Improve attribution and enablement"] },
  },
  Outbound: {
    basePriority: 74,
    heroStat: { value: "3 triggers", label: "Minimum signal-based sequence" },
    kpis: ["Positive reply rate", "Qualified meeting rate", "Opportunity rate", "Deliverability"],
    why: "Outbound works when lists, timing, relevance, deliverability, and human follow-up are strong enough to create qualified conversations rather than simply send volume.",
    pillarOne: {
      title: "{company} signal-based prospecting",
      objective: "Contact accounts when fit and timing create a credible reason to engage.",
      tactics: ["Define ICP exclusions as clearly as inclusions.", "Use trigger events, technology, hiring, funding, operational change, or demonstrated intent.", "Research only the details needed to form a relevant business hypothesis."],
      measurement: "Track positive reply, qualified meeting, and opportunity rates by signal and segment.",
    },
    pillarTwo: {
      title: "Deliverable multi-touch sequence",
      objective: "Combine useful email, calls, social touches, and proof without sacrificing reputation.",
      tactics: ["Authenticate domains, warm infrastructure, validate contacts, and control send volume.", "Write concise messages around one pain, hypothesis, proof point, and low-friction next step.", "Use replies and objections to improve targeting and messaging weekly."],
      measurement: "Monitor delivery, bounce, spam complaints, positive replies, meetings, and pipeline.",
    },
    quickWins: [
      { title: "Build a 50-account signal pilot", steps: ["Choose one narrow segment and three timing signals.", "Validate contacts and remove obvious non-fit accounts.", "Write a specific hypothesis for each signal group."], effort: "Low", duration: "2-3 days" },
      { title: "Launch a human-reviewed sequence", steps: ["Create email, call, and social touches around one proof point.", "Set conservative volume and deliverability alerts.", "Review every reply and qualification outcome after the first week."], effort: "Medium", duration: "1 week" },
    ],
    resources: ["CRM", "Sales engagement platform", "Email verification", "Deliverability monitoring", "Call and reply review sheet"],
    prerequisites: ["Clear ICP and exclusions", "Verified contact data", "Authenticated sending infrastructure", "Relevant proof"],
    budget: { minimumMonthly: 1500, recommendedMonthly: 6000, rationale: "Covers data, tooling, deliverability, research, and human execution; excludes sales compensation." },
    cadence: { daily: ["Monitor bounce and reply quality", "Respond quickly to positive replies"], weekly: ["Review segment and signal performance", "Update objections and copy", "Remove low-quality data sources"] },
    risks: ["Scaling volume before positive reply quality", "Using generic personalization", "Damaging domain reputation", "Counting meetings without opportunity quality"],
    roadmap: { first30Days: ["Infrastructure and signal pilot", "Launch conservative sequence"], days31To60: ["Refine segments and proof", "Add coordinated calls and social"], days61To90: ["Scale winning signals", "Connect opportunity feedback to targeting"] },
  },
};

function asChannelId(channelId: string): ChannelId {
  return CHANNEL_IDS.find((id) => id.toLowerCase() === channelId.toLowerCase()) || "Content";
}

function hydrate(value: string, company: string, motion: string): string {
  return value.replaceAll("{company}", company).replaceAll("{motion}", motion);
}

function priorityLabel(score: number): "High" | "Medium" | "Low" {
  if (score >= 78) return "High";
  if (score >= 58) return "Medium";
  return "Low";
}

export function calculatePriorityScore(channelId: string, gtmMotion: string, siteProfile?: SiteProfile | null): number {
  const id = asChannelId(channelId);
  let score = PLAYBOOKS[id].basePriority;
  const motion = gtmMotion.toLowerCase();
  const salesLed = ["Paid Search", "CRO", "ABM", "Partnerships", "Outbound", "Retargeting"];
  const productLed = ["SEO", "Content", "LLMs", "CRO", "Email Marketing", "Organic Social"];

  if (motion.includes("sales") && salesLed.includes(id)) score += 8;
  if ((motion.includes("product") || motion.includes("plg")) && productLed.includes(id)) score += 8;
  if (siteProfile?.existingChannels.some((channel) => channel.channel.toLowerCase().includes(id.toLowerCase()))) score += 4;
  if (!siteProfile?.icpDetails?.persona && ["ABM", "Outbound", "Paid Social"].includes(id)) score -= 8;

  return Math.max(0, Math.min(100, score));
}

const CHANNEL_EXPERT_GUIDANCE: Record<ChannelId, string> = {
  SEO: "Include technical readiness, commercial query architecture, internal linking, proof-led content, authority building, and qualified organic conversion measurement.",
  Content: "Include buyer questions, proof assets, distribution ownership, repurposing, conversion paths, and content-assisted pipeline measurement.",
  LLMs: "Include a repeatable prompt benchmark, citation and mention tracking, topic coverage, entity consistency, third-party authority, and citation-ready source pages. Treat numeric targets as heuristics unless sourced.",
  CRO: "Include funnel instrumentation, observed friction, hypothesis prioritization, experiment guardrails, lead quality, and pipeline per visitor.",
  "Email Marketing": "Include lifecycle triggers, segmentation, suppression, deliverability, message testing, activation, qualified replies, and influenced pipeline.",
  "Paid Search": "Include brand/non-brand/competitor/remarketing separation, search-term reviews, negatives, landing-page match, offline conversion imports, stop-loss logic, and pipeline ROAS.",
  "Paid Social": "Include an audience-to-creative matrix, distinct concepts, thought-leader or proof formats, retargeting, frequency, fatigue, and qualified account measurement.",
  "Organic Social": "Include expert-led editorial pillars, native formats, conversation routines, repurposing, ICP engagement, and sales-assisted outcomes.",
  Retargeting: "Include intent and recency segments, exclusions, multi-platform sequencing, frequency caps, creative rotation, and incrementality caveats.",
  Community: "Validate the community wedge before launching a group; include founding cohort recruitment, recurring rituals, moderation, member contributions, and retention.",
  ABM: "Include evidence-based account tiers, buying groups, signals, coordinated sales and marketing plays, account progression, and pipeline per tier.",
  Partnerships: "Include partner portfolio, mutual value, program economics, enablement, activation, lead ownership, attribution, and partner-sourced revenue.",
  Outbound: "Include ICP exclusions, trigger events, data quality, authentication and deliverability, multi-touch sequence design, reply qualification, and opportunity feedback.",
};

export function getChannelExpertGuidance(channels: string[]): string {
  return channels
    .map((channel) => {
      const id = asChannelId(channel);
      return `- ${id}: ${CHANNEL_EXPERT_GUIDANCE[id]}`;
    })
    .join("\n");
}

interface QualityScorableInsight {
  topKpis?: unknown[] | null;
  strategicPillars?: Array<{ tactics: string[]; measurement: string }> | null;
  quickWins?: Array<{ steps: string[] }> | null;
  strategyMeta?: ChannelInsightStrategyMeta | null;
}

export function scoreChannelInsightQuality(insight: QualityScorableInsight, companyName: string): { score: number; issues: string[] } {
  let score = 0;
  const issues: string[] = [];
  const combined = JSON.stringify(insight).toLowerCase();

  if (combined.includes(companyName.toLowerCase())) score += 15;
  else issues.push("Company name is not used in the strategy.");

  if ((insight.topKpis?.length || 0) >= 3) score += 10;
  else issues.push("Fewer than three KPIs.");

  if ((insight.strategicPillars?.length || 0) >= 2) score += 15;
  else issues.push("Fewer than two strategic pillars.");

  if (insight.strategicPillars?.every((pillar) => pillar.tactics.length >= 3 && pillar.measurement)) score += 15;
  else issues.push("Pillars need at least three tactics and a measurement.");

  if ((insight.quickWins?.length || 0) >= 2 && insight.quickWins?.every((win) => win.steps.length >= 3)) score += 15;
  else issues.push("Quick wins need two complete execution checklists.");

  if ((insight.strategyMeta?.prerequisites.length || 0) >= 2) score += 10;
  else issues.push("Prerequisites are missing.");

  if ((insight.strategyMeta?.risks.length || 0) >= 2) score += 10;
  else issues.push("Risks and watchouts are missing.");

  if (insight.strategyMeta?.roadmap.first30Days.length && insight.strategyMeta.roadmap.days31To60.length && insight.strategyMeta.roadmap.days61To90.length) score += 10;
  else issues.push("The 30/60/90 roadmap is incomplete.");

  return { score, issues };
}

export function buildStrategyMeta(
  channelId: string,
  companyName: string,
  companySummary: string,
  gtmMotion: string,
  siteProfile: SiteProfile | null | undefined,
  status: ChannelInsightGenerationStatus,
  fallbackReason?: string,
  model?: string,
): ChannelInsightStrategyMeta {
  const id = asChannelId(channelId);
  const playbook = PLAYBOOKS[id];
  const priorityScore = calculatePriorityScore(id, gtmMotion, siteProfile);
  const summaryClaim = companySummary
    ? `${companyName} positioning used for this strategy: ${companySummary.slice(0, 180)}${companySummary.length > 180 ? "..." : ""}`
    : `${companyName}'s positioning should be verified before this strategy is scaled.`;

  return {
    confidence: status === "generated" ? 78 : 58,
    qualityScore: 0,
    priorityScore,
    priorityRationale: `${id} scored ${priorityScore}/100 based on channel economics, ${gtmMotion || "the detected GTM motion"}, current evidence, and execution prerequisites.`,
    isTopChannel: false,
    evidence: [
      {
        claim: summaryClaim,
        source: status === "generated" ? `${companyName} website analysis` : "Available company analysis",
        sourceType: companySummary ? "website" : "assumption",
        confidence: companySummary ? 75 : 45,
      },
      {
        claim: `${id} operating guidance follows a channel-specific GTM Champion playbook and must be validated against actual economics.`,
        source: "GTM Champion channel playbook",
        sourceType: "best-practice",
        confidence: 80,
      },
    ],
    prerequisites: [...playbook.prerequisites],
    budgetGuidance: {
      minimumMonthly: playbook.budget.minimumMonthly,
      recommendedMonthly: playbook.budget.recommendedMonthly,
      currency: "USD",
      rationale: playbook.budget.rationale,
    },
    cadence: { daily: [...playbook.cadence.daily], weekly: [...playbook.cadence.weekly] },
    risks: [...playbook.risks],
    roadmap: {
      first30Days: [...playbook.roadmap.first30Days],
      days31To60: [...playbook.roadmap.days31To60],
      days61To90: [...playbook.roadmap.days61To90],
    },
    qualityIssues: [],
    ...(fallbackReason ? { fallbackReason } : {}),
    ...(model ? { model } : {}),
  };
}

export function buildFallbackChannelInsight(
  channelId: string,
  companyName: string,
  companySummary: string,
  gtmMotion: string,
  siteProfile?: SiteProfile | null,
  fallbackReason = "The personalized AI strategy was unavailable, so a channel-specific recovery playbook is shown.",
): ChannelInsightDraft {
  const id = asChannelId(channelId);
  const company = companyName || "Your Company";
  const motion = gtmMotion || "the detected GTM motion";
  const playbook = PLAYBOOKS[id];
  const strategyMeta = buildStrategyMeta(id, company, companySummary, motion, siteProfile, "fallback", fallbackReason);
  const priorityScore = strategyMeta.priorityScore;

  const insight: ChannelInsightDraft = {
    channelId: id,
    priority: priorityLabel(priorityScore),
    whyItMatters: `${hydrate(playbook.why, company, motion)} For ${company}, treat this as a planning playbook until actual channel economics and conversion quality confirm the fit.`,
    companyFitSummary: `Use ${id} to support ${motion} only after the listed prerequisites are in place. The plan is anchored to the available positioning for ${company}: ${companySummary.slice(0, 180)}${companySummary.length > 180 ? "..." : ""}`,
    heroStat: { ...playbook.heroStat },
    topKpis: [...playbook.kpis],
    strategicPillars: [playbook.pillarOne, playbook.pillarTwo].map((pillar) => ({
      title: hydrate(pillar.title, company, motion),
      objective: hydrate(pillar.objective, company, motion),
      tactics: pillar.tactics.map((tactic) => hydrate(tactic, company, motion)),
      measurement: hydrate(pillar.measurement, company, motion),
    })),
    quickWins: playbook.quickWins.map((win) => ({
      ...win,
      title: hydrate(win.title, company, motion),
      steps: win.steps.map((step) => hydrate(step, company, motion)),
    })),
    resources: [...playbook.resources],
    generationStatus: "fallback",
    strategyMeta,
  };

  const quality = scoreChannelInsightQuality(insight, company);
  insight.strategyMeta.qualityScore = quality.score;
  insight.strategyMeta.qualityIssues = quality.issues;
  return insight;
}

export function enrichGeneratedChannelInsight(
  insight: Omit<ChannelInsightDraft, "generationStatus" | "strategyMeta"> & {
    strategyMeta?: Partial<ChannelInsightStrategyMeta>;
  },
  companyName: string,
  companySummary: string,
  gtmMotion: string,
  siteProfile?: SiteProfile | null,
  model?: string,
): ChannelInsightDraft {
  const defaults = buildStrategyMeta(insight.channelId, companyName, companySummary, gtmMotion, siteProfile, "generated", undefined, model);
  const supplied = insight.strategyMeta || {};
  const strategyMeta: ChannelInsightStrategyMeta = {
    ...defaults,
    ...supplied,
    evidence: supplied.evidence?.length ? supplied.evidence : defaults.evidence,
    prerequisites: supplied.prerequisites?.length ? supplied.prerequisites : defaults.prerequisites,
    budgetGuidance: { ...defaults.budgetGuidance, ...(supplied.budgetGuidance || {}) },
    cadence: {
      daily: supplied.cadence?.daily?.length ? supplied.cadence.daily : defaults.cadence.daily,
      weekly: supplied.cadence?.weekly?.length ? supplied.cadence.weekly : defaults.cadence.weekly,
    },
    risks: supplied.risks?.length ? supplied.risks : defaults.risks,
    roadmap: {
      first30Days: supplied.roadmap?.first30Days?.length ? supplied.roadmap.first30Days : defaults.roadmap.first30Days,
      days31To60: supplied.roadmap?.days31To60?.length ? supplied.roadmap.days31To60 : defaults.roadmap.days31To60,
      days61To90: supplied.roadmap?.days61To90?.length ? supplied.roadmap.days61To90 : defaults.roadmap.days61To90,
    },
    qualityIssues: [],
  };

  const completed: ChannelInsightDraft = {
    ...insight,
    generationStatus: "generated",
    strategyMeta,
  };
  const quality = scoreChannelInsightQuality(completed, companyName);
  completed.strategyMeta.qualityScore = quality.score;
  completed.strategyMeta.qualityIssues = quality.issues;
  completed.strategyMeta.confidence = Math.min(completed.strategyMeta.confidence, quality.score);
  return completed;
}

export function markTopChannels<T extends { channelId: string; strategyMeta: ChannelInsightStrategyMeta }>(insights: T[]): T[] {
  const topIds = new Set(
    [...insights]
      .sort((a, b) => b.strategyMeta.priorityScore - a.strategyMeta.priorityScore)
      .slice(0, 3)
      .map((insight) => insight.channelId),
  );

  return insights.map((insight) => ({
    ...insight,
    strategyMeta: {
      ...insight.strategyMeta,
      isTopChannel: topIds.has(insight.channelId),
    },
  }));
}

export function buildCrossChannelStrategyPlan(
  insights: Array<{ channelId: string; strategyMeta?: ChannelInsightStrategyMeta | null }>,
  companyName: string,
): CrossChannelStrategyPlan {
  const ranked = insights
    .filter((insight): insight is { channelId: string; strategyMeta: ChannelInsightStrategyMeta } => Boolean(insight.strategyMeta))
    .sort((a, b) => b.strategyMeta.priorityScore - a.strategyMeta.priorityScore);
  const top = ranked.slice(0, 3);
  const topNames = top.map((insight) => insight.channelId);

  return {
    topChannelIds: topNames,
    executiveSummary: topNames.length
      ? `${companyName} should concentrate the next 90 days on ${topNames.join(", ")} while treating the remaining channels as supporting or later-stage plays.`
      : `${companyName} should validate tracking, ICP, conversion readiness, and channel economics before spreading effort across all channels.`,
    firstPriority: top[0]
      ? `${top[0].channelId}: ${top[0].strategyMeta.priorityRationale}`
      : "Validate the ICP, conversion path, and measurement foundation.",
    prerequisites: Array.from(new Set(top.flatMap((insight) => insight.strategyMeta.prerequisites))).slice(0, 6),
    roadmap: {
      first30Days: Array.from(new Set(top.flatMap((insight) => insight.strategyMeta.roadmap.first30Days))).slice(0, 6),
      days31To60: Array.from(new Set(top.flatMap((insight) => insight.strategyMeta.roadmap.days31To60))).slice(0, 6),
      days61To90: Array.from(new Set(top.flatMap((insight) => insight.strategyMeta.roadmap.days61To90))).slice(0, 6),
    },
  };
}
