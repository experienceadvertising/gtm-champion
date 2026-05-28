// Dynamic imports to handle ESM modules in CJS bundle
let OpenAI: any;
let cheerioLoad: any;
let pRetryFn: any;

async function initModules() {
  if (!OpenAI) {
    const openaiModule = await import("openai");
    OpenAI = openaiModule.default || openaiModule.OpenAI;
  }
  if (!cheerioLoad) {
    const cheerioModule = await import("cheerio");
    cheerioLoad = cheerioModule.load;
  }
  if (!pRetryFn) {
    const pRetryModule = await import("p-retry");
    pRetryFn = pRetryModule.default || pRetryModule;
  }
}

// Initialize modules immediately
const initPromise = initModules();

// Validate AI integration environment variables
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

if (!baseURL || !apiKey) {
  console.error('Missing AI integration environment variables:');
  console.error('  AI_INTEGRATIONS_OPENAI_BASE_URL:', baseURL ? 'set' : 'MISSING');
}

// Helper function to check if error is rate limit or quota violation
function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

export interface ChannelInsight {
  channelId: string;
  priority: "High" | "Medium" | "Low";
  whyItMatters: string;
  companyFitSummary: string;
  heroStat: { value: string; label: string };
  topKpis: string[];
  strategicPillars: Array<{
    title: string;
    objective: string;
    tactics: string[];
    measurement: string;
  }>;
  quickWins: Array<{
    title: string;
    steps: string[];
    effort: "Low" | "Medium";
    duration: string;
  }>;
  resources: string[];
}

export interface CompanyAnalysis {
  companyName: string;
  summary: string;
  gtmMotion: string;
  icpScore: number;
  recommendations: Array<{
    category: string;
    title: string;
    description: string;
    impact: "High" | "Medium" | "Low";
    effort: "High" | "Medium" | "Low";
  }>;
  weeklyIdeas: Array<{
    title: string;
    description: string;
    type: string;
  }>;
  channelInsights: ChannelInsight[];
}

function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 0) return true;
  }
  if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  return false;
}

async function validateUrl(urlString: string): Promise<void> {
  const parsed = new URL(urlString);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error("Only http and https protocols are allowed");
  }
  const hostname = parsed.hostname;
  if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error("Invalid URL: private or internal addresses are not allowed");
  }
  if (isPrivateIp(hostname)) {
    throw new Error("Invalid URL: private or internal addresses are not allowed");
  }
  const dns = await import('dns');
  const { promisify } = await import('util');
  const resolve4 = promisify(dns.resolve4);
  try {
    const addresses = await resolve4(hostname);
    for (const addr of addresses) {
      if (isPrivateIp(addr)) {
        throw new Error("Invalid URL: resolves to a private or internal address");
      }
    }
  } catch (err: any) {
    if (err.message?.includes("Invalid URL")) throw err;
  }
}

export interface ScrapedSite {
  combinedContent: string;
  pages: Record<string, string>;
}

