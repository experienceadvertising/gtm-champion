import fs from "fs";
import path from "path";

const SITE_URL = "https://gtmchampion.com";

interface RouteMeta {
  title: string;
  description: string;
  url: string;
  type?: string;
  publishedTime?: string;
  modifiedTime?: string;
  ogImage?: string;
}

interface ArticleMeta {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  imageAlt: string;
  publishDate: string;
  modifiedDate: string;
  ogImage?: string;
}

interface PrerenderArticle {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  readTime: string;
  publishDate: string;
  modifiedDate: string;
  tags: string[];
  contentHtml: string;
}

const STATIC_META: Record<string, RouteMeta> = {
  "/": {
    title: "GTM Champion - AI-Powered Go-To-Market Strategy for B2B SaaS",
    description:
      "AI-powered Go-To-Market strategy for B2B SaaS. Analyze your website and get personalized recommendations across 13 marketing channels in seconds.",
    url: `${SITE_URL}/`,
    type: "website",
  },
  "/about": {
    title: "About GTM Champion - Our Mission to Democratize Go-To-Market Strategy",
    description:
      "Learn why GTM Champion exists: a free, AI-powered Go-To-Market platform helping B2B SaaS founders and marketers build winning growth strategies across 13 channels.",
    url: `${SITE_URL}/about`,
    type: "website",
  },
  "/contact": {
    title: "Contact GTM Champion - Get in Touch",
    description:
      "Have questions about Go-To-Market strategy or GTM Champion? Reach out by email or LinkedIn — we typically respond within one business day.",
    url: `${SITE_URL}/contact`,
    type: "website",
  },
  "/privacy": {
    title: "Privacy Policy - GTM Champion",
    description:
      "GTM Champion's privacy policy: how we collect, use, and protect data when you use our AI-powered Go-To-Market strategy platform.",
    url: `${SITE_URL}/privacy`,
    type: "website",
  },
  "/terms": {
    title: "Terms of Service - GTM Champion",
    description:
      "Read the terms of service for using GTM Champion, the free AI-powered Go-To-Market strategy platform for B2B SaaS companies.",
    url: `${SITE_URL}/terms`,
    type: "website",
  },
  "/blog": {
    title: "GTM Champion Blog - B2B SaaS Marketing Insights",
    description:
      "Expert insights on Go-To-Market strategy, B2B SaaS marketing, and growth tactics. Learn from proven strategies across SEO, content, ABM, and more.",
    url: `${SITE_URL}/blog`,
    type: "website",
  },
};

const articleMetaMap = new Map<string, ArticleMeta>();

// Routes that should never be indexed (private/app/utility pages). These are
// enforced server-side so the directive is present even for crawlers that do
// not execute JavaScript (the client-side Helmet noindex is JS-dependent).
const NOINDEX_PREFIXES = [
  "/auth",
  "/dashboard",
  "/admin",
  "/content-tools",
  "/emails",
  "/api",
];

const prerenderMap = new Map<string, PrerenderArticle>();

export function loadArticleMeta(distPath: string) {
  const filePath = path.join(distPath, "article-meta.json");
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as ArticleMeta[];
      for (const article of data) {
        articleMetaMap.set(article.slug, article);
      }
      console.log(`[seo-meta] loaded ${articleMetaMap.size} article meta entries`);
    } catch (err) {
      console.error("[seo-meta] failed to load article-meta.json:", err);
    }
  }

  const prerenderPath = path.join(distPath, "prerender.json");
  if (fs.existsSync(prerenderPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(prerenderPath, "utf-8")) as PrerenderArticle[];
      for (const article of data) {
        prerenderMap.set(article.slug, article);
      }
      console.log(`[seo-meta] loaded ${prerenderMap.size} prerendered article bodies`);
    } catch (err) {
      console.error("[seo-meta] failed to load prerender.json:", err);
    }
  }
}

// Search engines, AI/LLM crawlers, and social/link-preview fetchers that
// benefit from (or require) server-delivered HTML content.
const BOT_UA_RE =
  /googlebot|bingbot|duckduckbot|yandex|baiduspider|applebot|slurp|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexitybot|google-extended|ccbot|bytespider|amazonbot|meta-externalagent|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|embedly|redditbot|pinterest|petalbot/i;

export function isBotUserAgent(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return BOT_UA_RE.test(userAgent);
}

function isPrivateRoute(reqPath: string): boolean {
  return NOINDEX_PREFIXES.some(
    (p) => reqPath === p || reqPath.startsWith(`${p}/`),
  );
}

/**
 * Decide the robots directive for a route:
 * - public, known routes (home, marketing, blog, real articles) → index, follow
 * - private/app routes → noindex, nofollow
 * - unknown routes (soft 404) → noindex, follow
 */
