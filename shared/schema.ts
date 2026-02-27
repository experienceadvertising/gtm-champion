import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  companyUrl: text("company_url").notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  name: text("name"),
  summary: text("summary"),
  gtmMotion: text("gtm_motion"),
  icpScore: integer("icp_score"),
  lastScraped: timestamp("last_scraped").defaultNow().notNull(),
});

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  impact: text("impact").notNull(),
  effort: text("effort").notNull(),
  status: text("status").default("New").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const weeklyIdeas = pgTable("weekly_ideas", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const channelInsights = pgTable("channel_insights", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
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
});

export const userIntegrations = pgTable("user_integrations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  integrationId: text("integration_id").notNull(),
  integrationName: text("integration_name").notNull(),
  isConnected: boolean("is_connected").default(false).notNull(),
  connectedAt: timestamp("connected_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isPremium: true,
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

export const insertUserIntegrationSchema = createInsertSchema(userIntegrations).omit({
  id: true,
  createdAt: true,
  connectedAt: true,
});

// Types
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

export type InsertUserIntegration = z.infer<typeof insertUserIntegrationSchema>;
export type UserIntegration = typeof userIntegrations.$inferSelect;
