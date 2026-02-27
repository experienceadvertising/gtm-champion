import { eq, and } from "drizzle-orm";
import { db } from "../db/index";
import { 
  users, 
  companies, 
  recommendations, 
  weeklyIdeas,
  channelInsights,
  userIntegrations,
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
  type InsertUserIntegration
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPremiumStatus(id: string, isPremium: boolean): Promise<void>;
  updateUserStripeInfo(id: string, info: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<void>;

  // Company operations
  getCompanyByUserId(userId: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, updates: Partial<Company>): Promise<void>;

  // Recommendations operations
  getRecommendationsByCompanyId(companyId: number): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendationStatus(id: number, status: string): Promise<void>;
  deleteRecommendationsByCompanyId(companyId: number): Promise<void>;

  // Weekly ideas operations
  getWeeklyIdeasByCompanyId(companyId: number): Promise<WeeklyIdea[]>;
  createWeeklyIdea(idea: InsertWeeklyIdea): Promise<WeeklyIdea>;
  deleteWeeklyIdeasByCompanyId(companyId: number): Promise<void>;

  // Channel insights operations
  getChannelInsightsByCompanyId(companyId: number): Promise<ChannelInsight[]>;
  getChannelInsightByChannelId(companyId: number, channelId: string): Promise<ChannelInsight | undefined>;
  createChannelInsight(insight: InsertChannelInsight): Promise<ChannelInsight>;
  deleteChannelInsightsByCompanyId(companyId: number): Promise<void>;

  // User integrations operations
  getUserIntegrations(userId: string): Promise<UserIntegration[]>;
  getUserIntegration(userId: string, integrationId: string): Promise<UserIntegration | undefined>;
  createUserIntegration(integration: InsertUserIntegration): Promise<UserIntegration>;
  updateUserIntegrationStatus(userId: string, integrationId: string, isConnected: boolean): Promise<void>;
  deleteUserIntegration(userId: string, integrationId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
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

  // Company operations
  async getCompanyByUserId(userId: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.userId, userId)).limit(1);
    return company;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany).returning();
    return company;
  }

  async updateCompany(id: number, updates: Partial<Company>): Promise<void> {
    await db.update(companies).set(updates).where(eq(companies.id, id));
  }

  // Recommendations operations
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

  // Weekly ideas operations
  async getWeeklyIdeasByCompanyId(companyId: number): Promise<WeeklyIdea[]> {
    return db.select().from(weeklyIdeas).where(eq(weeklyIdeas.companyId, companyId));
  }

  async createWeeklyIdea(idea: InsertWeeklyIdea): Promise<WeeklyIdea> {
    const [weeklyIdea] = await db.insert(weeklyIdeas).values(idea).returning();
    return weeklyIdea;
  }

  async deleteWeeklyIdeasByCompanyId(companyId: number): Promise<void> {
    await db.delete(weeklyIdeas).where(eq(weeklyIdeas.companyId, companyId));
  }

  // Channel insights operations
  async getChannelInsightsByCompanyId(companyId: number): Promise<ChannelInsight[]> {
    return db.select().from(channelInsights).where(eq(channelInsights.companyId, companyId));
  }

  async getChannelInsightByChannelId(companyId: number, channelId: string): Promise<ChannelInsight | undefined> {
    const [insight] = await db.select()
      .from(channelInsights)
      .where(eq(channelInsights.companyId, companyId))
      .limit(1);
    
    const allInsights = await db.select()
      .from(channelInsights)
      .where(eq(channelInsights.companyId, companyId));
    
    return allInsights.find(i => i.channelId === channelId);
  }

  async createChannelInsight(insight: InsertChannelInsight): Promise<ChannelInsight> {
    const [channelInsight] = await db.insert(channelInsights).values(insight as any).returning();
    return channelInsight;
  }

  async deleteChannelInsightsByCompanyId(companyId: number): Promise<void> {
    await db.delete(channelInsights).where(eq(channelInsights.companyId, companyId));
  }

  // User integrations operations
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
}

export const storage = new DatabaseStorage();