function robotsForRoute(reqPath: string): string | null {
  if (isPrivateRoute(reqPath)) return "noindex, nofollow";
  if (metaForRoute(reqPath)) return null; // known public route → keep default index
  return "noindex, follow"; // unknown route → mitigate soft 404
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function metaForRoute(reqPath: string): RouteMeta | null {
  if (STATIC_META[reqPath]) return STATIC_META[reqPath];

  const articleMatch = /^\/blog\/([^/]+)\/?$/.exec(reqPath);
  if (articleMatch) {
    const slug = articleMatch[1];
    const article = articleMetaMap.get(slug);
    if (article) {
      return {
        title: article.metaTitle,
        description: article.metaDescription,
        url: `${SITE_URL}/blog/${article.slug}`,
        type: "article",
        publishedTime: article.publishDate,
        modifiedTime: article.modifiedDate,
        ogImage: article.ogImage ? `${SITE_URL}${article.ogImage}` : undefined,
      };
    }
  }
  return null;
}

function applyRobots(html: string, reqPath: string): string {
  const robots = robotsForRoute(reqPath);
  if (!robots) return html;
  return html.replace(
    /<meta name="robots" content="[^"]*" \/>/,
    `<meta name="robots" content="${robots}" />`,
  );
}

/**
 * Build a server-rendered <main> for a route, used only for crawler/LLM
 * user-agents (dynamic rendering). The same content the SPA renders for users
 * — never bot-specific text — so this is not cloaking. Real users with JS get
 * the normal empty SPA root and React renders client-side as before.
 */
function buildBotBody(reqPath: string): string | null {
  const articleMatch = /^\/blog\/([^/]+)\/?$/.exec(reqPath);
  if (articleMatch) {
    const article = prerenderMap.get(articleMatch[1]);
    if (article) {
      const url = `${SITE_URL}/blog/${article.slug}`;
      const date = escapeHtml(article.publishDate);
      const tags = article.tags
        .map((t) => `<li>${escapeHtml(t)}</li>`)
        .join("");
      return (
        `<nav aria-label="Breadcrumb"><ol>` +
        `<li><a href="/">Home</a></li>` +
        `<li><a href="/blog">Blog</a></li>` +
        `<li>${escapeHtml(article.title)}</li>` +
        `</ol></nav>` +
        `<main id="main-content"><article>` +
        `<header>` +
        `<p>${escapeHtml(article.category)}</p>` +
        `<h1>${escapeHtml(article.title)}</h1>` +
        `<p>${escapeHtml(article.excerpt)}</p>` +
        `<p>By <span>${escapeHtml(article.author)}</span> · ` +
        `<time datetime="${date}">${date}</time> · ${escapeHtml(article.readTime)}</p>` +
        `</header>` +
        article.contentHtml +
        `<footer><ul>${tags}</ul>` +
        `<p><a href="${url}">Read this guide on GTM Champion</a></p>` +
        `<p><a href="/">Get your personalized GTM strategy free</a></p>` +
        `</footer></article></main>`
      );
    }
    return null;
  }

  // For other known public routes, give bots a titled, described landmark
  // instead of an empty root (the rich JSON-LD already lives in <head>).
  const meta = metaForRoute(reqPath);
  if (meta && !isPrivateRoute(reqPath)) {
    return (
      `<main id="main-content">` +
      `<h1>${escapeHtml(meta.title)}</h1>` +
      `<p>${escapeHtml(meta.description)}</p>` +
      `<p><a href="/">GTM Champion home</a> · <a href="/blog">Blog</a></p>` +
      `</main>`
    );
  }

  return null;
}

function injectBotBody(html: string, reqPath: string): string {
  const body = buildBotBody(reqPath);
  if (!body) return html;
  // The SPA mounts with createRoot().render(), which replaces #root's children,
  // so JS users never see this. Non-JS crawlers keep it as the page content.
  return html.replace(
    '<div id="root"></div>',
    `<div id="root">${body}</div>`,
  );
}

export interface InjectOptions {
  isBot?: boolean;
}

export function injectMeta(
  html: string,
  reqPath: string,
  opts: InjectOptions = {},
): string {
  html = applyRobots(html, reqPath);
  if (opts.isBot) {
    html = injectBotBody(html, reqPath);
  }

  const meta = metaForRoute(reqPath);
  if (!meta) return html;

  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const type = escapeHtml(meta.type ?? "website");

  let result = html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="title" content="[^"]*" \/>/, `<meta name="title" content="${title}" />`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${type}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${description}" />`);

  if (meta.ogImage) {
    const imageUrl = escapeHtml(meta.ogImage);
    result = result
      .replace(
        /<meta property="og:image" content="[^"]*" \/>/,
        `<meta property="og:image" content="${imageUrl}" />`
      )
      .replace(
        /<meta name="twitter:image" content="[^"]*" \/>/,
        `<meta name="twitter:image" content="${imageUrl}" />`
      );
  }

  if (meta.publishedTime || meta.modifiedTime) {
    const articleTags: string[] = [];
    if (meta.publishedTime) {
      articleTags.push(`<meta property="article:published_time" content="${escapeHtml(meta.publishedTime)}" />`);
    }
    if (meta.modifiedTime) {
      articleTags.push(`<meta property="article:modified_time" content="${escapeHtml(meta.modifiedTime)}" />`);
    }
    result = result.replace("</head>", `${articleTags.join("\n    ")}\n  </head>`);
  }

  return result;
}
