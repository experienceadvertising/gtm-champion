# GTM Champion - Project Documentation

## Overview

GTM Champion is a B2B SaaS marketing intelligence platform that helps companies optimize their go-to-market strategies. The application scrapes company websites, analyzes their business model using AI, and provides personalized GTM recommendations based on proven B2B SaaS marketing strategies, with weekly strategy updates delivered via email.

**Core Features:**
- User authentication and account management
- Automated website scraping and content analysis
- AI-powered GTM motion classification and recommendations
- 100% free tool — all features accessible to every user (no paywalls or premium gating)
- Automated email campaigns via Postmark
- Real-time dashboard for tracking recommendations with status management (New/In Progress/Completed)
- Content Tools: LinkedIn post generator, email campaign writer, blog article writer with download/copy support
- Interactive Weekly Focus card with progress tracking
- Channel tooltips and unique icons across all 13 marketing channels
- Re-analyze Website confirmation dialog with clear UX
- Interactive tutorial for new users: 7-step guided walkthrough highlighting key dashboard sections (sidebar channels, high-impact tasks, AI advisor, content sprints, content tools, re-analyze). Uses localStorage for completion tracking. "Take Tour" button in header to restart.
- Deep personalization via multi-page scraping and structured company profile extraction
- PDF Export: Download professionally formatted GTM strategy report (cover page, executive summary, per-channel strategies, weekly ideas, recommendations summary) via `GET /api/export/pdf`
- CSV Export: Download recommendations as CSV via `GET /api/export/csv` with proper escaping. "CSV" button in dashboard header.
- Tell a Friend: "Tell a Friend" button in dashboard header opens dialog for name + email, sends branded invite email via Postmark (`POST /api/invite-friend`)
- Share Channel Strategy: "Share Strategy" button on channel detail pages sends the full channel strategy (hero stat, pillars, quick wins, recommendations) to a friend/co-worker via email with an attached PDF of the channel strategy (`POST /api/share-strategy`)
- Dark Mode: Theme toggle (Sun/Moon) in dashboard header. ThemeProvider context (`client/src/components/ThemeProvider.tsx`) manages light/dark/system mode, stores preference in localStorage key `gtm-theme`, toggles `.dark` class on `<html>`. CSS variables for dark mode already defined in `index.css`.
- Search & Filter: Search bar + status/impact/channel filter dropdowns above High-Impact Tasks section. Filters apply across all recommendations. Keyboard shortcut `Ctrl+K` or `/` focuses search.
- Notification Badges: Red badge counts on sidebar channels showing "New" recommendation counts. Header badge shows total new recommendations.
- Undo Status Changes: Status change toasts include an "Undo" button to revert to previous status.
- Bulk Actions: Toggle "Bulk" mode to select multiple recommendations, then apply status changes (New/In Progress/Completed) to all selected via floating action bar.
- Keyboard Shortcuts: Global keyboard handler hook (`client/src/hooks/use-keyboard-shortcuts.ts`). `Ctrl+K`/`/` = search, `?` = shortcuts dialog, `Esc` = close dialogs, `1-9` = switch channels. "?" icon button in header opens shortcuts dialog.
- Skeleton Loading: Full-page skeleton placeholder layout (sidebar + main content) replaces loading spinner during initial data load.
- Mobile Layout: Header buttons collapse into a dropdown menu on mobile. Responsive filter bar stacks vertically. Mobile-optimized card layouts.
- Accessibility: ARIA labels on all icon-only buttons, `aria-current="page"` on active sidebar channel, `focus-visible` ring styles, `role="navigation"` on sidebar, `role="status"` on loading states, `sr-only` screen reader labels, proper heading hierarchy.

