/**
 * Build-time prerender generator.
 *
 * Produces `client/public/prerender.json`: the fully rendered HTML body for
 * each blog article. The server (`server/seoMeta.ts`) injects this into the
 * page shell for known crawler / LLM user-agents ("dynamic rendering"), so
 * non-JavaScript crawlers — GPTBot, ClaudeBot, PerplexityBot, Google-Extended,
 * etc. — receive the real article content instead of an empty SPA root.
 *
 * Articles are authored in `client/src/data/articles.ts`, which imports image
 * assets via the `@assets/*` alias. We bundle that module with esbuild and stub
 * the asset imports (images are irrelevant to text extraction and are covered
 * separately by og:image meta), then render each body with the shared Markdown
 * renderer so client and prerender output stay identical.
 */
import { build } from "esbuild";
import { writeFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { pathToFileURL } from "url";
import { renderArticleMarkdown } from "../shared/markdown";

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

  writeFileSync(outPath, JSON.stringify(entries), "utf-8");
  console.log(`[prerender] wrote ${entries.length} article bodies to prerender.json`);
  return entries.length;
}

// Allow running directly: `tsx scripts/generate-prerender.ts`
const invokedDirectly =
  import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (invokedDirectly) {
  generatePrerender().catch((err) => {
    console.error("[prerender] failed:", err);
    process.exit(1);
  });
}
