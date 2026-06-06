import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, boolean, integer, jsonb, json, index, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  companyUrl: text("company_url").notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  agentEnabled: boolean("agent_enabled").default(true).notNull(),
  slackWebhookUrl: text("slack_webhook_url"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export interface SiteProfile {
  productNames: string[];
  primaryCategory: string;
  features: string[];
  pricingTiers: Array<{ name: string; price: string; details: string }>;
  testimonials: Array<{ quote: string; author: string; role?: string }>;
  competitors: string[];
  brandVoice: string;
  existingChannels: Array<{ channel: string; url?: string; status: string }>;
  icpDetails: { persona: string; companySize: string; industry: string; painPoints: string[] };
  contentGaps: string[];
  keyDifferentiators: string[];
}

export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    url: text("url").notNull(),
    name: text("name"),
    summary: text("summary"),
    gtmMotion: text("gtm_motion"),
    icpScore: integer("icp_score"),
    screenshotUrl: text("screenshot_url"),
    visualAnalysis: text("visual_analysis"),
    pageSpeedData: jsonb("page_speed_data").$type<{
      performanceScore: number;
      coreWebVitals: {
        lcp: { value: number; rating: string };
        fid: { value: number; rating: string };
        cls: { value: number; rating: string };
        inp: { value: number; rating: string };
        fcp: { value: number; rating: string };
        ttfb: { value: number; rating: string };
      };
      opportunities: Array<{
        title: string;
        description: string;
        savings: string;
      }>;
    }>(),
    siteProfile: jsonb("site_profile").$type<SiteProfile>(),
    lastScraped: timestamp("last_scraped").defaultNow().notNull(),
    lastReanalyzedAt: timestamp("last_reanalyzed_at"),
  },
  (table) => ({
    userIdx: index("companies_user_id_idx").on(table.userId),
  })
);

export const strategySnapshots = pgTable(
  "strategy_snapshots",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    label: text("label"),
    snapshot: jsonb("snapshot").notNull().$type<{
      company: Record<string, unknown>;
      recommendations: Array<Record<string, unknown>>;
      channelInsights: Array<Record<string, unknown>>;
      weeklyIdeas: Array<Record<string, unknown>>;
      personas?: Array<Record<string, unknown>>;
      budget?: Record<string, unknown> | null;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("strategy_snapshots_user_id_idx").on(table.userId),
    companyIdx: index("strategy_snapshots_company_id_idx").on(table.companyId),
  })
);

export const recommendations = pgTable(
  "recommendations",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
    category: text("category").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    impact: text("impact").notNull(),
    effort: text("effort").notNull(),
    status: text("status").default("New").notNull(),
    gtmFunnel: text("gtm_funnel").default("both"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index("recommendations_company_id_idx").on(table.companyId),
  })
);

export const weeklyIdeas = pgTable(
  "weekly_ideas",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: text("type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index("weekly_ideas_company_id_idx").on(table.companyId),
  })
);

export const channelInsights = pgTable(
  "channel_insights",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
    channelId: text("channel_id").notNull(),
    priority: text("priority").notNull(),
    whyItMatters: text("why_it_matters").notNull(),
    companyFitSummary: text("company_fit_summary").notNull(),
    heroStat: jsonb("hero_stat").notNull().$type<{ value: string; label: string }>(),
    topKpis: jsonb("top_kpis").notNull().$type<string[]>(),
    strategicPillars: jsonb("strategic_pillars").notNull().$type<Array<{
      title: string;
      objective: string;
      tactics: string[];
      measurement: string;
    }>>(),
    quickWins: jsonb("quick_wins").notNull().$type<Array<{
      title: string;
      steps: string[];
      effort: string;
      duration: string;
    }>>(),
    resources: jsonb("resources").notNull().$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index("channel_insights_company_id_idx").on(table.companyId),
    companyChannelIdx: index("channel_insights_company_channel_idx").on(table.companyId, table.channelId),
  })
);

