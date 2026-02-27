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
  console.error('  AI_INTEGRATIONS_OPENAI_API_KEY:', apiKey ? 'set' : 'MISSING');
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

export async function scrapeWebsite(url: string): Promise<string> {
  await initPromise;
  
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GTMChampionBot/1.0; +https://gtmchampion.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerioLoad(html);

    $('script, style, nav, footer, iframe, noscript').remove();

    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').first().text().trim();
    const headings = $('h2, h3').map((_: any, el: any) => $(el).text().trim()).get().slice(0, 10);
    const paragraphs = $('p').map((_: any, el: any) => $(el).text().trim()).get().filter((p: string) => p.length > 30).slice(0, 15);

    const content = [
      `Title: ${title}`,
      `Meta Description: ${metaDescription}`,
      `Main Heading: ${h1}`,
      `Subheadings: ${headings.join(', ')}`,
      `Content: ${paragraphs.join(' ')}`,
    ].join('\n\n');

    return content.slice(0, 8000);
  } catch (error) {
    console.error('Error scraping website:', error);
    throw new Error(`Failed to scrape website: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   - 51% of companies plan to increase AEO investment in 2025

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

export async function analyzeCompany(websiteContent: string, companyUrl: string): Promise<CompanyAnalysis> {
  await initPromise;
  
  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  return pRetryFn(
    async () => {
      try {
        const prompt = `You are a B2B SaaS marketing expert specializing in Go-To-Market strategies. Analyze the following website and recommend strategies from the proven 2025 B2B SaaS marketing playbook below.

${CORE_STRATEGIES}

---

Website URL: ${companyUrl}

Website Content:
${websiteContent}

---

Based on this company's business model, target audience, and current positioning, provide strategic recommendations. Select the most relevant strategies from the playbook above that would drive the highest impact for THIS specific company.

Provide your analysis in the following JSON format:
{
  "companyName": "Extract the company name",
  "summary": "A 2-3 sentence summary of what the company does and who they serve",
  "gtmMotion": "The primary GTM motion that fits this company (e.g., 'Product-Led Growth', 'Enterprise Sales-Led', 'Partner & Ecosystem-Led', 'Content & Community-Led', 'PLG + Sales Hybrid')",
  "icpScore": "A score from 1-100 indicating how clear their Ideal Customer Profile is based on the website",
  "recommendations": [
    {
      "category": "One of: SEO, LLMs, Paid Search, Paid Social, Organic Social, Retargeting, CRO, Email Marketing, Content, Community, ABM, Partnerships, Outbound",
      "title": "A specific, actionable recommendation",
      "description": "Detailed description including specific tactics and expected outcomes.",
      "impact": "High, Medium, or Low",
      "effort": "High, Medium, or Low"
    }
  ],
  "weeklyIdeas": [
    {
      "title": "Specific content idea title",
      "description": "Step-by-step execution guide for this week",
      "type": "One of: Blog Post, LinkedIn Post, Email Campaign, Webinar, Case Study, Partner Content"
    }
  ],
  "channelInsights": [
    {
      "channelId": "One of: SEO, LLMs, Paid Search, Paid Social, Organic Social, Retargeting, CRO, Email Marketing, Content, Community, ABM, Partnerships, Outbound",
      "priority": "High, Medium, or Low based on fit for this company",
      "whyItMatters": "2-3 sentences explaining why THIS channel is important for THIS specific company based on their business model, target audience, and goals",
      "companyFitSummary": "1-2 sentences on how well this channel fits their GTM motion",
      "heroStat": { "value": "A compelling statistic (e.g., '67%', '$40 ROI')", "label": "What the stat represents" },
      "topKpis": ["3-4 specific KPIs they should track for this channel"],
      "strategicPillars": [
        {
          "title": "Strategic initiative name",
          "objective": "What this achieves",
          "tactics": ["3-4 specific tactics to execute"],
          "measurement": "How to measure success"
        }
      ],
      "quickWins": [
        {
          "title": "Quick win name",
          "steps": ["Step 1", "Step 2", "Step 3"],
          "effort": "Low or Medium",
          "duration": "Timeframe (e.g., '1-2 days', '1 week')"
        }
      ],
      "resources": ["Recommended tools, templates, or resources for this channel"]
    }
  ]
}

CRITICAL REQUIREMENTS:

1. Generate 10-14 recommendations across ALL channels listed above.

2. Generate channelInsights for EACH of these 13 channels (this is mandatory):
   - SEO, LLMs, Paid Search, Paid Social, Organic Social, Retargeting, CRO, Email Marketing, Content, Community, ABM, Partnerships, Outbound
   
3. Each channelInsight MUST include:
   - 2-3 strategicPillars with specific tactics tailored to THIS company
   - 2-3 quickWins they can implement immediately
   - Personalized whyItMatters explaining the channel's relevance to THEIR business
   - Priority rating based on their GTM motion and business model

4. Generate 4 weekly content ideas they can execute immediately.

Make ALL content specific to THIS company - reference their product, target audience, and industry throughout.`;

        const response = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_completion_tokens: 16384,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response from AI");
        }

        const analysis = JSON.parse(content) as CompanyAnalysis;
        
        if (!analysis.companyName || !analysis.summary || !analysis.recommendations || !analysis.weeklyIdeas) {
          throw new Error("Invalid AI response structure");
        }

        if (!analysis.channelInsights || !Array.isArray(analysis.channelInsights)) {
          analysis.channelInsights = [];
        }

        return analysis;
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

export async function generateWeeklyIdeas(companyName: string, summary: string, gtmMotion: string): Promise<Array<{ title: string; description: string; type: string }>> {
  await initPromise;
  
  const openai = new OpenAI({
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || 'missing-key'
  });

  return pRetryFn(
    async () => {
      try {
        const prompt = `You are a B2B SaaS marketing expert using the 2025 marketing playbook. Generate 4 fresh, actionable content ideas for this week.

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

=== YOUR EXPERTISE (2025 B2B SaaS Playbook) ===
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
4. Keep responses concise: 2-4 focused paragraphs
5. If discussing a channel, give concrete first steps they can take this week`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_tokens: 800,
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

export async function generateLinkedInPost(
  request: LinkedInPostRequest,
  context: { companyName: string; summary: string; gtmMotion: string }
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

  const prompt = `You are a LinkedIn content expert for B2B SaaS companies. Generate 3 LinkedIn posts for a ${request.authorRole} at ${context.companyName}.

COMPANY CONTEXT:
- Company: ${context.companyName}
- What they do: ${context.summary}
- GTM Motion: ${context.gtmMotion}

POST REQUIREMENTS:
- Topic: ${request.topic}
- Tone: ${request.tone} (${toneDescriptions[request.tone]})
- Author Role: ${request.authorRole}

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
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("LinkedIn post generation error:", error);
    throw new Error("Failed to generate LinkedIn posts. Please try again.");
  }
}