### Deep Personalization System
- **Multi-page scraping:** `scrapeWebsiteDeep()` crawls homepage + up to 5 subpages (pricing, about, features, blog, customers) in parallel with 5s timeouts each
- **Company profile extraction:** `extractCompanyProfile()` — single gpt-4o-mini call (2500 tokens) extracts structured data: productNames, features, pricingTiers, testimonials, competitors, brandVoice, existingChannels, icpDetails, contentGaps, keyDifferentiators
- **Profile stored as JSONB** on `companies.siteProfile` column
- **All AI prompts enriched** with profile data: core analysis, channel insights, LinkedIn posts, email campaigns, blog articles all reference real product names, features, pricing, competitors, and brand voice
- **GTM funnel tagging:** Each recommendation tagged as `plg`, `sales`, or `both` — displayed as colored badges on the dashboard
- **ICP editing:** Dashboard shows detected ICP (persona, company size, industry, pain points) with inline edit capability via `PATCH /api/company/:id/icp`
- **Content gap suggestions:** Auto-detected content gaps displayed on dashboard with key differentiators
- **Cost:** One extra lightweight AI call per analysis (~$0.001), no additional cost for content generation (profile reused from DB)

### Analysis Pipeline Architecture
- **Phase 1:** Deep scrape + screenshot + PageSpeed (all parallel)
- **Phase 2a:** Visual analysis + profile extraction (parallel, fast — gpt-4o-mini)
- **Phase 2b:** Core analysis WITH profile + visual data (gpt-4o, 5000 tokens) — receives extracted profile for deeper personalization
- **Phase 3:** Save core results to DB — dashboard becomes usable
- **Phase 4:** Channel insights (3 parallel batches of 4-5 channels, gpt-4o-mini) + welcome email — fully fire-and-forget
- **Progressive channel saving:** Each batch saves to DB immediately via `onBatchReady` callback — channels appear on dashboard as they complete (~5-15s apart), not all at once
- **Run isolation:** `activeAnalysisRuns` map tracks current run ID per company; stale background callbacks from prior runs are discarded
- **Channel batch error handling:** Promise.allSettled + automatic retry of failed batches + channelId normalization
- **Polling:** Dashboard polls every 4s during analysis and while channel insights < 13 (within 5 min of analysis)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React with TypeScript using Vite as the build tool

The frontend follows a component-based architecture with:
- **Routing:** Wouter for lightweight client-side routing
- **State Management:** TanStack Query (React Query) for server state management
- **UI Framework:** shadcn/ui components built on Radix UI primitives
- **Styling:** Tailwind CSS with custom theme variables
- **Forms:** React Hook Form with Zod validation

**Design Decisions:**
- Chose Wouter over React Router for minimal bundle size in a single-page application
- TanStack Query provides built-in caching, background refetching, and optimistic updates
- shadcn/ui offers accessible, customizable components without runtime overhead
- Tailwind CSS enables rapid development with consistent design tokens

**Page Structure:**
- Landing page: Marketing site with feature showcase and pricing
- Auth page: Combined login/signup with form validation
- Dashboard: Main application interface showing company analysis and recommendations
- Email preview: Demo of automated email templates
- About page: Company mission, creator bio with LinkedIn link, 13-channel overview
- Privacy Policy: GDPR-aware privacy policy covering data collection, sharing, security, and user rights
- Terms of Service: Usage terms, AI-generated content disclaimer, IP and liability
- Contact page: General inquiries and support emails, LinkedIn link

### Backend Architecture

**Framework:** Express.js with TypeScript running on Node.js

**Server Design:**
- RESTful API architecture with JSON responses
- Middleware-based request processing pipeline
- Custom logging middleware for request/response tracking
- Asynchronous background processing for long-running tasks (web scraping and AI analysis)

**Key Architectural Patterns:**
- **Storage Layer Abstraction:** Interface-based storage pattern allows swapping database implementations
- **Service Layer:** Separated business logic (OpenAI integration, email sending) from route handlers
- **Background Processing:** Non-blocking architecture where company analysis runs asynchronously after user registration
- **Error Handling:** Centralized error handling with consistent JSON error responses

**Build Process:**
- Vite for client-side bundling with optimized production builds
- esbuild for server bundling with selective dependency bundling (allowlist pattern for faster cold starts)
- Static file serving with SPA fallback routing

### Data Storage

**Database:** PostgreSQL via Neon serverless

**ORM:** Drizzle ORM for type-safe database queries

