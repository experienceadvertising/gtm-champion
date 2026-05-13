import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://gtmchampion.com';

const STATIC_ROUTES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/blog', changefreq: 'weekly', priority: '0.9' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
];

type ArticleEntry = { slug: string; modifiedDate: string };

function parseArticles(articlesFile: string): ArticleEntry[] {
  const source = fs.readFileSync(articlesFile, 'utf-8');
  const entries: ArticleEntry[] = [];
  const slugRegex = /slug:\s*"([^"]+)"/g;
  const modifiedRegex = /modifiedDate:\s*"([^"]+)"/g;

  const slugs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = slugRegex.exec(source)) !== null) slugs.push(m[1]);

  const dates: string[] = [];
  while ((m = modifiedRegex.exec(source)) !== null) dates.push(m[1]);

  for (let i = 0; i < slugs.length; i++) {
    entries.push({ slug: slugs[i], modifiedDate: dates[i] ?? new Date().toISOString().slice(0, 10) });
  }
  return entries;
}

function buildSitemap(articles: ArticleEntry[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls: string[] = [];

  for (const route of STATIC_ROUTES) {
    urls.push(
      `  <url>\n    <loc>${SITE_URL}${route.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`
    );
  }

  for (const article of articles) {
    urls.push(
      `  <url>\n    <loc>${SITE_URL}/blog/${article.slug}</loc>\n    <lastmod>${article.modifiedDate}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function sitemapPlugin(): Plugin {
  const articlesFile = path.resolve(process.cwd(), 'client', 'src', 'data', 'articles.ts');
  const outputFile = path.resolve(process.cwd(), 'client', 'public', 'sitemap.xml');

  function generate() {
    if (!fs.existsSync(articlesFile)) {
      console.warn('[sitemap] articles file not found, skipping');
      return;
    }
    const articles = parseArticles(articlesFile);
    const xml = buildSitemap(articles);
    fs.writeFileSync(outputFile, xml, 'utf-8');
    console.log(`[sitemap] wrote ${articles.length + STATIC_ROUTES.length} URLs to ${outputFile}`);
  }

  return {
    name: 'vite-plugin-sitemap',
    buildStart() {
      generate();
    },
    configureServer() {
      generate();
    },
  };
}