export const userIntegrations = pgTable(
  "user_integrations",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    integrationId: text("integration_id").notNull(),
    integrationName: text("integration_name").notNull(),
    isConnected: boolean("is_connected").default(false).notNull(),
    connectedAt: timestamp("connected_at"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("user_integrations_user_id_idx").on(table.userId),
    userIntegrationIdx: index("user_integrations_user_integration_idx").on(table.userId, table.integrationId),
  })
);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isPremium: true,
  isAdmin: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
}).extend({
  fullName: z.string().min(1, "Full name is required").max(200, "Full name must be 200 characters or less"),
  email: z.string().email("Invalid email address").max(254, "Email must be 254 characters or less"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be 128 characters or less"),
  companyUrl: z.string().url("Invalid company URL").max(2048, "URL must be 2048 characters or less"),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  lastScraped: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyIdeaSchema = createInsertSchema(weeklyIdeas).omit({
  id: true,
  createdAt: true,
});

export const insertChannelInsightSchema = createInsertSchema(channelInsights).omit({
  id: true,
  createdAt: true,
});

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text("endpoint").notNull(),
    keys: jsonb("keys").notNull().$type<{ p256dh: string; auth: string }>(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("push_subscriptions_user_id_idx").on(table.userId),
  })
);

export const budgetAllocations = pgTable(
  "budget_allocations",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
    totalBudget: integer("total_budget").notNull(),
    allocations: jsonb("allocations").notNull().$type<Array<{
      channelId: string;
      channelName: string;
      amount: number;
      percentage: number;
      rationale: string;
    }>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index("budget_allocations_company_id_idx").on(table.companyId),
  })
);

export const buyerPersonas = pgTable(
  "buyer_personas",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    jobTitle: text("job_title").notNull(),
    seniority: text("seniority").notNull(),
    department: text("department").notNull(),
    companySizeRange: text("company_size_range").notNull(),
    industryVerticals: text("industry_verticals").array().notNull(),
    geographicFocus: text("geographic_focus").notNull(),
    painPoints: text("pain_points").array().notNull(),
    goals: text("goals").array().notNull(),
    buyingTriggers: text("buying_triggers").array().notNull(),
    preferredChannels: text("preferred_channels").array().notNull(),
    objections: text("objections").array().notNull(),
    dayInTheLife: text("day_in_the_life").notNull(),
    messagingAngle: text("messaging_angle").notNull().default(""),
    contentPreferences: text("content_preferences").array().notNull().default([]),
    buyerJourneyStage: jsonb("buyer_journey_stage").notNull().default({}),
    internalChampionTips: text("internal_champion_tips").notNull().default(""),
    socialProofNeeded: text("social_proof_needed").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index("buyer_personas_company_id_idx").on(table.companyId),
  })
);

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertBudgetAllocationSchema = createInsertSchema(budgetAllocations).omit({
  id: true,
  createdAt: true,
});

export const insertBuyerPersonaSchema = createInsertSchema(buyerPersonas).omit({
  id: true,
  createdAt: true,
});

export const insertUserIntegrationSchema = createInsertSchema(userIntegrations).omit({
  id: true,
  createdAt: true,
  connectedAt: true,
});

export const insertStrategySnapshotSchema = createInsertSchema(strategySnapshots).omit({
  id: true,
  createdAt: true,
});

export const agentEvents = pgTable("agent_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: text("event_type").notNull(),
  channelId: text("channel_id"),
  recommendationId: integer("recommendation_id"),
  channel: text("channel").notNull().default("email"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const scheduledNudges = pgTable("scheduled_nudges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  channelId: text("channel_id").notNull(),
  recommendationId: integer("recommendation_id"),
  nudgeType: text("nudge_type").notNull().default("stall"),
  dueAt: timestamp("due_at").notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentEventSchema = createInsertSchema(agentEvents).omit({
  id: true,
  sentAt: true,
});

export const insertScheduledNudgeSchema = createInsertSchema(scheduledNudges).omit({
  id: true,
  sentAt: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

export type InsertWeeklyIdea = z.infer<typeof insertWeeklyIdeaSchema>;
export type WeeklyIdea = typeof weeklyIdeas.$inferSelect;

export type InsertChannelInsight = z.infer<typeof insertChannelInsightSchema>;
export type ChannelInsight = typeof channelInsights.$inferSelect;

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export type InsertBudgetAllocation = z.infer<typeof insertBudgetAllocationSchema>;
export type BudgetAllocation = typeof budgetAllocations.$inferSelect;

export type InsertBuyerPersona = z.infer<typeof insertBuyerPersonaSchema>;
export type BuyerPersona = typeof buyerPersonas.$inferSelect;

export type InsertUserIntegration = z.infer<typeof insertUserIntegrationSchema>;
export type UserIntegration = typeof userIntegrations.$inferSelect;

export type InsertStrategySnapshot = z.infer<typeof insertStrategySnapshotSchema>;
export type StrategySnapshot = typeof strategySnapshots.$inferSelect;

export type InsertAgentEvent = z.infer<typeof insertAgentEventSchema>;
export type AgentEvent = typeof agentEvents.$inferSelect;

export type InsertScheduledNudge = z.infer<typeof insertScheduledNudgeSchema>;
export type ScheduledNudge = typeof scheduledNudges.$inferSelect;

// Runtime-managed tables. Declared here so `drizzle-kit push` does not try to
// drop them. The runtime "CREATE TABLE IF NOT EXISTS" calls in
// server/index.ts (session, via connect-pg-simple) and
// server/routes/rateLimitStore.ts (rate_limit_store) still create them on
// fresh databases; declaring them here keeps drizzle aware of their shape.
export const session = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey().notNull(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6, mode: "date" }).notNull(),
  },
  (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire),
  })
);