**Schema Design:**
- **users:** Core user accounts with authentication credentials
- **companies:** Website data, AI analysis results, and siteProfile JSONB (one-to-one with users)
- **recommendations:** GTM strategies with gtmFunnel field (plg/sales/both) generated by AI (one-to-many with companies)
- **weeklyIdeas:** Content ideas for email campaigns (one-to-many with companies)

**Design Decisions:**
- Normalized relational schema with foreign key relationships
- Timestamps for tracking data freshness (lastScraped)
- Status field for recommendation tracking workflow
- Separate tables for recommendations vs. weekly ideas to support different update cadences

### Authentication & Authorization

**Strategy:** Password-based authentication with bcrypt hashing

**Session Management:** Server-side sessions via express-session with connect-pg-simple (PostgreSQL session store)
- Sessions stored in PostgreSQL with 7-day expiry
- httpOnly cookies with sameSite:lax
- SESSION_SECRET env var required (falls back to random bytes in dev)
- All protected API routes use `requireAuth` middleware that validates session and provides `req.session.userId`
- Frontend uses credentials:"include" on all fetch requests; no userId in URLs

**Security Measures:**
- Passwords hashed with bcrypt (10 salt rounds)
- Email uniqueness validation
- Input validation using Zod schemas
- Rate limiting: login (5/min), register (3/min), AI chat (20/min), content generators (10/min), PostgreSQL-backed rate limit store
- SSRF protection on web scraping: blocks private IPs, localhost, non-http(s) protocols
- XSS protection: DOMPurify sanitization on all dangerouslySetInnerHTML usage
- React Error Boundary wrapping the entire app router
- CRON_SECRET env var required (no hardcoded fallback), timing-safe comparison
- CSRF protection: double-submit cookie pattern with timing-safe comparison (excludes Stripe webhooks and cron endpoints)
- Security headers: X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy, Content-Security-Policy, HSTS (production)
- Response compression via gzip (compression middleware)
- Database cascade deletes on all FK references for clean user deletion
- Production error suppression (no internal details leaked)

**Admin Panel:**
- Admin page at `/admin` with Analytics and Users tabs
- `requireAdmin` middleware enforces server-side admin access on all `/api/admin/*` endpoints
- Analytics: total users, weekly signups, signups-by-day chart, GTM motion distribution, recommendation stats by channel
- User management: searchable user list with company data, delete user (cascade deletes all related data), admin users cannot be deleted
- Admin button visible only to `isAdmin` users in the dashboard header
- API endpoints: `GET /api/admin/users`, `GET /api/admin/analytics`, `DELETE /api/admin/users/:userId`

**Free Tool Model:**
- All features are 100% free — no paywalls, premium gating, or upgrade prompts
- Stripe integration retained for potential future use but no feature gating

### Payment Integration (Stripe)

**Setup:**
- Uses manual API keys (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY) stored as Replit secrets
- Connected to "GTM Champion" Stripe account under evan@experienceadvertising.com
- Stripe-replit-sync package handles data syncing and webhooks
- Products/prices stored in PostgreSQL `stripe` schema (auto-created by sync package)

**Architecture:**
- `server/services/stripeClient.ts`: Credential fetching from environment variables
- `server/services/stripeService.ts`: Database queries against synced Stripe data
- `server/services/webhookHandlers.ts`: Custom event handlers for subscription lifecycle

**Subscription Flow:**
1. User clicks "Upgrade" → Pricing modal appears
2. User selects monthly ($29) or annual ($290) plan
3. Backend creates Stripe customer (if needed) and checkout session
4. User redirected to Stripe hosted checkout
5. After payment, webhook updates user's premium status
6. Frontend syncs subscription status on return

**Webhook Events Handled:**
- `checkout.session.completed`: Activates premium after successful payment
- `customer.subscription.created/updated`: Syncs subscription status changes
- `customer.subscription.deleted`: Deactivates premium on cancellation

**API Endpoints:**
- `GET /api/stripe/config`: Returns publishable key
- `GET /api/stripe/products`: Lists products with prices from database
- `POST /api/stripe/checkout`: Creates checkout session
- `POST /api/stripe/portal`: Creates customer portal session
- `GET /api/stripe/subscription/:userId`: Returns subscription status

### AI Integration

