import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { insertUserSchema } from "@shared/schema";
import { scrapeWebsite, analyzeCompany, generateWeeklyIdeas, answerQuestion, generateLinkedInPost, generateEmailCampaign, generateBlogArticle, type ChatContext, type LinkedInPostRequest, type EmailCampaignRequest, type BlogArticleRequest } from "./services/openai";
import { sendWelcomeEmail, sendWeeklyEmail } from "./services/email";
import { stripeService } from "./services/stripeService";
import { getStripePublishableKey } from "./services/stripeClient";

const ARTICLE_SLUGS = [
  "what-is-go-to-market-strategy-complete-guide",
  "13-marketing-channels-b2b-saas-2025",
  "free-gtm-tools-b2b-marketers",
  "seo-for-b2b-saas-guide",
  "how-to-choose-marketing-channels-startup",
  "product-led-growth-vs-sales-led-gtm",
  "account-based-marketing-abm-guide-b2b-saas",
  "content-marketing-strategies-b2b-saas-growth",
  "email-marketing-best-practices-b2b-saas",
  "building-b2b-saas-community-guide"
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // XML Sitemap
  app.get("/sitemap.xml", (req, res) => {
    const baseUrl = "https://gtmchampion.com";
    const today = new Date().toISOString().split('T')[0];
    
    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "weekly" },
      { loc: "/blog", priority: "0.8", changefreq: "weekly" },
      { loc: "/auth", priority: "0.5", changefreq: "monthly" },
    ];
    
    const articlePages = ARTICLE_SLUGS.map(slug => ({
      loc: `/blog/${slug}`,
      priority: "0.7",
      changefreq: "monthly"
    }));
    
    const allPages = [...staticPages, ...articlePages];
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
    
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  });

  // Robots.txt
  app.get("/robots.txt", (req, res) => {
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://gtmchampion.com/sitemap.xml

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /
`;
    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });
  // User Registration
  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Create company record immediately with placeholder data
      const company = await storage.createCompany({
        userId: user.id,
        url: validatedData.companyUrl,
        name: null,
        summary: "Analyzing your website...",
        gtmMotion: null,
        icpScore: null,
      });

      // Start async background processing (scraping + AI analysis)
      processCompanyAnalysis(company.id, validatedData.companyUrl, validatedData.fullName, validatedData.email).catch(
        err => console.error("Background analysis failed:", err)
      );

      res.status(201).json({
        message: "Account created successfully. Analyzing your website...",
        userId: user.id,
        email: user.email,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  });

  // User Login
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        isPremium: user.isPremium,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get user dashboard data
  app.get("/api/dashboard/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ error: "Company data not yet available" });
      }

      const recommendations = await storage.getRecommendationsByCompanyId(company.id);
      const weeklyIdeas = await storage.getWeeklyIdeasByCompanyId(company.id);
      const channelInsights = await storage.getChannelInsightsByCompanyId(company.id);

      res.json({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          isPremium: user.isPremium,
        },
        company: {
          id: company.id,
          name: company.name,
          url: company.url,
          summary: company.summary,
          gtmMotion: company.gtmMotion,
          icpScore: company.icpScore,
          lastScraped: company.lastScraped,
        },
        recommendations,
        weeklyIdeas,
        channelInsights,
      });
    } catch (error: any) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  // Update recommendation status
  app.patch("/api/recommendations/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status required" });
      }

      await storage.updateRecommendationStatus(parseInt(id), status);
      res.json({ message: "Status updated" });
    } catch (error: any) {
      console.error("Update status error:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Retry analysis
  app.post("/api/retry-analysis/:companyId", async (req, res) => {
    try {
      const { companyId } = req.params;
      const { fullName, email, companyUrl } = req.body;

      if (!fullName || !email || !companyUrl) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const cid = parseInt(companyId);

      // Reset company status (cleanup happens inside processCompanyAnalysis)
      await storage.updateCompany(cid, {
        summary: "Analyzing your website...",
        name: null,
        gtmMotion: null,
        icpScore: null,
      });

      // Start background processing (handles its own cleanup)
      processCompanyAnalysis(cid, companyUrl, fullName, email).catch(
        err => console.error("Retry analysis failed:", err)
      );

      res.json({ message: "Analysis restarted" });
    } catch (error: any) {
      console.error("Retry analysis error:", error);
      res.status(500).json({ error: "Failed to retry analysis" });
    }
  });


  // Get Stripe publishable key
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error("Stripe config error:", error);
      res.status(500).json({ error: "Failed to get Stripe config" });
    }
  });

  // Get Stripe products and prices
  app.get("/api/stripe/products", async (req, res) => {
    try {
      const products = await stripeService.listProductsWithPrices();
      
      const productsMap = new Map();
      for (const row of products as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
            metadata: row.price_metadata,
          });
        }
      }

      res.json({ data: Array.from(productsMap.values()) });
    } catch (error: any) {
      console.error("Get products error:", error);
      res.status(500).json({ error: "Failed to get products" });
    }
  });

  // Create checkout session for subscription
  app.post("/api/stripe/checkout", async (req, res) => {
    try {
      const { userId, priceId } = req.body;

      if (!userId || !priceId) {
        return res.status(400).json({ error: "userId and priceId required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, user.id, user.fullName);
        await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/dashboard?upgrade=success`,
        `${baseUrl}/dashboard?upgrade=cancelled`
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Create customer portal session
  app.post("/api/stripe/portal", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ error: "No subscription found" });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/dashboard`
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // Get user subscription status
  app.get("/api/stripe/subscription/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeCustomerId) {
        return res.json({ subscription: null, isPremium: user.isPremium });
      }

      const subscription = await stripeService.getSubscriptionByCustomerId(user.stripeCustomerId);
      
      if (subscription && subscription.status === 'active' && !user.isPremium) {
        await storage.updateUserPremiumStatus(userId, true);
      }

      res.json({ 
        subscription,
        isPremium: user.isPremium || (subscription?.status === 'active')
      });
    } catch (error: any) {
      console.error("Subscription error:", error);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  // AI Chat - Ask questions about GTM strategy
  app.post("/api/chat/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { question, channelId } = req.body;

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: "Question is required" });
      }

      // Get user's company context
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ error: "Company data not found" });
      }

      // Build chat context
      const context: ChatContext = {
        companyName: company.name || 'Your Company',
        summary: company.summary || '',
        gtmMotion: company.gtmMotion || 'Growth',
      };

      // If channel-specific, add channel insight
      if (channelId) {
        const channelInsights = await storage.getChannelInsightsByCompanyId(company.id);
        const insight = channelInsights.find(ci => ci.channelId === channelId);
        if (insight) {
          context.channelId = channelId;
          context.channelInsight = {
            channelId: insight.channelId,
            priority: insight.priority as "High" | "Medium" | "Low",
            whyItMatters: insight.whyItMatters || '',
            companyFitSummary: insight.companyFitSummary || '',
            heroStat: insight.heroStat as { value: string; label: string },
            topKpis: insight.topKpis as string[],
            strategicPillars: insight.strategicPillars as any[],
            quickWins: insight.quickWins as any[],
            resources: insight.resources as string[],
          };
        }
      }

      const answer = await answerQuestion(question, context);
      res.json({ answer });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message || "Failed to get AI response" });
    }
  });

  // Content Generators (Premium only)
  
  // LinkedIn Post Generator
  app.post("/api/generate/linkedin/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { topic, tone, authorRole } = req.body as LinkedInPostRequest;

      if (!topic || !tone || !authorRole) {
        return res.status(400).json({ error: "Topic, tone, and author role are required" });
      }

      // Check premium status
      const user = await storage.getUser(userId);
      if (!user?.isPremium) {
        return res.status(403).json({ error: "Premium subscription required" });
      }

      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ error: "Company data not found" });
      }

      const result = await generateLinkedInPost(
        { topic, tone, authorRole },
        {
          companyName: company.name || 'Your Company',
          summary: company.summary || '',
          gtmMotion: company.gtmMotion || 'Growth',
        }
      );

      res.json(result);
    } catch (error: any) {
      console.error("LinkedIn generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate LinkedIn posts" });
    }
  });

  // Email Campaign Generator
  app.post("/api/generate/email/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { campaignType, emailCount, goal } = req.body as EmailCampaignRequest;

      if (!campaignType || !emailCount || !goal) {
        return res.status(400).json({ error: "Campaign type, email count, and goal are required" });
      }

      // Check premium status
      const user = await storage.getUser(userId);
      if (!user?.isPremium) {
        return res.status(403).json({ error: "Premium subscription required" });
      }

      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ error: "Company data not found" });
      }

      const result = await generateEmailCampaign(
        { campaignType, emailCount, goal },
        {
          companyName: company.name || 'Your Company',
          summary: company.summary || '',
          gtmMotion: company.gtmMotion || 'Growth',
        }
      );

      res.json(result);
    } catch (error: any) {
      console.error("Email campaign generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate email campaign" });
    }
  });

  // Blog Article Generator
  app.post("/api/generate/blog/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { topic, targetKeyword, articleType } = req.body as BlogArticleRequest;

      if (!topic || !targetKeyword || !articleType) {
        return res.status(400).json({ error: "Topic, target keyword, and article type are required" });
      }

      // Check premium status
      const user = await storage.getUser(userId);
      if (!user?.isPremium) {
        return res.status(403).json({ error: "Premium subscription required" });
      }

      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ error: "Company data not found" });
      }

      const result = await generateBlogArticle(
        { topic, targetKeyword, articleType },
        {
          companyName: company.name || 'Your Company',
          summary: company.summary || '',
          gtmMotion: company.gtmMotion || 'Growth',
        }
      );

      res.json(result);
    } catch (error: any) {
      console.error("Blog article generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate blog article" });
    }
  });

  // User Integrations - Get all for user
  app.get("/api/integrations/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const integrations = await storage.getUserIntegrations(userId);
      res.json(integrations);
    } catch (error: any) {
      console.error("Get integrations error:", error);
      res.status(500).json({ error: "Failed to get integrations" });
    }
  });

  // User Integrations - Connect/Disconnect an integration
  app.post("/api/integrations/:userId/:integrationId", async (req, res) => {
    try {
      const { userId, integrationId } = req.params;
      const { integrationName, isConnected } = req.body;

      // Check if integration record exists
      const existing = await storage.getUserIntegration(userId, integrationId);
      
      if (existing) {
        // Update existing
        await storage.updateUserIntegrationStatus(userId, integrationId, isConnected);
      } else {
        // Create new
        await storage.createUserIntegration({
          userId,
          integrationId,
          integrationName,
          isConnected,
        });
      }

      res.json({ message: isConnected ? "Integration connected" : "Integration disconnected" });
    } catch (error: any) {
      console.error("Update integration error:", error);
      res.status(500).json({ error: "Failed to update integration" });
    }
  });

  // User Integrations - Delete
  app.delete("/api/integrations/:userId/:integrationId", async (req, res) => {
    try {
      const { userId, integrationId } = req.params;
      await storage.deleteUserIntegration(userId, integrationId);
      res.json({ message: "Integration removed" });
    } catch (error: any) {
      console.error("Delete integration error:", error);
      res.status(500).json({ error: "Failed to delete integration" });
    }
  });

  // Weekly email cron endpoint - triggered by external scheduler every Monday morning
  app.post("/api/cron/weekly-emails", async (req, res) => {
    try {
      // Simple secret-based authentication for cron jobs
      const cronSecret = req.headers["x-cron-secret"];
      const expectedSecret = process.env.CRON_SECRET || "gtm-weekly-cron-2025";
      
      if (cronSecret !== expectedSecret) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log("Starting weekly email job...");
      
      // Get all users and their companies
      const allUsers = await storage.getAllUsers();
      let sent = 0;
      let failed = 0;

      for (const user of allUsers) {
        try {
          const company = await storage.getCompanyByUserId(user.id);
          if (!company || !company.name) {
            console.log(`Skipping user ${user.email} - no company data`);
            continue;
          }

          // Generate fresh weekly ideas for this company
          const freshIdeas = await generateWeeklyIdeas(
            company.name,
            company.summary || "",
            company.gtmMotion || "Growth"
          );

          // Clear old weekly ideas and save new ones
          await storage.deleteWeeklyIdeasByCompanyId(company.id);
          for (const idea of freshIdeas) {
            await storage.createWeeklyIdea({
              companyId: company.id,
              title: idea.title,
              description: idea.description,
              type: idea.type,
            });
          }

          // Send the weekly email
          await sendWeeklyEmail({
            toEmail: user.email,
            userName: user.fullName,
            companyName: company.name,
            ideas: freshIdeas,
          });

          sent++;
          console.log(`Weekly email sent to ${user.email}`);
        } catch (userError) {
          console.error(`Failed to process user ${user.email}:`, userError);
          failed++;
        }
      }

      res.json({ 
        message: "Weekly emails processed",
        sent,
        failed,
        total: allUsers.length
      });
    } catch (error: any) {
      console.error("Weekly email cron error:", error);
      res.status(500).json({ error: "Failed to process weekly emails" });
    }
  });

  // Manual trigger for testing weekly email (single user)
  app.post("/api/send-weekly-email/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const company = await storage.getCompanyByUserId(userId);
      if (!company || !company.name) {
        return res.status(400).json({ error: "Company data not available" });
      }

      // Generate fresh ideas
      const freshIdeas = await generateWeeklyIdeas(
        company.name,
        company.summary || "",
        company.gtmMotion || "Growth"
      );

      // Update stored ideas
      await storage.deleteWeeklyIdeasByCompanyId(company.id);
      for (const idea of freshIdeas) {
        await storage.createWeeklyIdea({
          companyId: company.id,
          title: idea.title,
          description: idea.description,
          type: idea.type,
        });
      }

      // Send email
      await sendWeeklyEmail({
        toEmail: user.email,
        userName: user.fullName,
        companyName: company.name,
        ideas: freshIdeas,
      });

      res.json({ 
        message: "Weekly email sent successfully",
        ideas: freshIdeas
      });
    } catch (error: any) {
      console.error("Send weekly email error:", error);
      res.status(500).json({ error: "Failed to send weekly email" });
    }
  });

  return httpServer;
}

// Background processing function
async function processCompanyAnalysis(
  companyId: number,
  companyUrl: string,
  fullName: string,
  email: string
): Promise<void> {
  try {
    console.log(`Starting analysis for ${companyUrl}...`);

    // Clear old data before starting (atomic cleanup within worker)
    await storage.deleteRecommendationsByCompanyId(companyId);
    await storage.deleteWeeklyIdeasByCompanyId(companyId);
    await storage.deleteChannelInsightsByCompanyId(companyId);

    // Step 1: Scrape the website
    let websiteContent: string;
    try {
      websiteContent = await scrapeWebsite(companyUrl);
      console.log(`Scraped ${websiteContent.length} chars from ${companyUrl}`);
    } catch (scrapeError) {
      console.error("Scraping failed:", scrapeError);
      // Update company with error status and lastScraped
      await storage.updateCompany(companyId, {
        summary: "We couldn't analyze your website. Please check the URL and try again.",
        lastScraped: new Date(),
      });
      return;
    }

    // Step 2: Analyze with AI
    let analysis;
    try {
      analysis = await analyzeCompany(websiteContent, companyUrl);
      console.log(`AI analysis complete for ${analysis.companyName}`);
    } catch (aiError: any) {
      const errorMessage = aiError?.message || String(aiError);
      const errorStack = aiError?.stack || '';
      console.error("AI analysis failed:", errorMessage);
      console.error("Error details:", errorStack);
      console.error("AI env check - BASE_URL:", process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ? 'set' : 'MISSING');
      console.error("AI env check - API_KEY:", process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? 'set' : 'MISSING');
      await storage.updateCompany(companyId, {
        summary: `AI analysis failed: ${errorMessage.substring(0, 100)}. Please refresh to try again.`,
        lastScraped: new Date(),
      });
      return;
    }

    // Step 3: Update company with analysis results
    await storage.updateCompany(companyId, {
      name: analysis.companyName,
      summary: analysis.summary,
      gtmMotion: analysis.gtmMotion,
      icpScore: analysis.icpScore,
      lastScraped: new Date(),
    });

    // Step 4: Save recommendations
    if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
      for (const rec of analysis.recommendations) {
        try {
          await storage.createRecommendation({
            companyId: companyId,
            category: rec.category || "General",
            title: rec.title || "Recommendation",
            description: rec.description || "",
            impact: rec.impact || "Medium",
            effort: rec.effort || "Medium",
            status: "New",
          });
        } catch (recError) {
          console.error("Failed to save recommendation:", recError);
        }
      }
    }

    // Step 5: Save weekly ideas
    if (analysis.weeklyIdeas && Array.isArray(analysis.weeklyIdeas)) {
      for (const idea of analysis.weeklyIdeas) {
        try {
          await storage.createWeeklyIdea({
            companyId: companyId,
            title: idea.title || "Content Idea",
            description: idea.description || "",
            type: idea.type || "Blog Post",
          });
        } catch (ideaError) {
          console.error("Failed to save weekly idea:", ideaError);
        }
      }
    }

    // Step 6: Save channel insights
    if (analysis.channelInsights && Array.isArray(analysis.channelInsights)) {
      for (const insight of analysis.channelInsights) {
        try {
          await storage.createChannelInsight({
            companyId: companyId,
            channelId: insight.channelId || "General",
            priority: insight.priority || "Medium",
            whyItMatters: insight.whyItMatters || "",
            companyFitSummary: insight.companyFitSummary || "",
            heroStat: insight.heroStat || { value: "N/A", label: "Stat" },
            topKpis: insight.topKpis || [],
            strategicPillars: insight.strategicPillars || [],
            quickWins: insight.quickWins || [],
            resources: insight.resources || [],
          });
        } catch (insightError) {
          console.error("Failed to save channel insight:", insightError);
        }
      }
    }

    // Step 7: Send welcome email (decoupled from data pipeline)
    try {
      await sendWelcomeEmail({
        toEmail: email,
        userName: fullName,
        companyName: analysis.companyName || "Your Company",
        summary: analysis.summary || "Your GTM strategy is ready!",
        gtmMotion: analysis.gtmMotion || "Growth",
        dashboardUrl: "https://gtmchampion.com/dashboard",
      });
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Email failure doesn't affect user experience
    }

    console.log(`Analysis complete for ${analysis.companyName}`);
  } catch (error) {
    console.error(`Failed to process company analysis for company ${companyId}:`, error);
    // Don't throw - just log and let the dashboard show what we have
  }
}
