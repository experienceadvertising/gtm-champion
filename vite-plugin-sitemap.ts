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

type ArticleEntry = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  imageAlt: string;
  publishDate: string;
  modifiedDate: string;
  ogImage: string;
};

function extractField(block: string, field: string): string {
  const re = new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = re.exec(block);
  if (!m) return '';
  return m[1].replace(/\\"/g, '"');
}

function extractImageVar(block: string): string {
  const re = /\bimage:\s*(\w+)/;
  const m = re.exec(block);
  return m ? m[1] : '';
}

function findImportSource(source: string, varName: string): string {
  const re = new RegExp(`import\\s+${varName}\\s+from\\s+"@assets/([^"]+)"`);
  const m = re.exec(source);
  return m ? m[1] : '';
}

function copyOgImage(
  assetsDir: string,
  publicDir: string,
  relPath: string,
  slug: string
): string {
  const srcPath = path.resolve(assetsDir, relPath);
  if (!fs.existsSync(srcPath)) return '';
  const ext = path.extname(relPath);
  const ogDir = path.join(publicDir, 'og');
  if (!fs.existsSync(ogDir)) fs.mkdirSync(ogDir, { recursive: true });
  const destName = `${slug}${ext}`;
  const destPath = path.join(ogDir, destName);
  fs.copyFileSync(srcPath, destPath);
  return `/og/${destName}`;
}

function parseArticles(articlesFile: string, publicDir: string): ArticleEntry[] {
  const source = fs.readFileSync(articlesFile, 'utf-8');
  const assetsDir = path.resolve(path.dirname(articlesFile), '..', '..', '..', 'attached_assets');
  const entries: ArticleEntry[] = [];
  const blockRegex = /\{\s*slug:\s*"([^"]+)"[\s\S]*?(?=\n\s{2}\}(?:,|\s*\];))/g;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(source)) !== null) {
    const block = m[0];
    const slug = m[1];

    let ogImage = '';
    const imageVar = extractImageVar(block);
    if (imageVar) {
      const relPath = findImportSource(source, imageVar);
      if (relPath) {
        ogImage = copyOgImage(assetsDir, publicDir, relPath, slug);
      }
    }

    entries.push({
      slug,
      metaTitle: extractField(block, 'metaTitle'),
      metaDescription: extractField(block, 'metaDescription'),
      imageAlt: extractField(block, 'imageAlt'),
      publishDate: extractField(block, 'publishDate') || new Date().toISOString().slice(0, 10),
      modifiedDate: extractField(block, 'modifiedDate') || new Date().toISOString().slice(0, 10),
      ogImage,
    });
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
  const publicDir = path.resolve(process.cwd(), 'client', 'public');
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  const metaPath = path.join(publicDir, 'article-meta.json');

  function generate() {
    if (!fs.existsSync(articlesFile)) {
      console.warn('[sitemap] articles file not found, skipping');
      return;
    }
    const articles = parseArticles(articlesFile, publicDir);
    fs.writeFileSync(sitemapPath, buildSitemap(articles), 'utf-8');
    fs.writeFileSync(metaPath, JSON.stringify(articles, null, 2), 'utf-8');
    console.log(`[sitemap] wrote ${articles.length + STATIC_ROUTES.length} URLs and ${articles.length} article meta entries`);
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