async function fetchWithJinaReader(url: string): Promise<{ content: string; links: string[] }> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    console.log(`Fetching via Jina Reader: ${jinaUrl}`);
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (compatible; GTMChampionBot/1.0)',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Jina HTTP ${response.status}`);
    const text = await response.text();
    if (text.length < 100) throw new Error('Jina returned too little content');

    const linkRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
    const links: string[] = [];
    let match;
    while ((match = linkRegex.exec(text)) !== null) {
      links.push(match[2]);
    }

    console.log(`Jina Reader returned ${text.length} chars, ${links.length} links`);
    return { content: text.slice(0, 5000), links };
  } catch (error) {
    console.error('Jina Reader failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

async function fetchAndParsePageDirect(url: string): Promise<{ content: string; links: string[] }> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GTMChampionBot/1.0; +https://gtmchampion.com)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const $ = cheerioLoad(html);

  const links = $('a[href]').map((_: any, el: any) => $(el).attr('href')).get() as string[];

  $('script, style, iframe, noscript').remove();

  const title = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const h1 = $('h1').first().text().trim();
  const headings = $('h2, h3').map((_: any, el: any) => $(el).text().trim()).get().slice(0, 12);
  const paragraphs = $('p').map((_: any, el: any) => $(el).text().trim()).get().filter((p: string) => p.length > 25).slice(0, 20);
  const listItems = $('li').map((_: any, el: any) => $(el).text().trim()).get().filter((l: string) => l.length > 15 && l.length < 200).slice(0, 15);
  const blockquotes = $('blockquote, .testimonial, [class*="testimonial"], [class*="quote"], [class*="review"]')
    .map((_: any, el: any) => $(el).text().trim()).get().filter((q: string) => q.length > 20).slice(0, 10);
  const pricing = $('[class*="pricing"], [class*="price"], [class*="plan"], [class*="tier"], [data-price], .pricing-card, .plan-card')
    .map((_: any, el: any) => $(el).text().trim()).get().filter((p: string) => p.length > 10 && p.length < 500).slice(0, 8);

  const contentParts = [
    `Title: ${title}`,
    metaDesc ? `Meta: ${metaDesc}` : '',
    h1 ? `H1: ${h1}` : '',
    headings.length ? `Headings: ${headings.join(' | ')}` : '',
    paragraphs.length ? `Content: ${paragraphs.join(' ')}` : '',
    listItems.length ? `Features/List: ${listItems.join(' | ')}` : '',
    blockquotes.length ? `Quotes/Testimonials: ${blockquotes.join(' | ')}` : '',
    pricing.length ? `Pricing: ${pricing.join(' | ')}` : '',
  ].filter(Boolean).join('\n');

  const substantiveContent = paragraphs.length + headings.length + listItems.length;
  const isJsRendered = substantiveContent <= 1 && (
    html.includes('__NEXT_DATA__') || html.includes('__nuxt') || 
    html.includes('id="app"') || html.includes('id="root"') ||
    html.includes('id="__next"') || html.includes('bundle.js') ||
    html.includes('chunk.js') || html.includes('webpack') ||
    paragraphs.length === 0
  );

  if (isJsRendered) {
    console.log(`Page appears JS-rendered (${substantiveContent} substantive elements, ${paragraphs.length} paragraphs). Needs JS rendering.`);
  }

  return { content: contentParts.slice(0, 4000), links, ...(isJsRendered ? { jsRendered: true as const } : {}) };
}

async function fetchAndParsePage(url: string): Promise<{ content: string; links: string[] }> {
  await initPromise;

  let directResult: { content: string; links: string[]; jsRendered?: true } | null = null;
  let directFailed = false;

  try {
    directResult = await fetchAndParsePageDirect(url);
  } catch (err) {
    console.log(`Direct scrape failed for ${url}: ${err instanceof Error ? err.message : err}`);
    directFailed = true;
  }

  const needsJina = directFailed 
    || directResult?.jsRendered 
    || (directResult && directResult.content.length < 300);

  if (needsJina) {
    const reason = directFailed ? 'direct fetch failed' : directResult?.jsRendered ? 'JS-rendered page' : 'thin content';
    console.log(`Falling back to Jina Reader (${reason}, direct content: ${directResult?.content.length ?? 0} chars)...`);
    try {
      const jinaResult = await fetchWithJinaReader(url);
      return jinaResult;
    } catch {
      console.log('Jina Reader fallback also failed');
      if (directResult) return directResult;
      throw new Error(`Both direct scrape and Jina Reader failed for ${url}`);
    }
  }

  return directResult!;
}

function discoverSubpages(baseUrl: string, links: string[]): Record<string, string> {
  const parsed = new URL(baseUrl);
  const baseOrigin = parsed.origin;
  const patterns: Record<string, RegExp> = {
    pricing: /\/(pricing|plans|packages)\b/i,
    about: /\/(about|company|team|our-story)\b/i,
    features: /\/(features|product|solutions|platform|capabilities)\b/i,
    customers: /\/(customers|case-studies|testimonials|success-stories|reviews)\b/i,
    blog: /\/(blog|resources|insights|articles|news)\b/i,
  };

  const found: Record<string, string> = {};
  for (const link of links) {
    try {
      const resolved = new URL(link, baseOrigin);
      if (resolved.origin !== baseOrigin) continue;
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') continue;
      const fullUrl = resolved.href;
      for (const [key, pattern] of Object.entries(patterns)) {
        if (!found[key] && pattern.test(fullUrl)) {
          found[key] = fullUrl;
        }
      }
    } catch {}
  }
  return found;
}

export async function scrapeWebsite(url: string): Promise<string> {
  const result = await scrapeWebsiteDeep(url);
  return result.combinedContent;
}

export async function scrapeWebsiteDeep(url: string): Promise<ScrapedSite> {
  await initPromise;

  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    await validateUrl(normalizedUrl);

    const homepageResult = await fetchAndParsePage(normalizedUrl);
    const pages: Record<string, string> = { homepage: homepageResult.content };

    const subpageUrls = discoverSubpages(normalizedUrl, homepageResult.links);
    console.log(`Discovered subpages: ${Object.keys(subpageUrls).join(', ') || 'none'}`);

    const subpageEntries = Object.entries(subpageUrls);
    if (subpageEntries.length > 0) {
      const subpageResults = await Promise.allSettled(
        subpageEntries.map(async ([key, subUrl]) => {
          const result = await fetchAndParsePage(subUrl);
          return { key, content: result.content };
        })
      );

      for (const result of subpageResults) {
        if (result.status === 'fulfilled') {
          pages[result.value.key] = result.value.content;
          console.log(`  Scraped ${result.value.key}: ${result.value.content.length} chars`);
        }
      }
    }

    const sections = Object.entries(pages).map(([key, content]) =>
      `=== ${key.toUpperCase()} PAGE ===\n${content}`
    );
    const combinedContent = sections.join('\n\n').slice(0, 15000);

    return { combinedContent, pages };
  } catch (error) {
    console.error('Error scraping website:', error);
    throw new Error(`Failed to scrape website: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

import type { SiteProfile } from "@shared/schema";

export async function extractCompanyProfile(scrapedContent: string, companyUrl: string): Promise<SiteProfile> {
  await initPromise;

  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  const prompt = `Analyze the following multi-page website scrape and extract a structured company profile. Be SPECIFIC — use exact names, numbers, and quotes found on the site. If something isn't found, use empty arrays/strings.

Website URL: ${companyUrl}

SCRAPED CONTENT:
${scrapedContent.slice(0, 10000)}

Extract and return JSON:
{
  "productNames": ["Exact product/service names mentioned on the site"],
  "primaryCategory": "The PRIMARY product category this company competes in. Be PRECISE and specific to the actual product type. Examples: 'CRM', 'Marketing Automation', 'Project Management', 'DevOps', 'AI Assistant', 'Large Language Model', 'Generative AI Platform', 'AI Code Assistant', 'Data Analytics', 'HR Software', 'Cybersecurity', 'Communication', 'ERP', 'Cloud Infrastructure', 'Design Tool', 'Video Platform', 'Payment Processing', etc. Choose the CORE category based on what the product actually IS, not what it can be used for. For example, an AI chatbot/LLM should be categorized as 'AI Assistant' or 'Large Language Model', NOT as 'Productivity' or 'Writing Tool'.",
  "features": ["Specific features, capabilities, or selling points - be detailed"],
  "pricingTiers": [{"name": "Tier name", "price": "Exact price shown", "details": "What's included"}],
  "testimonials": [{"quote": "Exact quote from the site", "author": "Person name", "role": "Their title/company"}],
  "competitors": ["Companies that compete in the SAME primary category — the product must be the same TYPE. E.g., if the product is a CRM, list other CRMs (Salesforce, Zoho); if it's an AI assistant/LLM, list other AI assistants (ChatGPT, Gemini, Copilot); if it's project management, list Asana, Monday.com. Do NOT list companies from adjacent but different categories. Do NOT list tools that use the product (e.g., don't list Notion as a competitor to an LLM just because Notion has AI features)."],
  "brandVoice": "Describe the writing style in 1-2 sentences (e.g., 'Technical and developer-focused with casual humor' or 'Enterprise-formal with emphasis on security and compliance')",
  "existingChannels": [{"channel": "Blog/YouTube/LinkedIn/Podcast/Docs/Newsletter/etc", "url": "URL if found", "status": "Active/Found"}],
  "icpDetails": {
    "persona": "Target buyer persona (e.g., 'Engineering managers at mid-market SaaS companies')",
    "companySize": "Target company size (e.g., '50-500 employees')",
    "industry": "Target industry or vertical",
    "painPoints": ["Specific pain points the product solves, from the site copy"]
  },
  "contentGaps": ["Content types or topics the company is genuinely MISSING — only list gaps you are CERTAIN about based on the scraped content. If pricing IS shown on the site, do NOT say 'No pricing'. If testimonials exist, do NOT say 'No testimonials'. If a blog/articles section exists, do NOT say 'No blog'. Only list things that are truly absent. Examples of VALID gaps: 'No comparison pages vs competitors', 'No ROI calculator', 'No video content', 'No developer documentation'"],
  "keyDifferentiators": ["What makes this company different from competitors, based on their messaging"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 2500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI (profile extraction)");

    const result = JSON.parse(content);
    return {
      productNames: result.productNames || [],
      primaryCategory: result.primaryCategory || '',
      features: result.features || [],
      pricingTiers: result.pricingTiers || [],
      testimonials: result.testimonials || [],
      competitors: result.competitors || [],
      brandVoice: result.brandVoice || '',
      existingChannels: result.existingChannels || [],
      icpDetails: result.icpDetails || { persona: '', companySize: '', industry: '', painPoints: [] },
      contentGaps: result.contentGaps || [],
      keyDifferentiators: result.keyDifferentiators || [],
    };
  } catch (error: any) {
    console.error("Profile extraction failed (non-blocking):", error?.message || error);
    return {
      productNames: [],
      primaryCategory: '',
      features: [],
      pricingTiers: [],
      testimonials: [],
      competitors: [],
      brandVoice: '',
      existingChannels: [],
      icpDetails: { persona: '', companySize: '', industry: '', painPoints: [] },
      contentGaps: [],
      keyDifferentiators: [],
    };
  }
}

async function captureWithScreenshotApi(normalizedUrl: string): Promise<string | null> {
  const apiKey = process.env.SCREENSHOT_API_KEY;
  if (!apiKey) {
    console.log('SCREENSHOT_API_KEY not set, skipping screenshotapi.net');
    return null;
  }

  const apiUrl = `https://shot.screenshotapi.net/screenshot?token=${apiKey}&url=${encodeURIComponent(normalizedUrl)}&output=image&file_type=png&wait_for_event=load&delay=1000&width=1280&height=900&full_page=false`;

  const response = await fetch(apiUrl, {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    console.log(`screenshotapi.net returned ${response.status}`);
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('image')) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = `data:image/png;base64,${buffer.toString('base64')}`;
    return base64;
  }

  const data = await response.json() as Record<string, unknown>;
  if (data?.screenshot && typeof data.screenshot === 'string') {
    return data.screenshot;
  }

  console.log('No screenshot data from screenshotapi.net');
  return null;
}

async function captureWithPageSpeed(normalizedUrl: string): Promise<string | null> {
  const googleScreenshotUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&category=PERFORMANCE&strategy=DESKTOP`;

  const response = await fetch(googleScreenshotUrl, {
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    console.log(`PageSpeed API returned ${response.status}`);
    return null;
  }

  const data = await response.json() as Record<string, unknown>;
  const lighthouseResult = data?.lighthouseResult as Record<string, unknown> | undefined;
  const audits = lighthouseResult?.audits as Record<string, Record<string, unknown>> | undefined;
  const screenshot = (audits?.['final-screenshot']?.details as Record<string, unknown>)?.data as string | undefined;

  if (screenshot && typeof screenshot === 'string') {
    return screenshot;
  }

  console.log('No screenshot data in PageSpeed response');
  return null;
}

export async function captureScreenshot(url: string): Promise<string | null> {
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    await validateUrl(normalizedUrl);

    console.log(`Capturing screenshot for ${normalizedUrl}...`);
    const startTime = Date.now();

    const result = await captureWithScreenshotApi(normalizedUrl);
    if (result) {
      console.log(`Screenshot captured via screenshotapi.net in ${Date.now() - startTime}ms`);
      return result;
    }

    console.log('Falling back to Google PageSpeed for screenshot...');
    const fallbackResult = await captureWithPageSpeed(normalizedUrl);
    if (fallbackResult) {
      console.log(`Screenshot captured via PageSpeed fallback in ${Date.now() - startTime}ms`);
      return fallbackResult;
    }

    console.log('Both screenshot services failed');
    return null;
  } catch (error) {
    console.error('Screenshot capture failed (non-blocking):', error instanceof Error ? error.message : error);
    return null;
  }
}

export interface PageSpeedData {
  performanceScore: number;
  coreWebVitals: {
    lcp: { value: number; rating: string };
    fid: { value: number; rating: string };
    cls: { value: number; rating: string };
    inp: { value: number; rating: string };
    fcp: { value: number; rating: string };
    ttfb: { value: number; rating: string };
  };
  opportunities: Array<{
    title: string;
    description: string;
    savings: string;
  }>;
}

function extractMetricRating(value: number, thresholds: [number, number]): string {
  if (value <= thresholds[0]) return 'good';
  if (value <= thresholds[1]) return 'needs-improvement';
  return 'poor';
}

export async function fetchPageSpeedInsights(url: string): Promise<PageSpeedData | null> {
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    await validateUrl(normalizedUrl);

    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&category=PERFORMANCE&strategy=DESKTOP`;

    console.log(`Fetching PageSpeed insights for ${normalizedUrl}...`);
    const startTime = Date.now();

    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.log(`PageSpeed API returned ${response.status}, skipping insights`);
      return null;
    }

    const data = await response.json() as Record<string, unknown>;
    const lighthouse = data?.lighthouseResult as Record<string, unknown> | undefined;
    if (!lighthouse) {
      console.log('No Lighthouse data in PageSpeed response');
      return null;
    }

    interface LighthouseAudit {
      numericValue?: number;
      title?: string;
      description?: string;
      score?: number;
      details?: { type?: string; overallSavingsMs?: number };
    }

    const categories = (lighthouse.categories || {}) as Record<string, { score?: number }>;
    const audits = (lighthouse.audits || {}) as Record<string, LighthouseAudit>;

    const performanceScore = Math.round((categories.performance?.score || 0) * 100);

    const lcpMs = audits['largest-contentful-paint']?.numericValue || 0;
    const fidMs = audits['max-potential-fid']?.numericValue || 0;
    const clsVal = audits['cumulative-layout-shift']?.numericValue || 0;
    const inpMs = audits['interaction-to-next-paint']?.numericValue || audits['experimental-interaction-to-next-paint']?.numericValue || 0;
    const fcpMs = audits['first-contentful-paint']?.numericValue || 0;
    const ttfbMs = audits['server-response-time']?.numericValue || 0;

    const coreWebVitals = {
      lcp: { value: Math.round(lcpMs), rating: extractMetricRating(lcpMs, [2500, 4000]) },
      fid: { value: Math.round(fidMs), rating: extractMetricRating(fidMs, [100, 300]) },
      cls: { value: Math.round(clsVal * 1000) / 1000, rating: extractMetricRating(clsVal, [0.1, 0.25]) },
      inp: { value: Math.round(inpMs), rating: extractMetricRating(inpMs, [200, 500]) },
      fcp: { value: Math.round(fcpMs), rating: extractMetricRating(fcpMs, [1800, 3000]) },
      ttfb: { value: Math.round(ttfbMs), rating: extractMetricRating(ttfbMs, [800, 1800]) },
    };

    const opportunityAudits = Object.values(audits).filter((a) =>
      a.details?.type === 'opportunity' && (a.details?.overallSavingsMs ?? 0) > 0
    );

    const opportunities = opportunityAudits
      .sort((a, b) => (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0))
      .slice(0, 5)
      .map((a) => ({
        title: a.title || 'Untitled',
        description: (a.description || '').replace(/\[.*?\]\(.*?\)/g, '').trim().substring(0, 200),
        savings: `${((a.details?.overallSavingsMs || 0) / 1000).toFixed(1)}s`,
      }));

    console.log(`PageSpeed insights captured in ${Date.now() - startTime}ms (score: ${performanceScore})`);
    return { performanceScore, coreWebVitals, opportunities };
  } catch (error) {
    console.error('PageSpeed insights failed (non-blocking):', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function analyzeScreenshot(screenshotBase64: string, companyUrl: string): Promise<string> {
  await initPromise;
  
  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a B2B SaaS marketing and UX expert. Analyze this screenshot of ${companyUrl} and provide insights on:

1. **Visual Brand Assessment**: Color scheme, typography, imagery quality, overall design professionalism (1-10 scale)
2. **Above-the-fold Effectiveness**: Is the value proposition clear? Is there a strong CTA? Hero section quality
3. **Trust Signals**: Are there logos, testimonials, social proof, security badges visible?
4. **Conversion Optimization**: Form placement, CTA clarity, friction points
5. **Mobile-readiness Indicators**: Layout suggests responsive design or not
6. **Key UX Issues**: Any obvious usability problems

Keep your analysis concise (200-300 words) and actionable, focused on what they could improve for better conversion.`
            },
            {
              type: "image_url",
              image_url: {
                url: screenshotBase64.startsWith('data:') ? screenshotBase64 : `data:image/jpeg;base64,${screenshotBase64.replace(/^data:image\/\w+;base64,/, '')}`,
                detail: "low"
              }
            }
          ]
        }
      ],
      max_completion_tokens: 1024,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Visual analysis failed (non-blocking):', error instanceof Error ? error.message : error);
    return '';
  }
}

const CORE_STRATEGIES = `
## ORGANIC MARKETING STRATEGIES

1. **Full-Funnel Content Engine**
   - ToFu: SEO-optimized blogs, guides, thought-leadership (companies that blog generate 67% more leads)
   - MoFu: Webinars, whitepapers, case studies (73% of B2B marketers rate webinars as best lead source)
   - BoFu: Demos, free trials, ROI calculators (67% of sales reps say tailored content improves closing)

2. **SEO & Answer-Engine Optimization (AEO)**
   - Traditional SEO still foundational (81% say SEO produces better lead quality than PPC)
   - AEO for AI-powered engines: structured data, concise answers, conversational language
   - 51% of companies plan to increase AEO investment in ${new Date().getFullYear()}

3. **Community & Thought Leadership**
   - Community-led growth via LinkedIn groups, Slack channels, forums
   - Partner marketing and cross-promotion with complementary SaaS providers
   - B2B influencer marketing with genuine experts (CTOs, consultants)

4. **Email Marketing & Marketing Automation**
   - Email yields $40 ROI for every $1 spent
   - Segmented emails see 26% higher engagement
   - First-party data personalization based on product usage and behavior

5. **Conversion Rate Optimization (CRO)**
   - Continuous CRO is essential before scaling (focus on messaging and offers, not button colors)
   - Strong value propositions and compelling case studies drive sign-ups

6. **Retargeting & Nurture**
   - Retargeting across LinkedIn, Google Display with light daily budgets
   - Multi-channel nurture combining retargeting, email, and social

## PAID MARKETING STRATEGIES

7. **LinkedIn & Social Advertising**
   - LinkedIn provides best ROAS for B2B (targeting by company size, industry, job title)
   - LinkedIn Thought Leader Ads: Sponsor posts from executives/employees for 2-3x higher engagement vs brand ads
   - LinkedIn Message Ads: Direct InMail campaigns with 50%+ open rates for high-value offers
   - LinkedIn Conversation Ads: Interactive chatbot-style ads for lead qualification
   - Short-form video delivers highest ROI; authentic founder videos outperform polished productions
   - Exit Meta ads for B2B pipeline (low ROI)

8. **Paid Search & AEO/PPC**
   - Branded search ads protect brand and capture high-intent prospects
   - Eliminate non-branded paid search unless proven (rising CPCs, low ROI)

9. **Intent-Based Outbound & Cold Email**
   - Timeline-based hooks (funding events, expansion) yield 2.3x higher reply rates
   - Intent data-driven outreach; avoid mass AI SDR automation

10. **Account-Based Marketing (ABM)**
    - 94% of B2B marketers employ ABM; 99% report higher ROI vs traditional marketing
    - Coordinated efforts across marketing, sales, customer success
    - Use ABM for acquisition, retention, and expansion

11. **Partner & Ecosystem Marketing**
    - Fastest-growing GTM motion (67% planning increased partner revenue)
    - Affiliate programs: 20-30% of revenue, launch after strong conversion rates
    - Data-driven PartnerOps with forecasting

12. **Product-Led Growth (PLG)**
    - Best for ACV below $5k where users can quickly experience value
    - Top PLG companies achieve 65%+ activation rates, 120%+ NRR
    - Self-service trials, freemium models, in-product onboarding

13. **AI & Automation in Paid Marketing**
    - AI for predictive analytics, audience segmentation, creative testing, bid optimization
    - Connect advertising platforms to intent data for automatic budget shifts
`;

async function analyzeCoreCompany(openai: any, websiteContent: string, companyUrl: string, visualInsights: string, siteProfile?: SiteProfile): Promise<Omit<CompanyAnalysis, 'channelInsights'>> {
  const visualBlock = visualInsights
    ? `\n\nVisual Analysis of Website Screenshot:\n${visualInsights}\n`
    : '';

  const profileBlock = siteProfile ? `

EXTRACTED COMPANY PROFILE (use this data to make recommendations HIGHLY specific):
- PRIMARY CATEGORY: ${siteProfile.primaryCategory || 'Not detected'} — THIS is the product category. All competitor comparisons MUST be against other ${siteProfile.primaryCategory || 'similar'} products, NOT adjacent tools.
- Product Names: ${siteProfile.productNames.join(', ') || 'Not detected'}
- Key Features: ${siteProfile.features.slice(0, 8).join(', ') || 'Not detected'}
- Pricing: ${siteProfile.pricingTiers.map(t => `${t.name}: ${t.price}`).join(', ') || 'Not detected'}
- Direct Competitors (same category): ${siteProfile.competitors.join(', ') || 'Not detected'}
- Brand Voice: ${siteProfile.brandVoice || 'Not detected'}
- Key Differentiators: ${siteProfile.keyDifferentiators.join(', ') || 'Not detected'}
- Target ICP: ${siteProfile.icpDetails?.persona || 'Not detected'} (${siteProfile.icpDetails?.companySize || ''}, ${siteProfile.icpDetails?.industry || ''})
- Pain Points: ${siteProfile.icpDetails?.painPoints?.join(', ') || 'Not detected'}
- Existing Channels: ${siteProfile.existingChannels.map(c => c.channel).join(', ') || 'None detected'}
- Content Gaps: ${siteProfile.contentGaps.join(', ') || 'None detected'}
- Testimonials: ${siteProfile.testimonials.slice(0, 3).map(t => `"${t.quote.slice(0, 80)}" — ${t.author}`).join(' | ') || 'None found'}
` : '';

  const prompt = `You are a B2B SaaS marketing expert specializing in Go-To-Market strategies. Analyze the following website and recommend strategies from the proven ${new Date().getFullYear()} B2B SaaS marketing playbook below.

${CORE_STRATEGIES}

---

Website URL: ${companyUrl}

Website Content:
${websiteContent}
${visualBlock}${profileBlock}
---

Based on this company's business model, target audience, and current positioning, provide strategic recommendations.

PERSONALIZATION RULES (CRITICAL):
${siteProfile?.primaryCategory ? `- This company is a ${siteProfile.primaryCategory} product. ALL competitor comparisons and "vs" content MUST reference other ${siteProfile.primaryCategory} tools (${siteProfile?.competitors?.join(', ') || 'competitors'}), NOT tools from adjacent categories.` : ''}
- Reference the company's ACTUAL product names and features in every recommendation (e.g., "Create a comparison page: ${siteProfile?.productNames?.[0] || 'YourProduct'} vs ${siteProfile?.competitors?.[0] || 'Competitor'}")
- Use REAL pricing in strategies (e.g., "Highlight your ${siteProfile?.pricingTiers?.[0]?.price || '$X/mo'} starting price in ad copy")
- Reference SPECIFIC direct competitors by name — only companies in the same ${siteProfile?.primaryCategory || 'product'} category
- If existing channels were detected, acknowledge them and recommend improvements rather than starting from scratch
- Address detected content gaps specifically
- For each recommendation, indicate whether it serves a PLG self-serve funnel, a sales-assisted motion, or both (gtmFunnel field)
- Every recommendation description must include at least one specific product name, feature, or competitor — zero generic filler allowed

Provide your analysis in the following JSON format:
{
  "companyName": "Extract the company name",
  "summary": "A 2-3 sentence summary of what the company does and who they serve",
  "gtmMotion": "The primary GTM motion (e.g., 'Product-Led Growth', 'Enterprise Sales-Led', 'Partner & Ecosystem-Led', 'Content & Community-Led', 'PLG + Sales Hybrid')",
  "icpScore": "A score from 1-100 indicating how clear their ICP is",
  "recommendations": [
    {
      "category": "One of: SEO, LLMs, Paid Search, Paid Social, Organic Social, Retargeting, CRO, Email Marketing, Content, Community, ABM, Partnerships, Outbound",
      "title": "A specific, actionable recommendation referencing THIS company's products",
      "description": "Detailed description using the company's actual product names, features, pricing, and competitors. Include specific tactics and expected outcomes.",
      "impact": "High, Medium, or Low",
      "effort": "High, Medium, or Low",
      "gtmFunnel": "plg, sales, or both — which go-to-market motion does this serve?"
    }
  ],
  "weeklyIdeas": [
    {
      "title": "Specific content idea title referencing this company",
      "description": "Step-by-step execution guide for this week using the company's real product details, customer quotes, and competitive positioning",
      "type": "One of: Blog Post, LinkedIn Post, Email Campaign, Webinar, Case Study, Partner Content"
    }
  ]
}

Generate 10-14 recommendations across ALL channels and 4 weekly content ideas. Make ALL content deeply specific to THIS company — generic advice is NOT acceptable.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 5000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI (core)");

  const result = JSON.parse(content);
  if (!result.companyName || !result.summary || !result.recommendations) {
    throw new Error("Invalid AI response structure (core)");
  }
  return result;
}

async function analyzeChannelBatch(openai: any, channels: string[], companyName: string, companySummary: string, gtmMotion: string, websiteContent: string, siteProfile?: SiteProfile): Promise<ChannelInsight[]> {
  const categoryRef = siteProfile?.primaryCategory || '';
  const profileContext = siteProfile ? `
COMPANY PROFILE:
- PRIMARY CATEGORY: ${categoryRef || 'N/A'} — all comparisons MUST be against other ${categoryRef || 'similar'} products
- Products: ${siteProfile.productNames.join(', ') || 'N/A'}
- Features: ${siteProfile.features.slice(0, 6).join(', ') || 'N/A'}
- Pricing: ${siteProfile.pricingTiers.map(t => `${t.name}: ${t.price}`).join(', ') || 'N/A'}
- Direct Competitors (same ${categoryRef || 'product'} category): ${siteProfile.competitors.join(', ') || 'N/A'}
- Differentiators vs these competitors: ${siteProfile.keyDifferentiators.join(', ') || 'N/A'}
- ICP: ${siteProfile.icpDetails?.persona || 'N/A'}, ${siteProfile.icpDetails?.companySize || ''}
- Existing Channels: ${siteProfile.existingChannels.map(c => c.channel).join(', ') || 'None'}
` : '';

  const productRef = siteProfile?.productNames?.[0] || companyName;
  const competitorRef = siteProfile?.competitors?.slice(0, 3).join(', ') || 'competitors';
  const channelList = channels.join(', ');

  const featureRef = siteProfile?.features?.slice(0, 3).join(', ') || '';
  const pricingRef = siteProfile?.pricingTiers?.map(t => `${t.name}: ${t.price}`).join(', ') || '';
  const painPointRef = siteProfile?.icpDetails?.painPoints?.slice(0, 3).join(', ') || '';

  const prompt = `You are a B2B SaaS marketing expert. Generate DEEPLY PERSONALIZED channel insights for ${companyName}.

Company: ${companyName}
Summary: ${companySummary}
GTM Motion: ${gtmMotion}
${profileContext}
Website Content:
${websiteContent.slice(0, 3500)}

PERSONALIZATION RULES (CRITICAL — generic advice is REJECTED):
${categoryRef ? `0. ${companyName} is a ${categoryRef} product. ALL competitor comparisons, "vs" pages, and positioning tactics MUST reference other ${categoryRef} tools (${competitorRef}). Do NOT compare against tools from adjacent categories.` : ''}
1. Every tactic MUST name "${productRef}" specifically — never say "the product" or "your tool"
2. Reference competitors (${competitorRef}) BY NAME in comparison tactics, ad copy, and content ideas — these are direct ${categoryRef || 'category'} competitors
3. Use REAL features (${featureRef}) in tactical descriptions, not vague capabilities
${pricingRef ? `4. Reference actual pricing (${pricingRef}) in conversion and ad tactics` : ''}
${painPointRef ? `5. Address customer pain points (${painPointRef}) in messaging tactics` : ''}
6. Quick win steps must be actionable THIS WEEK with ${companyName}'s actual assets, not hypothetical
7. Strategic pillar titles must reference ${companyName}'s specific ${categoryRef || 'market'} position
8. Comparison pages/content must be "${productRef} vs [direct ${categoryRef || 'category'} competitor]" format — e.g., "${productRef} vs ${siteProfile?.competitors?.[0] || 'Competitor'}"

Generate insights for ONLY these channels: ${channelList}
channelId MUST be one of EXACTLY: ${channelList}

JSON format:
{
  "channelInsights": [
    {
      "channelId": "EXACT channel name from list above",
      "priority": "High/Medium/Low",
      "whyItMatters": "2-3 sentences specific to ${companyName} and its market",
      "companyFitSummary": "1-2 sentences on why this channel fits ${companyName}'s GTM",
      "heroStat": { "value": "Stat", "label": "Label" },
      "topKpis": ["3-4 KPIs"],
      "strategicPillars": [
        { "title": "Initiative name referencing ${productRef}", "objective": "Goal tied to ${companyName}", "tactics": ["3-4 tactics naming ${productRef} and competitors"], "measurement": "Specific metric" }
      ],
      "quickWins": [
        { "title": "Quick win naming ${productRef}", "steps": ["Concrete steps using ${companyName}'s real assets"], "effort": "Low/Medium", "duration": "Timeframe" }
      ],
      "resources": ["Relevant tools"]
    }
  ]
}

Include ALL ${channels.length} channels: ${channelList}. Each needs 2 strategicPillars and 2 quickWins. Every single tactic must name ${productRef} or ${competitorRef} — zero generic filler.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 6000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`No response from AI (channels: ${channelList})`);

  const result = JSON.parse(content);
  return result.channelInsights || [];
}

async function analyzeChannels(openai: any, companyName: string, companySummary: string, gtmMotion: string, websiteContent: string, siteProfile?: SiteProfile, onBatchReady?: (insights: ChannelInsight[]) => Promise<void>): Promise<ChannelInsight[]> {
  const validChannelIds = ['SEO', 'Content', 'LLMs', 'CRO', 'Email Marketing', 'Paid Search', 'Paid Social', 'Organic Social', 'Retargeting', 'Community', 'ABM', 'Partnerships', 'Outbound'];
  const batches = [
    ['SEO', 'Content', 'LLMs', 'CRO', 'Email Marketing'],
    ['Paid Search', 'Paid Social', 'Organic Social', 'Retargeting'],
    ['Community', 'ABM', 'Partnerships', 'Outbound'],
  ];

  console.log(`Calling AI for channel insights in ${batches.length} parallel batches...`);
  const startTime = Date.now();

  const allInsights: ChannelInsight[] = [];
  const failedBatches: { batch: string[]; index: number }[] = [];

  const normalizeBatch = (insights: ChannelInsight[]) => {
    return insights.map(insight => {
      const match = validChannelIds.find(id => id.toLowerCase() === insight.channelId?.toLowerCase());
      return match ? { ...insight, channelId: match } : insight;
    }).filter(insight => validChannelIds.includes(insight.channelId));
  };

  const results = await Promise.allSettled(
    batches.map((batch, i) =>
      analyzeChannelBatch(openai, batch, companyName, companySummary, gtmMotion, websiteContent, siteProfile)
        .then(async (insights) => {
          const normalized = normalizeBatch(insights);
          console.log(`  Batch ${i + 1} done: ${normalized.length} channels in ${Date.now() - startTime}ms`);
          allInsights.push(...normalized);
          if (onBatchReady && normalized.length > 0) {
            await onBatchReady(normalized).catch(err => console.error(`  Failed to save batch ${i + 1}:`, err));
          }
          return { insights: normalized, index: i };
        })
    )
  );

  for (const r of results) {
    if (r.status === 'rejected') {
      const idx = results.indexOf(r);
      console.error(`  Batch ${idx + 1} failed:`, r.reason?.message || r.reason);
      failedBatches.push({ batch: batches[idx], index: idx });
    }
  }

  if (failedBatches.length > 0) {
    console.log(`Retrying ${failedBatches.length} failed batch(es)...`);
    for (const { batch, index } of failedBatches) {
      try {
        const retryInsights = await analyzeChannelBatch(openai, batch, companyName, companySummary, gtmMotion, websiteContent, siteProfile);
        const normalized = normalizeBatch(retryInsights);
        console.log(`  Retry batch ${index + 1} done: ${normalized.length} channels`);
        allInsights.push(...normalized);
        if (onBatchReady && normalized.length > 0) {
          await onBatchReady(normalized).catch(err => console.error(`  Failed to save retry batch ${index + 1}:`, err));
        }
      } catch (err: any) {
        console.error(`  Retry batch ${index + 1} also failed:`, err?.message || err);
      }
    }
  }

  console.log(`All channel insights done: ${allInsights.length} channels in ${Date.now() - startTime}ms`);
  if (allInsights.length === 0) {
    throw new Error('All channel insight batches failed');
  }
  return allInsights;
}

export async function analyzeCompany(websiteContent: string, companyUrl: string, visualInsights?: string): Promise<CompanyAnalysis> {
  await initPromise;
  
  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  const startTime = Date.now();
  console.log(`Starting parallel AI analysis for ${companyUrl}...`);

  return pRetryFn(
    async () => {
      try {
        const coreResult = await analyzeCoreCompany(openai, websiteContent, companyUrl, visualInsights || '');
        console.log(`Core analysis done in ${Date.now() - startTime}ms, starting channel insights...`);

        const channelInsights = await analyzeChannels(
          openai,
          coreResult.companyName,
          coreResult.summary,
          coreResult.gtmMotion,
          websiteContent
        );
        console.log(`Channel insights done in ${Date.now() - startTime}ms total`);

        return {
          ...coreResult,
          channelInsights,
          weeklyIdeas: coreResult.weeklyIdeas || [],
        };
      } catch (error: any) {
        if (!isRateLimitError(error)) {
          throw Object.assign(error, { name: 'AbortError' });
        }
        throw error;
      }
    },
    {
      retries: 7,
      minTimeout: 2000,
      maxTimeout: 128000,
      factor: 2,
    }
  );
}

export interface CoreAnalysisResult {
  companyName: string;
  summary: string;
  gtmMotion: string;
  icpScore: number;
  recommendations: CompanyAnalysis['recommendations'];
  weeklyIdeas: CompanyAnalysis['weeklyIdeas'];
}

export async function analyzeCompanyFast(websiteContent: string, companyUrl: string, visualInsights?: string, siteProfile?: SiteProfile): Promise<CoreAnalysisResult> {
  await initPromise;
  
  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  return pRetryFn(
    async () => {
      try {
        return await analyzeCoreCompany(openai, websiteContent, companyUrl, visualInsights || '', siteProfile);
      } catch (error: any) {
        if (!isRateLimitError(error)) {
          throw Object.assign(error, { name: 'AbortError' });
        }
        throw error;
      }
    },
    { retries: 5, minTimeout: 2000, maxTimeout: 60000, factor: 2 }
  );
}

export async function analyzeCompanyChannels(
  companyName: string, summary: string, gtmMotion: string, websiteContent: string, siteProfile?: SiteProfile,
  onBatchReady?: (insights: ChannelInsight[]) => Promise<void>
): Promise<ChannelInsight[]> {
  await initPromise;
  
  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  return pRetryFn(
    async () => {
      try {
        return await analyzeChannels(openai, companyName, summary, gtmMotion, websiteContent, siteProfile, onBatchReady);
      } catch (error: any) {
        if (!isRateLimitError(error)) {
          throw Object.assign(error, { name: 'AbortError' });
        }
        throw error;
      }
    },
    { retries: 5, minTimeout: 2000, maxTimeout: 60000, factor: 2 }
  );
}

export async function generateWeeklyIdeas(companyName: string, summary: string, gtmMotion: string): Promise<Array<{ title: string; description: string; type: string }>> {
  await initPromise;
  
  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  return pRetryFn(
    async () => {
      try {
        const prompt = `You are a B2B SaaS marketing expert using the ${new Date().getFullYear()} marketing playbook. Generate 4 fresh, actionable content ideas for this week.

Company: ${companyName}
What they do: ${summary}
GTM Motion: ${gtmMotion}

Use these proven B2B SaaS content strategies:
- ToFu content: SEO-optimized blogs, guides, thought-leadership articles
- MoFu content: Webinars (73% of B2B marketers rate as best lead source), case studies, whitepapers
- LinkedIn content: Short-form video delivers highest ROI; authentic founder content outperforms polished productions
- Community content: Partner cross-promotion, influencer collaborations with genuine experts
- Email campaigns: Segmented, personalized nurture sequences (26% higher engagement)
- AEO content: Structured answers for AI-powered search engines

Provide your ideas in the following JSON format:
{
  "ideas": [
    {
      "title": "Specific, compelling content idea title",
      "description": "Step-by-step execution guide including specific tactics and expected outcomes",
      "type": "One of: Blog Post, LinkedIn Post, Email Campaign, Webinar, Case Study, Partner Content"
    }
  ]
}

Focus on timely, trend-aware ideas that align with their GTM motion and can drive measurable engagement this week.`;

        const response = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response from AI");
        }

        const result = JSON.parse(content);
        return result.ideas || [];
      } catch (error: any) {
        if (!isRateLimitError(error)) {
          throw Object.assign(error, { name: 'AbortError' });
        }
        throw error;
      }
    },
    {
      retries: 7,
      minTimeout: 2000,
      maxTimeout: 128000,
      factor: 2,
    }
  );
}

export interface ChatContext {
  companyName: string;
  summary: string;
  gtmMotion: string;
  channelId?: string;
  channelInsight?: ChannelInsight;
}

export interface LinkedInPostRequest {
  topic: string;
  tone: 'thought-leader' | 'educational' | 'storytelling' | 'promotional';
  authorRole: string;
}

export interface EmailCampaignRequest {
  campaignType: 'welcome' | 'nurture' | 'promotional' | 're-engagement';
  emailCount: number;
  goal: string;
}

export interface BlogArticleRequest {
  topic: string;
  targetKeyword: string;
  articleType: 'how-to' | 'listicle' | 'thought-leadership' | 'case-study';
}

export async function answerQuestion(
  question: string,
  context: ChatContext
): Promise<string> {
  await initPromise;
  
  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  // Safely format channel context with detailed insights
  let channelContext = '';
  if (context.channelId && context.channelInsight) {
    const insight = context.channelInsight;
    const pillars = insight.strategicPillars?.slice(0, 2).map(p => 
      `${p.title}: ${p.objective} (Tactics: ${p.tactics?.slice(0, 2).join(', ') || 'N/A'})`
    ).join('\n  ') || 'No pillars defined';
    
    const quickWins = insight.quickWins?.slice(0, 2).map(w => 
      `${w.title} (${w.duration}, ${w.effort} effort)`
    ).join(', ') || 'No quick wins defined';

    channelContext = `

CURRENT CHANNEL FOCUS: ${context.channelId}
Channel Priority for This Company: ${insight.priority || 'Medium'}
Why ${context.channelId} Matters for ${context.companyName}: ${insight.whyItMatters || 'Channel-specific analysis available'}
Company Fit Summary: ${insight.companyFitSummary || 'Good fit for their GTM motion'}
Key Performance Indicator: ${insight.heroStat?.value || 'N/A'} (${insight.heroStat?.label || 'metric'})
KPIs to Track: ${insight.topKpis?.slice(0, 4).join(', ') || 'Standard channel metrics'}
Strategic Pillars:
  ${pillars}
Quick Wins Available: ${quickWins}
Recommended Tools: ${insight.resources?.slice(0, 3).join(', ') || 'Standard tools'}`;
  }

  // Build comprehensive system prompt
  const companyContext = context.summary && context.summary !== 'Analyzing your website...' 
    ? context.summary 
    : 'A B2B SaaS company';

  const systemPrompt = `You are GTM Champion AI, a B2B SaaS Go-To-Market expert advisor. Provide personalized, actionable advice based on the company's specific context.

=== COMPANY PROFILE ===
Company Name: ${context.companyName || 'The Company'}
Business Description: ${companyContext}
Primary GTM Motion: ${context.gtmMotion || 'Growth-focused'}${channelContext}

=== YOUR EXPERTISE (${new Date().getFullYear()} B2B SaaS Playbook) ===
CONTENT & SEO:
- ToFu blogs generate 67% more leads; SEO produces better lead quality than PPC (81% agree)
- Webinars are the #1 lead source (73% of B2B marketers); case studies close deals
- Answer Engine Optimization (AEO) is rising; 51% increasing investment for AI search

PAID & SOCIAL:
- LinkedIn provides best B2B ROAS; short-form video delivers highest ROI
- Authentic founder content outperforms polished production
- Retargeting with light daily budgets across LinkedIn/Google Display

SALES & ABM:
- 94% of B2B marketers use ABM; 99% report higher ROI than traditional marketing
- Intent-based outbound with timeline hooks yields 2.3x higher reply rates
- Email marketing returns $40 for every $1 spent; segmentation increases engagement 26%

GROWTH:
- PLG works best for ACV below $5k; top companies achieve 65%+ activation, 120%+ NRR
- Partnerships are the fastest-growing GTM motion; affiliates drive 20-30% of revenue

=== RESPONSE GUIDELINES ===
1. ALWAYS reference ${context.companyName || 'the company'}'s specific business and GTM motion (${context.gtmMotion || 'their strategy'})
2. Provide 2-3 specific, actionable tactics (not generic advice)
3. Include relevant benchmarks or stats when helpful
4. Keep responses concise and well-structured — use short paragraphs
5. If discussing a channel, give concrete first steps they can take this week
6. Use markdown formatting: ## for section headers, **bold** for key terms, - for bullet lists, numbered lists for steps
7. Break up long text into scannable sections with headers and bullets — never write walls of text`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_completion_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return content;
  } catch (error: any) {
    console.error("AI chat error:", error);
    const errMsg = error?.message || String(error);
    if (errMsg.includes('rate') || errMsg.includes('quota')) {
      throw new Error("AI service is busy. Please try again in a moment.");
    }
    throw new Error("Unable to get AI response. Please try again.");
  }
}

export interface ContentContext {
  companyName: string;
  summary: string;
  gtmMotion: string;
  siteProfile?: SiteProfile | null;
}

function buildProfileContext(ctx: ContentContext): string {
  const p = ctx.siteProfile;
  if (!p) return '';
  const parts = [];
  if (p.productNames.length) parts.push(`- Products: ${p.productNames.join(', ')}`);
  if (p.features.length) parts.push(`- Key Features: ${p.features.slice(0, 6).join(', ')}`);
  if (p.pricingTiers.length) parts.push(`- Pricing: ${p.pricingTiers.map(t => `${t.name}: ${t.price}`).join(', ')}`);
  if (p.competitors.length) parts.push(`- Competitors: ${p.competitors.join(', ')}`);
  if (p.keyDifferentiators.length) parts.push(`- Differentiators: ${p.keyDifferentiators.join(', ')}`);
  if (p.brandVoice) parts.push(`- Brand Voice: ${p.brandVoice}`);
  if (p.testimonials.length) parts.push(`- Customer Quotes: ${p.testimonials.slice(0, 3).map(t => `"${t.quote.slice(0, 80)}" — ${t.author}`).join(' | ')}`);
  if (p.icpDetails?.persona) parts.push(`- Target Audience: ${p.icpDetails.persona}`);
  if (!parts.length) return '';
  return `\nCOMPANY PROFILE (use these REAL details in the content):\n${parts.join('\n')}\n`;
}

export async function generateLinkedInPost(
  request: LinkedInPostRequest,
  context: ContentContext
): Promise<{ posts: Array<{ content: string; hook: string; cta: string }> }> {
  await initPromise;
  
  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  const toneDescriptions = {
    'thought-leader': 'Authoritative, insightful, sharing unique perspectives and industry wisdom',
    'educational': 'Informative, helpful, teaching something valuable to the reader',
    'storytelling': 'Narrative-driven, personal, sharing experiences and lessons learned',
    'promotional': 'Compelling, value-focused, highlighting benefits without being salesy'
  };

  const profileCtx = buildProfileContext(context);
  const voiceInstruction = context.siteProfile?.brandVoice
    ? `\n- IMPORTANT: Match the company's brand voice: "${context.siteProfile.brandVoice}"`
    : '';

  const prompt = `You are a LinkedIn content expert for B2B SaaS companies. Generate 3 LinkedIn posts for a ${request.authorRole} at ${context.companyName}.

COMPANY CONTEXT:
- Company: ${context.companyName}
- What they do: ${context.summary}
- GTM Motion: ${context.gtmMotion}
${profileCtx}
POST REQUIREMENTS:
- Topic: ${request.topic}
- Tone: ${request.tone} (${toneDescriptions[request.tone]})
- Author Role: ${request.authorRole}${voiceInstruction}

PERSONALIZATION RULES:
- Reference actual product names and features (not generic "our product")
- Include real differentiators and specific capabilities
- If testimonials are available, weave in real customer quotes for social proof
- Use the company's actual competitive positioning

LINKEDIN BEST PRACTICES FOR B2B:
- Hook in first line (pattern interrupt, bold statement, or intriguing question)
- Short paragraphs (1-2 sentences max)
- Use line breaks for readability
- Include specific numbers/stats when relevant
- End with a clear call-to-action or question to drive engagement
- Optimal length: 150-300 words
- Avoid hashtags in the main content (add 3-5 relevant ones at the end)

Return JSON:
{
  "posts": [
    {
      "hook": "The attention-grabbing first line",
      "content": "Full post content including the hook, formatted with line breaks",
      "cta": "The call-to-action or engagement question"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 6000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("LinkedIn generation: empty response. Finish reason:", response.choices[0]?.finish_reason, "Usage:", JSON.stringify(response.usage));
      throw new Error("AI was unable to generate content. Please try again.");
    }
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("LinkedIn post generation error:", error?.message || error);
    throw new Error("Failed to generate LinkedIn posts. Please try again.");
  }
}

export async function generateEmailCampaign(
  request: EmailCampaignRequest,
  context: ContentContext
): Promise<{ emails: Array<{ subject: string; preheader: string; body: string; sendTiming: string }> }> {
  await initPromise;
  
  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  const campaignDescriptions = {
    'welcome': 'New user onboarding sequence to activate and engage new signups',
    'nurture': 'Lead nurturing sequence to educate and build trust with prospects',
    'promotional': 'Product/feature promotion to drive conversions or upgrades',
    're-engagement': 'Win-back sequence for inactive users or cold leads'
  };

  const profileCtx = buildProfileContext(context);
  const voiceInstruction = context.siteProfile?.brandVoice
    ? `\n- Match the company's brand voice: "${context.siteProfile.brandVoice}"`
    : '';

  const prompt = `You are an email marketing expert for B2B SaaS. Create a ${request.emailCount}-email ${request.campaignType} campaign for ${context.companyName}.

COMPANY CONTEXT:
- Company: ${context.companyName}
- What they do: ${context.summary}
- GTM Motion: ${context.gtmMotion}
${profileCtx}
CAMPAIGN REQUIREMENTS:
- Type: ${request.campaignType} (${campaignDescriptions[request.campaignType]})
- Number of emails: ${request.emailCount}
- Goal: ${request.goal}${voiceInstruction}

PERSONALIZATION RULES:
- Reference actual product names and features throughout the emails
- Include real pricing and differentiators where relevant
- Use customer testimonials as social proof in nurture/promotional emails
- Address the target ICP's specific pain points

EMAIL BEST PRACTICES:
- Subject lines: 6-10 words, create curiosity or highlight value
- Preheader: Extends subject line, 40-100 characters
- Body: Conversational, scannable, one clear CTA per email
- Personalization: Use [First Name] placeholder
- Progressive disclosure: Each email builds on the previous
- Email marketing returns $40 for every $1 spent
- Segmented emails see 26% higher engagement

Return JSON:
{
  "emails": [
    {
      "subject": "Email subject line",
      "preheader": "Preview text that appears after subject",
      "body": "Full email body in markdown format",
      "sendTiming": "When to send (e.g., 'Immediately', 'Day 2', 'Day 5')"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("Email generation: empty response. Finish reason:", response.choices[0]?.finish_reason, "Usage:", JSON.stringify(response.usage));
      throw new Error("AI was unable to generate content. Please try again.");
    }
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("Email campaign generation error:", error?.message || error);
    throw new Error("Failed to generate email campaign. Please try again.");
  }
}

export async function generateBlogArticle(
  request: BlogArticleRequest,
  context: ContentContext
): Promise<{ article: { title: string; metaDescription: string; outline: string[]; fullContent: string; wordCount: number } }> {
  await initPromise;
  
  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  const articleTypeDescriptions = {
    'how-to': 'Step-by-step guide with actionable instructions',
    'listicle': 'Numbered list of tips, tools, or strategies',
    'thought-leadership': 'Industry insights, trends, and expert perspectives',
    'case-study': 'Success story format with problem, solution, and results'
  };

  const profileCtx = buildProfileContext(context);
  const voiceInstruction = context.siteProfile?.brandVoice
    ? `\n- Match the company's brand voice: "${context.siteProfile.brandVoice}"`
    : '';

  const prompt = `You are an SEO content strategist for B2B SaaS. Create a complete blog article for ${context.companyName}.

COMPANY CONTEXT:
- Company: ${context.companyName}
- What they do: ${context.summary}
- GTM Motion: ${context.gtmMotion}
${profileCtx}
ARTICLE REQUIREMENTS:
- Topic: ${request.topic}
- Target Keyword: ${request.targetKeyword}
- Article Type: ${request.articleType} (${articleTypeDescriptions[request.articleType]})${voiceInstruction}

PERSONALIZATION RULES:
- Reference the company's actual product names and features throughout
- Include real competitive differentiators where relevant
- Use customer testimonials or social proof when available
- Address the target ICP's specific pain points and use cases
- Naturally work in the company's value proposition

SEO & CONTENT BEST PRACTICES:
- Companies that blog generate 67% more leads
- SEO produces better lead quality than PPC (81% agree)
- Include target keyword in title, first paragraph, H2s, and naturally throughout
- Write for Answer Engine Optimization (AEO) with clear, structured answers
- Use H2 and H3 headings for structure
- Include a compelling introduction and clear conclusion
- Add internal linking opportunities (mark as [Internal Link: topic])
- Target 1500-2000 words for comprehensive coverage
- Write in a professional but accessible tone

Return JSON:
{
  "article": {
    "title": "SEO-optimized article title including target keyword",
    "metaDescription": "155-character meta description with target keyword",
    "outline": ["H2 section titles as an array"],
    "fullContent": "Complete article in markdown format with H2/H3 headings",
    "wordCount": 1500
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("Blog generation: empty response. Finish reason:", response.choices[0]?.finish_reason, "Usage:", JSON.stringify(response.usage));
      throw new Error("AI was unable to generate content. Please try again.");
    }
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("Blog article generation error:", error?.message || error);
    throw new Error("Failed to generate blog article. Please try again.");
  }
}

export type BudgetScenario = "conservative" | "balanced" | "aggressive";

const BUDGET_SCENARIO_GUIDANCE: Record<BudgetScenario, string> = {
  conservative: "Bias the allocation toward proven, lower-risk channels with predictable ROI (SEO, email, referral, content). Keep paid spend modest. Prioritize sustainable, compounding channels.",
  balanced: "Balance proven channels with selective tests in higher-upside channels. Mix of organic and paid. The default recommendation.",
  aggressive: "Lean heavily into growth/paid channels for fast pipeline (paid search, paid social, ABM, outbound). Accept higher CAC for faster impact.",
};

export async function generateBudgetAllocation(
  totalBudget: number,
  context: ContentContext,
  channelInsights: Array<{ channelId: string; priority: string }>,
  recommendations: Array<{ category: string; impact: string }>,
  scenario: BudgetScenario = "balanced"
): Promise<{ allocations: Array<{ channelId: string; channelName: string; amount: number; percentage: number; rationale: string; expectedROI: string; timeToImpact: string; benchmarkCPL: string; keyMetrics: string[]; firstMonthActions: string[] }> }> {
  await initPromise;

  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  const channelPriorities = channelInsights.map(ci => `${ci.channelId}: ${ci.priority}`).join(", ");
  const topCategories = Array.from(new Set(recommendations.filter(r => r.impact === "High").map(r => r.category))).join(", ");
  const profileCtx = buildProfileContext(context);
  const scenarioGuidance = BUDGET_SCENARIO_GUIDANCE[scenario] ?? BUDGET_SCENARIO_GUIDANCE.balanced;

  const prompt = `You are a B2B SaaS marketing budget strategist. Allocate a monthly marketing budget across marketing channels.

ALLOCATION SCENARIO (${scenario}): ${scenarioGuidance}

COMPANY CONTEXT:
- Company: ${context.companyName}
- What they do: ${context.summary}
- GTM Motion: ${context.gtmMotion}
${profileCtx}
CHANNEL PRIORITIES: ${channelPriorities || "Not yet analyzed"}
HIGH-IMPACT CHANNELS: ${topCategories || "Not yet analyzed"}
TOTAL MONTHLY BUDGET: $${totalBudget.toLocaleString()}

ALLOCATION RULES:
- Allocate across the 13 channels: SEO, LLMs, Organic Social, Content, Email Marketing, Paid Search, Paid Social, Partnerships, Events, Community, ABM, Outbound, Referral
- Weight allocation based on the company's GTM motion, channel priorities, and industry
- High-priority channels should receive proportionally more budget
- Some channels may receive $0 if they're low priority for this company
- Each allocation must include a specific rationale tied to the company's situation
- Each allocation must include an expectedROI range (e.g., "3-5x", "2-3x") estimating the return on investment for that channel
- Each allocation must include timeToImpact (e.g., "1-2 months", "3-6 months") indicating when results start showing
- Each allocation must include benchmarkCPL with an industry benchmark cost per lead for that channel (e.g., "$50-100")
- Each allocation must include keyMetrics: an array of 2-3 specific metrics to track for this channel allocation
- Each allocation must include firstMonthActions: an array of 2-3 specific actions to take in month 1 for this channel
- Amounts must sum to exactly ${totalBudget}
- Be practical: for small budgets (<$5K), focus on 3-5 channels max

Return JSON:
{
  "allocations": [
    {
      "channelId": "SEO",
      "channelName": "SEO",
      "amount": 2500,
      "percentage": 25,
      "rationale": "Specific reason why this amount for this channel",
      "expectedROI": "3-5x",
      "timeToImpact": "3-6 months",
      "benchmarkCPL": "$50-100",
      "keyMetrics": ["Organic traffic growth", "Keyword rankings for target terms"],
      "firstMonthActions": ["Run technical SEO audit", "Identify top 20 target keywords"]
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI was unable to generate budget allocation.");
    return JSON.parse(content);
  } catch (error: any) {
    console.error("Budget allocation error:", error?.message || error);
    throw new Error("Failed to generate budget allocation. Please try again.");
  }
}

export async function generateBuyerPersonas(
  context: ContentContext
): Promise<Array<{
  name: string;
  jobTitle: string;
  seniority: string;
  department: string;
  companySizeRange: string;
  industryVerticals: string[];
  geographicFocus: string;
  painPoints: string[];
  goals: string[];
  buyingTriggers: string[];
  preferredChannels: string[];
  objections: string[];
  dayInTheLife: string;
  messagingAngle: string;
  contentPreferences: string[];
  buyerJourneyStage: {
    awareness: string;
    consideration: string;
    decision: string;
  };
  internalChampionTips: string;
  socialProofNeeded: string;
}>> {
  await initPromise;

  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  const profileCtx = buildProfileContext(context);
  const icpDetails = context.siteProfile?.icpDetails;
  const icpContext = icpDetails
    ? `\nEXISTING ICP DATA:\n- Persona: ${icpDetails.persona}\n- Company Size: ${icpDetails.companySize}\n- Industry: ${icpDetails.industry}\n- Pain Points: ${icpDetails.painPoints?.join(", ")}`
    : "";

  const prompt = `You are a B2B buyer persona expert. Generate 3 detailed, realistic buyer personas for a B2B SaaS company.

COMPANY CONTEXT:
- Company: ${context.companyName}
- What they do: ${context.summary}
- GTM Motion: ${context.gtmMotion}
${profileCtx}${icpContext}

PERSONA REQUIREMENTS:
- Create 3 distinct personas that represent different buyer types for this company
- Each persona should feel real and specific — use realistic names, specific job titles
- Tailor everything to this company's actual product, industry, and GTM motion
- Include both decision-makers and influencers in the buying process
- Pain points and goals should be specific to what this company solves
- messagingAngle: the single most compelling message (1-2 sentences) that would resonate with this persona
- contentPreferences: specific types of content this persona engages with (e.g., "Case studies", "ROI calculators", "Peer reviews on G2")
- buyerJourneyStage: describe how this persona moves through each stage — awareness (how they discover solutions), consideration (how they evaluate options), decision (what makes them pull the trigger) — each in 1 sentence
- internalChampionTips: practical advice (1-2 sentences) on how to turn this persona into an internal champion for your product
- socialProofNeeded: the specific type of proof or evidence that convinces this persona (e.g., "Enterprise customer logos and compliance certifications")

Return JSON:
{
  "personas": [
    {
      "name": "Sarah Chen",
      "jobTitle": "VP of Marketing",
      "seniority": "VP/Director",
      "department": "Marketing",
      "companySizeRange": "50-200 employees",
      "industryVerticals": ["B2B SaaS", "MarTech"],
      "geographicFocus": "North America",
      "painPoints": ["Specific pain point 1", "Specific pain point 2"],
      "goals": ["Goal 1", "Goal 2"],
      "buyingTriggers": ["Trigger 1", "Trigger 2"],
      "preferredChannels": ["LinkedIn", "Email", "Webinars"],
      "objections": ["Common objection 1", "Common objection 2"],
      "dayInTheLife": "A 2-3 sentence narrative of their typical day and challenges...",
      "messagingAngle": "The #1 message that would resonate with this persona...",
      "contentPreferences": ["Case studies", "ROI calculators", "Peer reviews on G2"],
      "buyerJourneyStage": {
        "awareness": "How they first discover solutions like yours...",
        "consideration": "How they evaluate and compare options...",
        "decision": "What ultimately makes them pull the trigger..."
      },
      "internalChampionTips": "How to empower this persona to sell your product internally...",
      "socialProofNeeded": "Enterprise customer logos and compliance certifications"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 6000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI was unable to generate buyer personas.");
    const result = JSON.parse(content);
    return result.personas;
  } catch (error: any) {
    console.error("Persona generation error:", error?.message || error);
    throw new Error("Failed to generate buyer personas. Please try again.");
  }
}