export const rateLimitStore = pgTable(
  "rate_limit_store",
  {
    key: varchar("key", { length: 255 }).notNull(),
    prefix: varchar("prefix", { length: 50 }).notNull(),
    hits: integer("hits").notNull().default(1),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.key, table.prefix] }),
  })
);

export type ChannelInsightHeroStat = { value: string; label: string };
export type ChannelInsightStrategicPillar = {
  title: string;
  objective: string;
  tactics: string[];
  measurement: string;
};
export type ChannelInsightQuickWin = {
  title: string;
  steps: string[];
  effort: string;
  duration: string;
};

export const chatRequestSchema = z.object({
  question: z.string().min(1, "Question is required").max(2000, "Question must be 2000 characters or less"),
  channelId: z.string().max(100).optional(),
});

export const linkedInPostRequestSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(500),
  tone: z.enum(["thought-leader", "educational", "storytelling", "promotional"]),
  authorRole: z.string().min(1, "Author role is required").max(200),
});

export const emailCampaignRequestSchema = z.object({
  campaignType: z.enum(["welcome", "nurture", "promotional", "re-engagement"]),
  emailCount: z.number().int().min(1).max(10),
  goal: z.string().min(1, "Goal is required").max(500),
});

export const blogArticleRequestSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(500),
  targetKeyword: z.string().min(1, "Target keyword is required").max(200),
  articleType: z.enum(["how-to", "listicle", "thought-leadership", "case-study"]),
});

export const icpUpdateSchema = z.object({
  persona: z.string().max(500).optional(),
  companySize: z.string().max(200).optional(),
  industry: z.string().max(200).optional(),
  painPoints: z.array(z.string().max(200)).max(20).optional(),
});

export const inviteFriendSchema = z.object({
  toEmail: z.string().email("Valid email is required").max(254),
  toName: z.string().max(100).optional().default(""),
});

export const shareStrategySchema = z.object({
  toEmail: z.string().email("Valid email is required").max(254),
  toName: z.string().max(100).optional().default(""),
  channelId: z.string().min(1, "Channel is required").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email").max(254),
  password: z.string().min(1, "Password is required").max(128),
});

export const recommendationStatusSchema = z.object({
  status: z.string().min(1, "Status is required").max(50),
});

export const checkoutSchema = z.object({
  priceId: z.string().min(1, "priceId is required"),
});

export const integrationUpdateSchema = z.object({
  integrationName: z.string().min(1).max(200),
  isConnected: z.boolean(),
});

export const agentSettingsSchema = z.object({
  agentEnabled: z.boolean(),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

export const budgetAllocationRequestSchema = z.object({
  totalBudget: z.number().int().min(100).max(10000000),
});

export const buyerPersonaUpdateSchema = z.object({
  name: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  seniority: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  companySizeRange: z.string().max(100).optional(),
  industryVerticals: z.array(z.string().max(100)).max(20).optional(),
  geographicFocus: z.string().max(200).optional(),
  painPoints: z.array(z.string().max(300)).max(20).optional(),
  goals: z.array(z.string().max(300)).max(20).optional(),
  buyingTriggers: z.array(z.string().max(300)).max(20).optional(),
  preferredChannels: z.array(z.string().max(100)).max(20).optional(),
  objections: z.array(z.string().max(300)).max(20).optional(),
  dayInTheLife: z.string().max(2000).optional(),
});