**Provider:** OpenAI API (configured via Replit AI Integrations)

**AI Workflows:**
1. **Website Scraping:** Cheerio-based HTML parsing to extract main content (runs in parallel with screenshot)
2. **Screenshot Capture:** screenshotapi.net (SCREENSHOT_API_KEY) as primary, Google PageSpeed Insights as fallback
3. **Visual Analysis:** GPT vision model analyzes screenshot for design/UX/conversion insights
4. **PageSpeed Insights:** Google PageSpeed API extracts performance score, Core Web Vitals (LCP, FCP, CLS, TTFB, INP), and optimization opportunities — stored as JSONB in companies table, displayed on dashboard with circular gauge, CWV metrics, and top opportunities
5. **Core Company Analysis:** GPT analyzes text content + visual insights → company summary, GTM motion, recommendations, weekly ideas
6. **Channel Insights:** Separate GPT call generates detailed 13-channel strategy insights (runs after core analysis)
7. **Weekly Ideas:** Content suggestions for ongoing marketing campaigns

**Performance Architecture (4-phase pipeline):**
- Phase 1: Text scraping + screenshot capture + PageSpeed insights run IN PARALLEL (~3-5s)
- Phase 2: Visual analysis (~3s), then core AI analysis with visual context (~10-15s)
- Phase 3: Core results saved immediately → dashboard becomes usable
- Phase 4: Channel insights + welcome email run IN PARALLEL in background (~15-20s)
- Total time reduced from ~45-60s to ~25-35s with progressive loading

**Design Decisions:**
- Retry logic with exponential backoff for API rate limits
- Structured prompts to ensure consistent JSON responses
- Content extraction focused on main text (paragraphs, headers, lists) while filtering noise
- Separation of one-time analysis (company summary) from recurring generation (weekly ideas)
- Progressive loading: core results saved first so dashboard is usable while channel insights load
- Screenshot/visual analysis are non-blocking: failures don't prevent text-based analysis
- SSRF protection applied to both scraping and screenshot capture URLs

## External Dependencies

### Third-Party Services

**Postmark (Email Delivery):**
- Transactional email API for welcome and weekly digest emails
- From Name: "GTM Champion" with configurable email via POSTMARK_FROM_EMAIL env var (defaults to hello@gtmchampion.com)
- HTML email templates with inline styles, gradient headers, and branded design
- Welcome email includes: GTM motion summary, top high-impact recommendations with impact badges, channel category links
- Weekly digest: actionable GTM ideas with type badges and strategy links
- Channel insights model: gpt-4o-mini (fast) with 8192 max tokens

**Neon (Database):**
- Serverless PostgreSQL with connection pooling
- HTTP-based database driver for serverless environments
- Configured via DATABASE_URL environment variable

**OpenAI (AI Processing):**
- Accessed via Replit AI Integrations proxy
- Requires AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY
- Used for content analysis and recommendation generation

### Key NPM Dependencies

**Backend:**
- `express`: Web framework
- `compression`: Gzip response compression
- `drizzle-orm`: Type-safe ORM
- `@neondatabase/serverless`: Neon database client
- `bcrypt`: Password hashing
- `postmark`: Email delivery SDK
- `cheerio`: HTML parsing for web scraping
- `openai`: AI API client
- `stripe`: Stripe payment SDK
- `stripe-replit-sync`: Automatic Stripe data sync for Replit

**Frontend:**
- `react`: UI framework
- `@tanstack/react-query`: Server state management
- `wouter`: Lightweight routing
- `react-hook-form`: Form management
- `zod`: Schema validation
- `@radix-ui/*`: Accessible UI primitives
- `tailwindcss`: Utility-first CSS

**Development:**
- `vite`: Build tool and dev server
- `typescript`: Type safety
- `tsx`: TypeScript execution
- `esbuild`: Production bundling

### Environment Variables Required

- `DATABASE_URL`: PostgreSQL connection string
- `POSTMARK_SERVER_TOKEN`: Email API authentication
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: AI service endpoint
- `AI_INTEGRATIONS_OPENAI_API_KEY`: AI service authentication
- `NODE_ENV`: Environment mode (development/production)