export async function generateEmailCampaign(
  request: EmailCampaignRequest,
  context: { companyName: string; summary: string; gtmMotion: string }
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

  const prompt = `You are an email marketing expert for B2B SaaS. Create a ${request.emailCount}-email ${request.campaignType} campaign for ${context.companyName}.

COMPANY CONTEXT:
- Company: ${context.companyName}
- What they do: ${context.summary}
- GTM Motion: ${context.gtmMotion}

CAMPAIGN REQUIREMENTS:
- Type: ${request.campaignType} (${campaignDescriptions[request.campaignType]})
- Number of emails: ${request.emailCount}
- Goal: ${request.goal}

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
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("Email campaign generation error:", error);
    throw new Error("Failed to generate email campaign. Please try again.");
  }
}

export async function generateBlogArticle(
  request: BlogArticleRequest,
  context: { companyName: string; summary: string; gtmMotion: string }
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

  const prompt = `You are an SEO content strategist for B2B SaaS. Create a complete blog article for ${context.companyName}.

COMPANY CONTEXT:
- Company: ${context.companyName}
- What they do: ${context.summary}
- GTM Motion: ${context.gtmMotion}

ARTICLE REQUIREMENTS:
- Topic: ${request.topic}
- Target Keyword: ${request.targetKeyword}
- Article Type: ${request.articleType} (${articleTypeDescriptions[request.articleType]})

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
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("Blog article generation error:", error);
    throw new Error("Failed to generate blog article. Please try again.");
  }
}
