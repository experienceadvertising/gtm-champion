/**
 * Build-time prerender generator.
 *
 * Produces `client/public/prerender.json`: the fully rendered HTML body for
 * each blog article. The server (`server/seoMeta.ts`) injects this into the
 * page shell for known crawler / LLM user-agents ("dynamic rendering"), so
 * non-JavaScript crawlers — GPTBot, ClaudeBot, PerplexityBot, Google-Extended,
 * etc. — receive the real article content instead of an empty SPA root.
 */
import { build } from "esbuild";
import { writeFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { pathToFileURL } from "url";
import { renderArticleMarkdown } from "../shared/markdown";
import {
  HERO,
  STEPS,
  CHANNELS,
  CHANNEL_GROUPS,
  FAQ_ITEMS,
} from "../shared/siteContent";

interface Article {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  imageAlt: string;
  author: string;
  publishDate: string;
  modifiedDate: string;
  readTime: string;
  category: string;
  tags: string[];
  content: string;
}

export interface PrerenderArticle {
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

export interface PrerenderManifest {
  articles: PrerenderArticle[];
  pages: Record<string, string>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHomeHtml(): string {
  const steps = STEPS.map(
    (s) =>
      `<li><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.description)}</p></li>`,
  ).join("");

  const channelGroups = Object.values(CHANNEL_GROUPS)
    .map((group) => {
      const items = group.channels
        .map((id) => {
          const ch = CHANNELS.find((c) => c.id === id);
          const desc = ch ? `: ${escapeHtml(ch.description)}` : "";
          return `<li>${escapeHtml(id)}${desc}</li>`;
        })
        .join("");
      return `<section><h3>${escapeHtml(group.label)}</h3><ul>${items}</ul></section>`;
    })
    .join("");

  const faqs = FAQ_ITEMS.map(
    (f) =>
      `<section><h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p></section>`,
  ).join("");

  return (
    `<main id="main-content">` +
    `<section><h1>${escapeHtml(HERO.headline)}</h1>` +
    `<p>${escapeHtml(HERO.subhead)}</p>` +
    `<p><a href="/auth">Analyze my website free</a></p></section>` +
    `<section aria-label="How it works"><h2>From URL to Full Strategy in 3 Steps</h2><ol>${steps}</ol></section>` +
    `<section aria-label="Marketing channels"><h2>Strategies for Every Marketing Channel</h2>${channelGroups}</section>` +
    `<section aria-label="Frequently asked questions"><h2>Frequently Asked Questions</h2>${faqs}</section>` +
    `<nav aria-label="Site"><a href="/blog">Blog</a> · <a href="/about">About</a> · <a href="/contact">Contact</a></nav>` +
    `</main>`
  );
}

function buildBlogHtml(articles: Article[]): string {
  const items = articles
    .map(
      (a) =>
        `<li><article>` +
        `<h2><a href="/blog/${a.slug}">${escapeHtml(a.title)}</a></h2>` +
        `<p>${escapeHtml(a.category)} · ${escapeHtml(a.readTime)}</p>` +
        `<p>${escapeHtml(a.excerpt)}</p>` +
        `</article></li>`,
    )
    .join("");
  return (
    `<main id="main-content">` +
    `<nav aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li>Blog</li></ol></nav>` +
    `<h1>GTM Champion Blog</h1>` +
    `<p>Expert insights on Go-To-Market strategy, B2B SaaS marketing, and growth tactics for modern companies.</p>` +
    `<ul>${items}</ul>` +
    `</main>`
  );
}

const stubAssetsPlugin = {
  name: "stub-assets",
  setup(b: import("esbuild").PluginBuild) {
    b.onResolve({ filter: /^@assets\// }, (args) => ({
      path: args.path,
      namespace: "stub-asset",
    }));
    b.onResolve({ filter: /\.(webp|png|jpe?g|svg|gif|avif)$/ }, (args) => ({
      path: args.path,
      namespace: "stub-asset",
    }));
    b.onLoad({ filter: /.*/, namespace: "stub-asset" }, () => ({
      contents: 'export default "";',
      loader: "js",
    }));
  },
};

async function loadArticles(articlesFile: string): Promise<Article[]> {
  const tmp = mkdtempSync(path.join(tmpdir(), "gtm-prerender-"));
  const outfile = path.join(tmp, "articles.mjs");
  try {
    await build({
      entryPoints: [articlesFile],
      bundle: true,
      format: "esm",
      platform: "node",
      outfile,
      logLevel: "silent",
      plugins: [stubAssetsPlugin],
    });
    const mod = await import(pathToFileURL(outfile).href);
    return (mod.articles ?? []) as Article[];
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function generatePrerender(): Promise<number> {
  const root = process.cwd();
  const articlesFile = path.resolve(root, "client", "src", "data", "articles.ts");
  const outPath = path.resolve(root, "client", "public", "prerender.json");

  const articles = await loadArticles(articlesFile);
  const entries: PrerenderArticle[] = articles.map((a) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    author: a.author,
    category: a.category,
    readTime: a.readTime,
    publishDate: a.publishDate,
    modifiedDate: a.modifiedDate,
    tags: a.tags,
    contentHtml: renderArticleMarkdown(a.content),
  }));

  const manifest: PrerenderManifest = {
    articles: entries,
    pages: {
      "/": buildHomeHtml(),
      "/blog": buildBlogHtml(articles),
    },
  };

  writeFileSync(outPath, JSON.stringify(manifest), "utf-8");
  console.log(
    `[prerender] wrote ${entries.length} article bodies + ${Object.keys(manifest.pages).length} page bodies to prerender.json`,
  );
  return entries.length;
}

const invokedDirectly =
  import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (invokedDirectly) {
  generatePrerender().catch((err) => {
    console.error("[prerender] failed:", err);
    process.exit(1);
  });
}
