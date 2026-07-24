import { queryClient } from "./queryClient";

const API_BASE = "/api";

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? match[1] : "";
}

function csrfHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() };
}

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

export interface PageSpeedData {
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
}

export interface SiteProfile {
  productNames: string[];
  features: string[];
  pricingTiers: Array<{ name: string; price: string; details: string }>;
  testimonials: Array<{ quote: string; author: string; role?: string; company?: string }>;
  competitors: string[];
  brandVoice: string;
  existingChannels: Array<{ channel: string; url?: string; status: string }>;
  icpDetails: {
    persona: string;
    companySize: string;
    industry: string;
    painPoints: string[];
  } | null;
  contentGaps: string[];
  keyDifferentiators: string[];
}

export interface Company {
  id: number;
  name: string | null;
  url: string;
  summary: string | null;
  gtmMotion: string | null;
  icpScore: number | null;
  icpStatus?: "detected" | "missing";
  screenshotUrl: string | null;
  visualAnalysis: string | null;
  pageSpeedData: PageSpeedData | null;
  lastScraped: string;
  siteProfile: SiteProfile | null;
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
  gtmFunnel: string | null;
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
  generationStatus?: "generated" | "fallback" | "pending" | "failed";
  strategyMeta?: {
    confidence: number;
    qualityScore: number;
    priorityScore: number;
    priorityRationale: string;
    isTopChannel: boolean;
    evidence: Array<{
      claim: string;
      source: string;
      sourceType: "website" | "benchmark" | "best-practice" | "assumption";
      confidence: number;
      url?: string;
    }>;
    prerequisites: string[];
    budgetGuidance: {
      minimumMonthly: number | null;
      recommendedMonthly: number | null;
      currency: string;
      rationale: string;
    };
    cadence: {
      daily: string[];
      weekly: string[];
    };
    risks: string[];
    roadmap: {
      first30Days: string[];
      days31To60: string[];
      days61To90: string[];
    };
    qualityIssues: string[];
    fallbackReason?: string;
    model?: string;
  };
  isFallback?: boolean;
  createdAt: string;
}

export interface DashboardData {
  user: {
    id: string;
    fullName: string;
    email: string;
    isPremium: boolean;
    agentEnabled: boolean;
  };
  company: Company;
  recommendations: Recommendation[];
  weeklyIdeas: WeeklyIdea[];
  channelInsights: ChannelInsight[];
  strategyPlan?: {
    topChannelIds: string[];
    executiveSummary: string;
    firstPriority: string;
    prerequisites: string[];
    roadmap: {
      first30Days: string[];
      days31To60: string[];
      days61To90: string[];
    };
  };
}

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

export async function register(data: RegisterData): Promise<{ userId: string; email: string }> {
  const response = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: csrfHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
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
    headers: csrfHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }

  const session = await response.json();
  saveSession(session);
  return session;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/logout`, {
    method: "POST",
    headers: { "X-CSRF-Token": getCsrfToken() },
    credentials: "include",
  });
  clearSession();
}

export async function checkSession(): Promise<{ authenticated: boolean; userId?: string; email?: string; fullName?: string }> {
  const response = await fetch(`${API_BASE}/session`, {
    credentials: "include",
  });
  return response.json();
}

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/dashboard`, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      const channel = new URLSearchParams(window.location.search).get("channel");
      const authPath = channel ? `/auth?redirect=/dashboard?channel=${encodeURIComponent(channel)}` : "/auth";
      window.location.href = authPath;
      throw new Error("SESSION_EXPIRED");
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to load dashboard");
  }

  return response.json();
}

export async function updateRecommendationStatus(id: number, status: string): Promise<void> {
  const response = await fetch(`${API_BASE}/recommendations/${id}/status`, {
    method: "PATCH",
    headers: csrfHeaders(),
    body: JSON.stringify({ status }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update status");
  }
}

export async function retryAnalysis(companyId: number, fullName: string, email: string, companyUrl: string): Promise<void> {
  const response = await fetch(`${API_BASE}/retry-analysis/${companyId}`, {
    method: "POST",
    headers: csrfHeaders(),
    body: JSON.stringify({ fullName, email, companyUrl }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to retry analysis");
  }
}

export interface UserIntegration {
  id: number;
  userId: string;
  integrationId: string;
  integrationName: string;
  isConnected: boolean;
  connectedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export async function fetchUserIntegrations(): Promise<UserIntegration[]> {
  const response = await fetch(`${API_BASE}/integrations`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch integrations");
  }

  return response.json();
}

export async function updateIntegration(
  integrationId: string, 
  integrationName: string, 
  isConnected: boolean
): Promise<void> {
  const response = await fetch(`${API_BASE}/integrations/${integrationId}`, {
    method: "POST",
    headers: csrfHeaders(),
    body: JSON.stringify({ integrationName, isConnected }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update integration");
  }
}

export interface ChatResponse {
  answer: string;
}

export async function askAI(
  question: string,
  channelId?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: csrfHeaders(),
    body: JSON.stringify({ question, channelId }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get AI response");
  }

  return response.json();
}

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
  const response = await fetch(`${API_BASE}/stripe/config`, { credentials: "include" });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get Stripe config");
  }
  return response.json();
}

export async function getStripeProducts(): Promise<{ data: StripeProduct[] }> {
  const response = await fetch(`${API_BASE}/stripe/products`, { credentials: "include" });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get products");
  }
  return response.json();
}

export async function createCheckoutSession(priceId: string): Promise<{ url: string }> {
  const response = await fetch(`${API_BASE}/stripe/checkout`, {
    method: "POST",
    headers: csrfHeaders(),
    body: JSON.stringify({ priceId }),
    credentials: "include",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create checkout session");
  }
  return response.json();
}

export async function createPortalSession(): Promise<{ url: string }> {
  const response = await fetch(`${API_BASE}/stripe/portal`, {
    method: "POST",
    headers: csrfHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create portal session");
  }
  return response.json();
}

export async function getSubscriptionStatus(): Promise<{ subscription: unknown; isPremium: boolean }> {
  const response = await fetch(`${API_BASE}/stripe/subscription`, { credentials: "include" });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get subscription status");
  }
  return response.json();
}

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
  request: LinkedInPostRequest
): Promise<{ posts: LinkedInPost[] }> {
  const response = await fetch(`${API_BASE}/generate/linkedin`, {
    method: "POST",
    headers: csrfHeaders(),
    body: JSON.stringify(request),
    credentials: "include",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate LinkedIn posts");
  }
  return response.json();
}

export async function generateEmailCampaign(
  request: EmailCampaignRequest
): Promise<{ emails: GeneratedEmail[] }> {
  const response = await fetch(`${API_BASE}/generate/email`, {
    method: "POST",
    headers: csrfHeaders(),
    body: JSON.stringify(request),
    credentials: "include",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate email campaign");
  }
  return response.json();
}

export async function generateBlogArticle(
  request: BlogArticleRequest
): Promise<{ article: GeneratedArticle }> {
  const response = await fetch(`${API_BASE}/generate/blog`, {
    method: "POST",
    headers: csrfHeaders(),
    body: JSON.stringify(request),
    credentials: "include",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate blog article");
  }
  return response.json();
}
