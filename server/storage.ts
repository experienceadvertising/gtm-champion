import { eq, and } from "drizzle-orm";
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
  type InsertBuyerPersona
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPremiumStatus(id: string, isPremium: boolean): Promise<void>;
  updateUserStripeInfo(id: string, info: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<void>;
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
}

export const storage = new DatabaseStorage();
