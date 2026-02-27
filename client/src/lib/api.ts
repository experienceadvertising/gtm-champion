import { queryClient } from "./queryClient";

const API_BASE = "/api";

export interface RegisterData {
  fullName: string;
  email: string;
  companyUrl: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  isPremium: boolean;
}

export interface Company {
  id: number;
  name: string | null;
  url: string;
  summary: string | null;
  gtmMotion: string | null;
  icpScore: number | null;
  lastScraped: string;
}

export interface Recommendation {
  id: number;
  companyId: number;
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  status: string;
  createdAt: string;
}

export interface WeeklyIdea {
  id: number;
  companyId: number;
  title: string;
  description: string;
  type: string;
  createdAt: string;
}

export interface ChannelInsight {
  id: number;
  companyId: number;
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
  resources: string[];
  createdAt: string;
}

export interface DashboardData {
  user: {
    id: string;
    fullName: string;
    email: string;
    isPremium: boolean;
  };
  company: Company;
  recommendations: Recommendation[];
  weeklyIdeas: WeeklyIdea[];
  channelInsights: ChannelInsight[];
}

// Session management
const SESSION_KEY = "gtm_session";

export function saveSession(session: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): UserSession | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  queryClient.clear();
}

// API calls
export async function register(data: RegisterData): Promise<{ userId: string; email: string }> {
  const response = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registration failed");
  }

  return response.json();
}

export async function login(data: LoginData): Promise<UserSession> {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }

  const session = await response.json();
  saveSession(session);
  return session;
}

export async function fetchDashboard(userId: string): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/dashboard/${userId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to load dashboard");
  }

  return response.json();
}

export async function updateRecommendationStatus(id: number, status: string): Promise<void> {
  const response = await fetch(`${API_BASE}/recommendations/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update status");
  }
}

export async function upgradeToPremium(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/upgrade/${userId}`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upgrade");
  }
}

export async function retryAnalysis(companyId: number, fullName: string, email: string, companyUrl: string): Promise<void> {
  const response = await fetch(`${API_BASE}/retry-analysis/${companyId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName, email, companyUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to retry analysis");
  }
}

// Integrations
export interface UserIntegration {
  id: number;
  userId: string;
  integrationId: string;
  integrationName: string;
  isConnected: boolean;
  connectedAt: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export async function fetchUserIntegrations(userId: string): Promise<UserIntegration[]> {
  const response = await fetch(`${API_BASE}/integrations/${userId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch integrations");
  }

  return response.json();
}

export async function updateIntegration(
  userId: string, 
  integrationId: string, 
  integrationName: string, 
  isConnected: boolean
): Promise<void> {
  const response = await fetch(`${API_BASE}/integrations/${userId}/${integrationId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ integrationName, isConnected }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update integration");
  }
}

// AI Chat
export interface ChatResponse {
  answer: string;
}

export async function askAI(
  userId: string,
  question: string,
  channelId?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, channelId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get AI response");
  }

  return response.json();
}

// Stripe Integration
export interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string; interval_count: number };
  active: boolean;
  metadata: Record<string, string>;
}

export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  active: boolean;
  metadata: Record<string, string>;
  prices: StripePrice[];
}

export async function getStripeConfig(): Promise<{ publishableKey: string }> {
  const response = await fetch(`${API_BASE}/stripe/config`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get Stripe config");
  }
  return response.json();
}

export async function getStripeProducts(): Promise<{ data: StripeProduct[] }> {
  const response = await fetch(`${API_BASE}/stripe/products`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get products");
  }
  return response.json();
}

export async function createCheckoutSession(userId: string, priceId: string): Promise<{ url: string }> {
  const response = await fetch(`${API_BASE}/stripe/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, priceId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create checkout session");
  }
  return response.json();
}

export async function createPortalSession(userId: string): Promise<{ url: string }> {
  const response = await fetch(`${API_BASE}/stripe/portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create portal session");
  }
  return response.json();
}

export async function getSubscriptionStatus(userId: string): Promise<{ subscription: any; isPremium: boolean }> {
  const response = await fetch(`${API_BASE}/stripe/subscription/${userId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get subscription status");
  }
  return response.json();
}

// Content Generators (Premium)
export interface LinkedInPostRequest {
  topic: string;
  tone: 'thought-leader' | 'educational' | 'storytelling' | 'promotional';
  authorRole: string;
}

export interface LinkedInPost {
  content: string;
  hook: string;
  cta: string;
}

export interface EmailCampaignRequest {
  campaignType: 'welcome' | 'nurture' | 'promotional' | 're-engagement';
  emailCount: number;
  goal: string;
}

export interface GeneratedEmail {
  subject: string;
  preheader: string;
  body: string;
  sendTiming: string;
}

export interface BlogArticleRequest {
  topic: string;
  targetKeyword: string;
  articleType: 'how-to' | 'listicle' | 'thought-leadership' | 'case-study';
}

export interface GeneratedArticle {
  title: string;
  metaDescription: string;
  outline: string[];
  fullContent: string;
  wordCount: number;
}

export async function generateLinkedInPosts(
  userId: string,
  request: LinkedInPostRequest
): Promise<{ posts: LinkedInPost[] }> {
  const response = await fetch(`${API_BASE}/generate/linkedin/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate LinkedIn posts");
  }
  return response.json();
}

export async function generateEmailCampaign(
  userId: string,
  request: EmailCampaignRequest
): Promise<{ emails: GeneratedEmail[] }> {
  const response = await fetch(`${API_BASE}/generate/email/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate email campaign");
  }
  return response.json();
}

export async function generateBlogArticle(
  userId: string,
  request: BlogArticleRequest
): Promise<{ article: GeneratedArticle }> {
  const response = await fetch(`${API_BASE}/generate/blog/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate blog article");
  }
  return response.json();
}
