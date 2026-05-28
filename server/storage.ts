import { eq, and, desc, lte, isNull } from "drizzle-orm";
import { db } from "../db/index";
import {
  users,
  companies,
  recommendations,
  weeklyIdeas,
  channelInsights,
  userIntegrations,
  pushSubscriptions,
  budgetAllocations,
  buyerPersonas,
  strategySnapshots,
  agentEvents,
  scheduledNudges,
  type User,
  type InsertUser,
  type Company,
  type InsertCompany,
  type Recommendation,
  type InsertRecommendation,
  type WeeklyIdea,
  type InsertWeeklyIdea,
  type ChannelInsight,
  type InsertChannelInsight,
  type UserIntegration,
  type InsertUserIntegration,
  type PushSubscription,
  type InsertPushSubscription,
  type BudgetAllocation,
  type InsertBudgetAllocation,
  type BuyerPersona,
  type InsertBuyerPersona,
  type StrategySnapshot,
  type InsertStrategySnapshot,
  type AgentEvent,
  type InsertAgentEvent,
  type ScheduledNudge,
  type InsertScheduledNudge,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersWithCompanies(): Promise<Array<{ user: User; company: Company }>>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPremiumStatus(id: string, isPremium: boolean): Promise<void>;
  updateUserStripeInfo(id: string, info: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<void>;
  updateUserLogoUrl(id: string, logoUrl: string | null): Promise<void>;
  deleteUser(id: string): Promise<void>;

  getAllCompanies(): Promise<Company[]>;
  getCompanyByUserId(userId: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, updates: Partial<Company>): Promise<void>;

  getAllRecommendations(): Promise<Recommendation[]>;
  getRecommendationsByCompanyId(companyId: number): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendationStatus(id: number, status: string): Promise<void>;
  deleteRecommendationsByCompanyId(companyId: number): Promise<void>;

  getWeeklyIdeasByCompanyId(companyId: number): Promise<WeeklyIdea[]>;
  createWeeklyIdea(idea: InsertWeeklyIdea): Promise<WeeklyIdea>;
  createWeeklyIdeasBatch(ideas: InsertWeeklyIdea[]): Promise<WeeklyIdea[]>;
  deleteWeeklyIdeasByCompanyId(companyId: number): Promise<void>;

  getChannelInsightsByCompanyId(companyId: number): Promise<ChannelInsight[]>;
  getChannelInsightByChannelId(companyId: number, channelId: string): Promise<ChannelInsight | undefined>;
  createChannelInsight(insight: InsertChannelInsight): Promise<ChannelInsight>;
  deleteChannelInsightsByCompanyId(companyId: number): Promise<void>;

  getUserIntegrations(userId: string): Promise<UserIntegration[]>;
  getUserIntegration(userId: string, integrationId: string): Promise<UserIntegration | undefined>;
  createUserIntegration(integration: InsertUserIntegration): Promise<UserIntegration>;
  updateUserIntegrationStatus(userId: string, integrationId: string, isConnected: boolean): Promise<void>;
  deleteUserIntegration(userId: string, integrationId: string): Promise<void>;

  getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]>;
  getPushSubscriptionByEndpoint(userId: string, endpoint: string): Promise<PushSubscription | undefined>;
  getAllEnabledPushSubscriptions(): Promise<PushSubscription[]>;
  createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  updatePushSubscriptionEnabled(id: number, enabled: boolean): Promise<void>;
  deletePushSubscription(id: number): Promise<void>;
  deletePushSubscriptionByEndpoint(userId: string, endpoint: string): Promise<void>;

  getBudgetAllocationsByCompanyId(companyId: number): Promise<BudgetAllocation[]>;
  getLatestBudgetAllocation(companyId: number): Promise<BudgetAllocation | undefined>;
  createBudgetAllocation(allocation: InsertBudgetAllocation): Promise<BudgetAllocation>;
  deleteBudgetAllocation(id: number): Promise<void>;

  getBuyerPersonasByCompanyId(companyId: number): Promise<BuyerPersona[]>;
  getBuyerPersona(id: number): Promise<BuyerPersona | undefined>;
  createBuyerPersona(persona: InsertBuyerPersona): Promise<BuyerPersona>;
  createBuyerPersonasBatch(personas: InsertBuyerPersona[]): Promise<BuyerPersona[]>;
  updateBuyerPersona(id: number, updates: Partial<BuyerPersona>): Promise<void>;
  deleteBuyerPersona(id: number): Promise<void>;
  deleteBuyerPersonasByCompanyId(companyId: number): Promise<void>;

  createStrategySnapshot(snapshot: InsertStrategySnapshot): Promise<StrategySnapshot>;
  getStrategySnapshotsByUserId(userId: string): Promise<StrategySnapshot[]>;
  getStrategySnapshot(id: number, userId: string): Promise<StrategySnapshot | undefined>;

  updateUserAgentEnabled(id: string, agentEnabled: boolean): Promise<void>;
  updateUserSlackWebhook(id: string, slackWebhookUrl: string | null): Promise<void>;

  createAgentEvent(event: InsertAgentEvent): Promise<AgentEvent>;
  getRecentAgentEvents(userId: string, limit?: number): Promise<AgentEvent[]>;
  hasAgentEvent(userId: string, eventType: string, channelId: string, windowMs: number): Promise<boolean>;

  createScheduledNudge(nudge: InsertScheduledNudge): Promise<ScheduledNudge>;
  getPendingScheduledNudges(): Promise<Array<ScheduledNudge & { user: User }>>;
  markScheduledNudgeSent(id: number): Promise<void>;
  hasPendingNudge(userId: string, channelId: string, nudgeType?: string): Promise<boolean>;
  getUpcomingScheduledNudge(userId: string): Promise<ScheduledNudge | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUsersWithCompanies(): Promise<Array<{ user: User; company: Company }>> {
    const rows = await db
      .select({ user: users, company: companies })
      .from(users)
      .innerJoin(companies, eq(companies.userId, users.id));
    return rows;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPremiumStatus(id: string, isPremium: boolean): Promise<void> {
    await db.update(users).set({ isPremium }).where(eq(users.id, id));
  }

  async updateUserStripeInfo(id: string, info: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<void> {
    await db.update(users).set(info).where(eq(users.id, id));
  }

  async updateUserLogoUrl(id: string, logoUrl: string | null): Promise<void> {
    await db.update(users).set({ logoUrl }).where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllCompanies(): Promise<Company[]> {
    return db.select().from(companies);
  }

  async getCompanyByUserId(userId: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.userId, userId)).limit(1);
    return company;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany as typeof companies.$inferInsert).returning();
    return company;
  }

  async updateCompany(id: number, updates: Partial<Company>): Promise<void> {
    await db.update(companies).set(updates).where(eq(companies.id, id));
  }

  async getAllRecommendations(): Promise<Recommendation[]> {
    return db.select().from(recommendations);
  }

  async getRecommendationsByCompanyId(companyId: number): Promise<Recommendation[]> {
    return db.select().from(recommendations).where(eq(recommendations.companyId, companyId));
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const [rec] = await db.insert(recommendations).values(recommendation).returning();
    return rec;
  }

  async updateRecommendationStatus(id: number, status: string): Promise<void> {
    await db.update(recommendations).set({ status }).where(eq(recommendations.id, id));
  }

  async deleteRecommendationsByCompanyId(companyId: number): Promise<void> {
    await db.delete(recommendations).where(eq(recommendations.companyId, companyId));
  }

  async getWeeklyIdeasByCompanyId(companyId: number): Promise<WeeklyIdea[]> {
    return db.select().from(weeklyIdeas).where(eq(weeklyIdeas.companyId, companyId));
  }

  async createWeeklyIdea(idea: InsertWeeklyIdea): Promise<WeeklyIdea> {
    const [weeklyIdea] = await db.insert(weeklyIdeas).values(idea).returning();
    return weeklyIdea;
  }

  async createWeeklyIdeasBatch(ideas: InsertWeeklyIdea[]): Promise<WeeklyIdea[]> {
    if (ideas.length === 0) return [];
    return db.insert(weeklyIdeas).values(ideas).returning();
  }

  async deleteWeeklyIdeasByCompanyId(companyId: number): Promise<void> {
    await db.delete(weeklyIdeas).where(eq(weeklyIdeas.companyId, companyId));
  }

  async getChannelInsightsByCompanyId(companyId: number): Promise<ChannelInsight[]> {
    return db.select().from(channelInsights).where(eq(channelInsights.companyId, companyId));
  }

  async getChannelInsightByChannelId(companyId: number, channelId: string): Promise<ChannelInsight | undefined> {
    const [insight] = await db.select()
      .from(channelInsights)
      .where(and(
        eq(channelInsights.companyId, companyId),
        eq(channelInsights.channelId, channelId)
      ))
      .limit(1);
    return insight;
  }

  async createChannelInsight(insight: InsertChannelInsight): Promise<ChannelInsight> {
    const [channelInsight] = await db.insert(channelInsights).values(insight as typeof channelInsights.$inferInsert).returning();
    return channelInsight;
  }

  async deleteChannelInsightsByCompanyId(companyId: number): Promise<void> {
    await db.delete(channelInsights).where(eq(channelInsights.companyId, companyId));
  }

  async getUserIntegrations(userId: string): Promise<UserIntegration[]> {
    return db.select().from(userIntegrations).where(eq(userIntegrations.userId, userId));
  }

  async getUserIntegration(userId: string, integrationId: string): Promise<UserIntegration | undefined> {
    const [integration] = await db.select()
      .from(userIntegrations)
      .where(and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.integrationId, integrationId)
      ))
      .limit(1);
    return integration;
  }

  async createUserIntegration(integration: InsertUserIntegration): Promise<UserIntegration> {
    const [userIntegration] = await db.insert(userIntegrations).values(integration).returning();
    return userIntegration;
  }

  async updateUserIntegrationStatus(userId: string, integrationId: string, isConnected: boolean): Promise<void> {
    await db.update(userIntegrations)
      .set({ 
        isConnected, 
        connectedAt: isConnected ? new Date() : null 
      })
      .where(and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.integrationId, integrationId)
      ));
  }

  async deleteUserIntegration(userId: string, integrationId: string): Promise<void> {
    await db.delete(userIntegrations)
      .where(and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.integrationId, integrationId)
      ));
  }

  async getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async getPushSubscriptionByEndpoint(userId: string, endpoint: string): Promise<PushSubscription | undefined> {
    const [sub] = await db.select().from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
      .limit(1);
    return sub;
  }

  async getAllEnabledPushSubscriptions(): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.enabled, true));
  }

  async createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    const [result] = await db.insert(pushSubscriptions).values(sub).returning();
    return result;
  }

  async updatePushSubscriptionEnabled(id: number, enabled: boolean): Promise<void> {
    await db.update(pushSubscriptions).set({ enabled }).where(eq(pushSubscriptions.id, id));
  }

  async deletePushSubscription(id: number): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  }

  async deletePushSubscriptionByEndpoint(userId: string, endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  }

  async getBudgetAllocationsByCompanyId(companyId: number): Promise<BudgetAllocation[]> {
    return db.select().from(budgetAllocations).where(eq(budgetAllocations.companyId, companyId));
  }

  async getLatestBudgetAllocation(companyId: number): Promise<BudgetAllocation | undefined> {
    const [alloc] = await db.select().from(budgetAllocations)
      .where(eq(budgetAllocations.companyId, companyId))
      .orderBy(budgetAllocations.createdAt)
      .limit(1);
    return alloc;
  }

  async createBudgetAllocation(allocation: InsertBudgetAllocation): Promise<BudgetAllocation> {
    const [result] = await db.insert(budgetAllocations).values(allocation as typeof budgetAllocations.$inferInsert).returning();
    return result;
  }

  async deleteBudgetAllocation(id: number): Promise<void> {
    await db.delete(budgetAllocations).where(eq(budgetAllocations.id, id));
  }

  async getBuyerPersonasByCompanyId(companyId: number): Promise<BuyerPersona[]> {
    return db.select().from(buyerPersonas).where(eq(buyerPersonas.companyId, companyId));
  }

  async getBuyerPersona(id: number): Promise<BuyerPersona | undefined> {
    const [persona] = await db.select().from(buyerPersonas).where(eq(buyerPersonas.id, id)).limit(1);
    return persona;
  }

  async createBuyerPersona(persona: InsertBuyerPersona): Promise<BuyerPersona> {
    const [result] = await db.insert(buyerPersonas).values(persona as typeof buyerPersonas.$inferInsert).returning();
    return result;
  }

  async createBuyerPersonasBatch(personas: InsertBuyerPersona[]): Promise<BuyerPersona[]> {
    if (personas.length === 0) return [];
    return db.insert(buyerPersonas).values(personas as Array<typeof buyerPersonas.$inferInsert>).returning();
  }

  async updateBuyerPersona(id: number, updates: Partial<BuyerPersona>): Promise<void> {
    await db.update(buyerPersonas).set(updates).where(eq(buyerPersonas.id, id));
  }

  async deleteBuyerPersona(id: number): Promise<void> {
    await db.delete(buyerPersonas).where(eq(buyerPersonas.id, id));
  }

  async deleteBuyerPersonasByCompanyId(companyId: number): Promise<void> {
    await db.delete(buyerPersonas).where(eq(buyerPersonas.companyId, companyId));
  }

  async createStrategySnapshot(snapshot: InsertStrategySnapshot): Promise<StrategySnapshot> {
    const [result] = await db
      .insert(strategySnapshots)
      .values(snapshot as typeof strategySnapshots.$inferInsert)
      .returning();
    return result;
  }

  async getStrategySnapshotsByUserId(userId: string): Promise<StrategySnapshot[]> {
    return db
      .select()
      .from(strategySnapshots)
      .where(eq(strategySnapshots.userId, userId))
      .orderBy(desc(strategySnapshots.createdAt));
  }

  async getStrategySnapshot(id: number, userId: string): Promise<StrategySnapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(strategySnapshots)
      .where(and(eq(strategySnapshots.id, id), eq(strategySnapshots.userId, userId)))
      .limit(1);
    return snapshot;
  }

  async updateUserAgentEnabled(id: string, agentEnabled: boolean): Promise<void> {
    await db.update(users).set({ agentEnabled }).where(eq(users.id, id));
  }

  async updateUserSlackWebhook(id: string, slackWebhookUrl: string | null): Promise<void> {
    await db.update(users).set({ slackWebhookUrl }).where(eq(users.id, id));
  }

  async createAgentEvent(event: InsertAgentEvent): Promise<AgentEvent> {
    const [result] = await db.insert(agentEvents).values(event).returning();
    return result;
  }

  async getRecentAgentEvents(userId: string, limit = 10): Promise<AgentEvent[]> {
    return db
      .select()
      .from(agentEvents)
      .where(eq(agentEvents.userId, userId))
      .orderBy(desc(agentEvents.sentAt))
      .limit(limit);
  }

  async hasAgentEvent(userId: string, eventType: string, channelId: string, windowMs: number): Promise<boolean> {
    const cutoff = new Date(Date.now() - windowMs);
    const { sql: sqlFn } = await import("drizzle-orm");
    const rows = await db
      .select({ id: agentEvents.id })
      .from(agentEvents)
      .where(
        and(
          eq(agentEvents.userId, userId),
          eq(agentEvents.eventType, eventType),
          eq(agentEvents.channelId, channelId),
          sqlFn`${agentEvents.sentAt} >= ${cutoff}`
        )
      )
      .limit(1);
    return rows.length > 0;
  }

  async createScheduledNudge(nudge: InsertScheduledNudge): Promise<ScheduledNudge> {
    const [result] = await db.insert(scheduledNudges).values(nudge).returning();
    return result;
  }

  async getPendingScheduledNudges(): Promise<Array<ScheduledNudge & { user: User }>> {
    const rows = await db
      .select({ nudge: scheduledNudges, user: users })
      .from(scheduledNudges)
      .innerJoin(users, eq(users.id, scheduledNudges.userId))
      .where(and(isNull(scheduledNudges.sentAt), lte(scheduledNudges.dueAt, new Date())));
    return rows.map(r => ({ ...r.nudge, user: r.user }));
  }

  async markScheduledNudgeSent(id: number): Promise<void> {
    await db.update(scheduledNudges).set({ sentAt: new Date() }).where(eq(scheduledNudges.id, id));
  }

  async hasPendingNudge(userId: string, channelId: string, nudgeType?: string): Promise<boolean> {
    const conditions = [
      eq(scheduledNudges.userId, userId),
      eq(scheduledNudges.channelId, channelId),
      isNull(scheduledNudges.sentAt),
    ];
    if (nudgeType) {
      conditions.push(eq(scheduledNudges.nudgeType, nudgeType));
    }
    const rows = await db
      .select({ id: scheduledNudges.id })
      .from(scheduledNudges)
      .where(and(...conditions))
      .limit(1);
    return rows.length > 0;
  }

  async getUpcomingScheduledNudge(userId: string): Promise<ScheduledNudge | undefined> {
    const { asc } = await import("drizzle-orm");
    const [row] = await db
      .select()
      .from(scheduledNudges)
      .where(and(eq(scheduledNudges.userId, userId), isNull(scheduledNudges.sentAt)))
      .orderBy(asc(scheduledNudges.dueAt))
      .limit(1);
    return row;
  }
}


export const storage = new DatabaseStorage();
