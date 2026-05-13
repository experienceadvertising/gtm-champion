import type { Express } from "express";
import { type Server } from "http";
import authRouter from "./routes/auth";
import companyRouter from "./routes/company";
import contentRouter from "./routes/content";
import stripeRouter from "./routes/stripe";
import adminRouter from "./routes/admin";
import exportRouter from "./routes/export";
import emailRouter from "./routes/email";
import integrationsRouter from "./routes/integrations";
import notificationsRouter from "./routes/notifications";
import budgetRouter from "./routes/budget";
import personasRouter from "./routes/personas";
import historyRouter from "./routes/history";

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
  "building-b2b-saas-community-guide",
  "llm-aeo-optimization-ai-search",
  "paid-social-advertising-linkedin-meta-guide",
  "retargeting-remarketing-b2b-saas-guide",
  "gtm-strategy-2026-emerging-trends"
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/sitemap.xml", (_req, res) => {
    const baseUrl = "https://gtmchampion.com";
    const today = new Date().toISOString().split('T')[0];
    
    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "weekly" },
      { loc: "/blog", priority: "0.8", changefreq: "weekly" },
      { loc: "/about", priority: "0.6", changefreq: "monthly" },
      { loc: "/contact", priority: "0.5", changefreq: "monthly" },
      { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
      { loc: "/terms", priority: "0.3", changefreq: "yearly" },
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
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  });

  const sitemapVariants = [
    "/sitemap_index.xml", "/sitemap-index.xml", "/sitemaps.xml",
    "/sitemap1.xml", "/post-sitemap.xml", "/page-sitemap.xml", "/sitemap.txt"
  ];
  for (const variant of sitemapVariants) {
    app.get(variant, (_req, res) => {
      res.redirect(301, "/sitemap.xml");
    });
  }

  app.get("/robots.txt", (_req, res) => {
    const robotsTxt = `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /emails
Disallow: /content-tools
Disallow: /admin
Disallow: /api/

Sitemap: https://gtmchampion.com/sitemap.xml

# LLM and AI Crawlers - Welcome!
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Bytespider
Allow: /

User-agent: cohere-ai
Allow: /
`;
    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });

  // LLMs.txt - Structured content for AI crawlers
  app.get("/llms.txt", (_req, res) => {
    const llmsTxt = `# GTM Champion

> AI-powered Go-To-Market strategy platform for B2B SaaS companies. Analyzes your website and generates personalized marketing recommendations across 13 channels.

## What is GTM Champion?

GTM Champion is a free AI-powered platform that helps B2B SaaS companies build and execute Go-To-Market strategies. Enter your website URL, and our AI analyzes your product, audience, and competitive landscape to generate actionable marketing recommendations across 13 channels.

## Key Features

- AI Website Analysis: Automatically scrapes and understands your product, ICP, and positioning
- 13 Channel Strategies: SEO, LLMs/AI Search, Paid Search, Paid Social, Organic Social, Retargeting, CRO, Email Marketing, Content Marketing, Community Building, ABM, Partnerships, Outbound Sales
- Weekly AI Content Sprints: Fresh marketing tactics delivered every Monday
- AI Q&A Assistant: Ask questions about your GTM strategy and get personalized answers
- Content Generation Tools: LinkedIn posts, email campaigns, blog articles
- CRM Integrations: Connect with HubSpot, Salesforce, and other tools

## How It Works

1. Enter your website URL
2. AI scrapes and analyzes your site content
3. Receive personalized GTM strategy with channel-specific recommendations
4. Get weekly content ideas and actionable quick wins
5. Ask the AI assistant follow-up questions about any channel

## Pricing

GTM Champion has two tiers:

- **Free**: GTM analysis across all 13 channels, AI chat (20 messages/min), content tools (10 generations/min), 3 buyer personas, weekly strategy emails, 1 website re-analysis per week, and standard PDF export. No credit card required to start.
- **GTM Champion Pro** ($29/month or $290/year — save ~17%): 10x higher AI limits (200 chat msg/min, 100 content gen/min), unlimited website re-analysis with 12-month strategy history, branded multi-page PDF exports with your logo, up to 8 buyer personas, A/B budget scenarios (conservative/balanced/aggressive), and priority email support.

## Blog Articles

${ARTICLE_SLUGS.map(slug => `- [${slug.replace(/-/g, ' ')}](https://gtmchampion.com/blog/${slug})`).join('\n')}

## Links

- Website: https://gtmchampion.com
- Blog: https://gtmchampion.com/blog
- About: https://gtmchampion.com/about
- Sign Up: https://gtmchampion.com/auth
`;
    res.set('Content-Type', 'text/plain');
    res.send(llmsTxt);
  });

  app.use(authRouter);
  app.use(companyRouter);
  app.use(contentRouter);
  app.use(stripeRouter);
  app.use(adminRouter);
  app.use(exportRouter);
  app.use(emailRouter);
  app.use(integrationsRouter);
  app.use(notificationsRouter);
  app.use(budgetRouter);
  app.use(personasRouter);
  app.use(historyRouter);

  return httpServer;
}
