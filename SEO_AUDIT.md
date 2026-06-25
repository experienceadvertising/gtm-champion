# Technical SEO Audit — GTM Champion

_Audit date: 2026-06-25_

## 1. Architecture summary

GTM Champion is a single-page application:

- **Client:** React 19 + Vite 7, routed with Wouter, meta managed by `react-helmet-async`.
- **Server:** Express (TypeScript, bundled to CJS via esbuild). Serves the built SPA and a JSON API.
- **SEO infrastructure already in place (good foundation):**
  - Per-route `<meta>`/`<title>`/canonical/OG/Twitter injection on the server (`server/seoMeta.ts`, applied in both prod `server/static.ts` and dev `server/vite.ts`).
  - Build-time `sitemap.xml` + `article-meta.json` generation (`vite-plugin-sitemap.ts`).
  - Rich JSON-LD: `Organization`, `WebSite`, `SoftwareApplication`, `FAQPage` (home); `BlogPosting` + `BreadcrumbList` (articles); `Blog` + `ItemList` (blog index).
  - Strong semantic HTML, `aria-label`s, skip links, heading hierarchy, `loading`/`decoding`/`width`/`height` on images, WebP assets, compression, long-lived asset caching, HSTS/CSP/security headers.

This is an above-average baseline. The audit therefore focuses on the gaps that materially limit organic and AI-search visibility.

## 2. Findings & prioritized recommendations

Ranked by expected SEO impact (High → Low).

### P0 — Dynamic rendering for AI / non-JS crawlers  *(highest impact)*
**Problem:** The body is rendered entirely client-side. The server injects `<head>` meta but `<body>` is just `<div id="root"></div>`. Crawlers that **do not execute JavaScript** — `GPTBot`/`OAI-SearchBot` (ChatGPT), `ClaudeBot`, `PerplexityBot`, `Google-Extended`, plus most social/LLM fetchers — receive an empty page. The 17 blog articles' actual text is invisible to them.
**Why it matters:** This is the single biggest miss. The product literally sells "AI search visibility / LLM optimization," yet its own content can't be read by the LLM crawlers that power AI Overviews, ChatGPT, Claude, and Perplexity citations. Googlebot does render JS, but server-delivered content is crawled faster and more reliably and saves crawl budget.
**Fix:** Build-time prerender of article body HTML + User-Agent-based "dynamic rendering": when a known bot requests an article, inject the real `<main>` content into `#root`. Real users (JS) get the normal SPA with zero flash; bots get full text. This is Google-sanctioned dynamic rendering, not cloaking (identical content).
**Expected impact:** Unlocks eligibility for AI Overview / ChatGPT / Perplexity / Claude citations and faster, more reliable Google indexing of all article content. High.

### P1 — robots.txt is missing
**Problem:** No `robots.txt` exists. Search engines get no sitemap pointer and no crawl guidance; AI crawlers get no explicit allowance; private app routes get no disallow.
**Why it matters:** `robots.txt` is the first file every crawler requests. Without it: the sitemap must be discovered manually, and `/api/*`, `/dashboard`, `/admin` may be crawled, wasting crawl budget.
**Fix:** Add `robots.txt` that allows general + AI crawlers to public content, disallows app/API routes, and references the sitemap.
**Expected impact:** Better crawl efficiency, explicit AI-bot opt-in, sitemap auto-discovery. High.

### P1 — Private/app routes indexable to non-JS crawlers
**Problem:** `/auth` has **no** robots directive at all. `/dashboard`, `/admin`, `/content-tools`, `/emails` set `noindex` only via client-side Helmet, which requires JS. Non-JS crawlers (and Google pre-render) see the default `index, follow` from `index.html`.
**Why it matters:** Private/utility pages can be indexed, creating thin/duplicate results and diluting site quality signals.
**Fix:** Inject `noindex` for these routes at the **server** level (works without JS), backed by `robots.txt` disallow. Also add a client-side `noindex` to `/auth`.
**Expected impact:** Keeps the index limited to high-value public pages. Medium-High.

### P2 — Soft 404s
**Problem:** Unknown URLs return HTTP 200 with the SPA shell; only client-side JS adds `noindex`.
**Fix:** Server-inject `noindex` for any route not in the known set (static routes + real article slugs). (Returning a hard 404 status is possible but riskier for an SPA; `noindex` is the safe, effective mitigation.)
**Expected impact:** Prevents indexing of junk URLs. Medium.

### P2 — `og:image` clobbered by Replit domain in production
**Problem:** `vite-plugin-meta-images.ts` rewrites `og:image`/`twitter:image` to `https://<replit-domain>/opengraph.png` whenever a Replit domain env var is present — overriding the canonical `gtmchampion.com` image and pointing share previews at a non-canonical host.
**Fix:** Prefer the canonical production domain; only fall back to the Replit preview domain in non-production preview deploys.
**Expected impact:** Consistent, canonical social/share previews. Medium.

### P3 — Structured-data & metadata polish
- `Organization` schema is minimal — add `contactPoint`, `slogan`, and richer `sameAs`.
- Home FAQ duplicates content between the `FAQPage` JSON-LD and the rendered FAQ — keep them in sync (already aligned; preserve going forward).
- Sitemap `lastmod` for static routes uses the build date (cosmetic).
**Expected impact:** Incremental rich-result eligibility and entity clarity. Low-Medium.

### P3 — Asset/code hygiene
- `public/` (repo root) is vestigial — Vite's `publicDir` is `client/public`; the root copy is unused.
- Home `og-image.png` is ~977 KB (not render-blocking, but heavy for a share asset).
**Expected impact:** Maintainability; minor. Low.

## 3. What is already correct (preserve)
Per-route server meta, canonical tags, sitemap automation, JSON-LD coverage, semantic HTML + a11y (skip links, aria, landmarks), responsive images with dimensions, WebP, compression, security headers, lazy-loaded route chunks, single H1 per page.

## 4. Implementation order
1. `robots.txt` (P1) — quick, high value.
2. Server-side indexability control: noindex private + unknown routes (P1/P2).
3. Dynamic rendering for article content (P0) — headline change.
4. `og:image` plugin fix + structured-data polish (P2/P3).
5. Build, verify (bot vs. user HTML), final re-audit.

Every change is verified with `tsc` and a production build, and checked to ensure real-user rendering is unaffected.
