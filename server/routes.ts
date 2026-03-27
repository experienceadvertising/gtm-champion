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

  return httpServer;
}
