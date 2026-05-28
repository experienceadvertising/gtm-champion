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

export function loadArticleMeta(distPath: string) {
  const filePath = path.join(distPath, "article-meta.json");
  if (!fs.existsSync(filePath)) return;
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

export function injectMeta(html: string, reqPath: string): string {
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
