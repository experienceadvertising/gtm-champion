import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  CheckCircle2, 
  BarChart3, 
  Zap, 
  Target,
  Brain,
  Mail,
  MessageSquare,
  Globe,
  TrendingUp,
  Users,
  Megaphone,
  Search,
  PenTool,
  Share2,
  RefreshCw,
  Handshake,
  Phone,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Shield,
  FileText,
  Download,
  Layers,
  UserCheck,
  Wallet,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingSection } from "@/components/PricingSection";
import { HERO, STEPS, CHANNELS, CHANNEL_GROUPS, FAQ_ITEMS } from "@shared/siteContent";
import heroImage from "@assets/generated_images/diverse_marketing_team_collaborating-1200.webp";
import heroImage800 from "@assets/generated_images/diverse_marketing_team_collaborating-800.webp";

// Channel/step/FAQ copy lives in shared/siteContent.ts so the prerendered
// (crawler-facing) HTML stays identical to what users see. Icons are mapped
// here by channel id since they are React components (kept out of shared data).
const CHANNEL_ICONS: Record<string, React.ElementType> = {
  SEO: Search,
  LLMs: Brain,
  "Paid Search": TrendingUp,
  "Paid Social": Megaphone,
  "Organic Social": Share2,
  Retargeting: RefreshCw,
  CRO: Target,
  Email: Mail,
  Content: PenTool,
  Community: Users,
  ABM: Target,
  Partnerships: Handshake,
  Outbound: Phone,
};


function FloatingIcon({ icon: Icon, className, delay }: { icon: React.ElementType; className: string; delay: number }) {
  return (
    <motion.div
      className={`absolute hidden lg:flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl ${className}`}
      animate={{
        y: [0, -14, 0],
        rotate: [0, 6, -6, 0],
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    >
      <Icon className="h-5 w-5 text-white/90" />
    </motion.div>
  );
}

function TypingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [text, done]);

  return (
    <span>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />}
    </span>
  );
}

function DashboardPreview() {
  return (
    <motion.div 
      className="bg-slate-900 rounded-2xl p-1 shadow-2xl ring-1 ring-white/10"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <div className="w-3 h-3 rounded-full bg-green-400/80" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-slate-400 font-mono">gtmchampion.com/dashboard</span>
        </div>
      </div>
      <div className="rounded-b-xl overflow-hidden bg-slate-800/80 p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Top Priorities", value: "3", color: "from-indigo-500 to-violet-500" },
            { label: "Roadmap", value: "90d", color: "from-emerald-500 to-teal-500" },
            { label: "Confidence", value: "88", color: "from-amber-500 to-orange-500" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-slate-700/50 p-3 border border-slate-600/30">
              <p className="text-[10px] text-slate-400 mb-1">{stat.label}</p>
              <p className={`text-lg font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2 mb-3">
          {["1  Paid Search", "2  Retargeting", "3  SEO"].map((ch, i) => (
            <motion.div 
              key={ch} 
              className="flex items-center gap-3 rounded-lg bg-slate-700/30 p-2.5 border border-slate-600/20"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.15, duration: 0.3 }}
            >
              <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-emerald-400" : i === 1 ? "bg-blue-400" : "bg-violet-400"}`} />
              <span className="text-xs text-slate-300 flex-1">{ch}</span>
              <div className="h-1.5 w-16 rounded-full bg-slate-600 overflow-hidden">
                <motion.div 
                  className={`h-full rounded-full ${i === 0 ? "bg-emerald-400" : i === 1 ? "bg-blue-400" : "bg-violet-400"}`}
                  initial={{ width: 0 }}
                  animate={{ width: i === 0 ? "80%" : i === 1 ? "60%" : "40%" }}
                  transition={{ delay: 1 + i * 0.15, duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="relative overflow-hidden rounded-lg">
          <picture>
            <source type="image/webp" srcSet={`${heroImage800} 800w, ${heroImage} 1200w`} sizes="(max-width: 768px) 100vw, 600px" />
            <img
              src={heroImage800}
              alt="Marketing team collaborating on Go-To-Market strategy, analyzing growth charts and analytics dashboard in modern office"
              className="w-full h-32 object-cover opacity-60"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width="800"
              height="600"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex gap-2">
            <div className="glass-panel rounded-md px-2.5 py-1.5 text-[10px] text-white flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              AI Active
            </div>
            <div className="glass-panel rounded-md px-2.5 py-1.5 text-[10px] text-white flex items-center gap-1.5">
              <TrendingUp className="h-2.5 w-2.5" />
              Strategy Ready
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedCounter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (hasAnimated) return;

    const startAnimation = () => {
      setHasAnimated(true);
      const steps = 40;
      const stepTime = duration / steps;
      let current = 0;
      const interval = setInterval(() => {
        current++;
        setCount(Math.round((current / steps) * target));
        if (current >= steps) clearInterval(interval);
      }, stepTime);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (ref.current) observer.observe(ref.current);

    const fallbackTimeout = setTimeout(() => {
      if (!hasAnimated) startAnimation();
    }, 1500);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimeout);
    };
  }, [target, duration, hasAnimated]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 overflow-x-hidden">
      <Helmet>
        <link rel="canonical" href="https://gtmchampion.com/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "GTM Champion",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "description": "AI-powered Go-To-Market strategy platform that analyzes a B2B SaaS website, prioritizes the strongest channel opportunities, and builds an evidence-aware 90-day execution plan across 13 channels.",
          "offers": [
            { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD", "description": "Free GTM analysis with 13 deep channel strategies, top-three prioritization, a 90-day plan, readiness, evidence, budgets, risks, roadmaps, AI chat, content tools, weekly emails, and 1 website re-analysis per week. No credit card required." },
            { "@type": "Offer", "name": "Pro Monthly", "price": "29", "priceCurrency": "USD", "description": "10x higher AI limits, branded multi-page PDF exports, unlimited re-analysis with 12-month strategy history, up to 8 buyer personas, and A/B budget scenarios. $29 per month." },
            { "@type": "Offer", "name": "Pro Annual", "price": "290", "priceCurrency": "USD", "description": "All Pro features billed annually. $290 per year (save ~17% vs monthly)." }
          ],
          "featureList": [
            "Deep website personalization with multi-page scraping",
            "ICP detection and editing",
            "13 marketing channel strategies",
            "Top-three channel prioritization",
            "Channel fit, confidence, and quality scoring",
            "Evidence and assumption tracking",
            "Prerequisites, budget guidance, and risk guardrails",
            "30, 60, and 90-day execution roadmaps",
            "GTM funnel tagging (PLG, Sales-Led, Both)",
            "AI LinkedIn post, email campaign, and blog article generator",
            "AI Q&A assistant",
            "Weekly email strategy sprints",
            "PDF and CSV export",
            "PageSpeed and Core Web Vitals insights",
            "A/B budget scenarios (Pro)",
            "12-month strategy history (Pro)",
            "Up to 8 buyer personas (Pro)"
          ]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": { "@type": "Answer", "text": item.answer },
          })),
        })}</script>
      </Helmet>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded z-50">
        Skip to main content
      </a>

      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl" role="navigation" aria-label="Main navigation">
        <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4 md:px-8">
          <a href="/" className="flex items-center gap-1.5 md:gap-2 font-display font-bold text-lg md:text-xl tracking-tight text-primary shrink-0" aria-label="GTM Champion Home">
            <Zap className="h-5 w-5 md:h-6 md:w-6 fill-current" aria-hidden="true" />
            <span>GTM Champion</span>
          </a>
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">How it works</a>
            <a href="#channels" className="hover:text-primary transition-colors">Channels</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="/blog" className="hover:text-primary transition-colors">Blog</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
            <Button variant="ghost" size="sm" className="text-xs md:text-sm h-8 px-2 md:px-4" onClick={() => setLocation("/auth?mode=login")} data-testid="button-login">Log in</Button>
            <Button size="sm" className="text-xs md:text-sm h-8 px-2.5 md:px-4" onClick={() => setLocation("/auth")} data-testid="button-get-started">Get Started</Button>
          </div>
        </div>
      </nav>

      <main id="main-content">
        <section className="relative pt-16 pb-16 md:pt-24 md:pb-12 overflow-hidden" aria-labelledby="hero-heading">
          <div className="hero-gradient-bg absolute inset-0 pointer-events-none" aria-hidden="true" />
          <div className="hero-grid-pattern absolute inset-0 pointer-events-none opacity-30" aria-hidden="true" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-float-slow" aria-hidden="true" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl pointer-events-none animate-float-slower" aria-hidden="true" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-400/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute top-40 right-1/3 w-48 h-48 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-purple-400/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

          <FloatingIcon icon={Search} className="top-28 right-[15%]" delay={0} />
          <FloatingIcon icon={Brain} className="top-44 right-[8%]" delay={0.5} />
          <FloatingIcon icon={Mail} className="bottom-32 right-[12%]" delay={1} />
          <FloatingIcon icon={Target} className="top-36 left-[8%]" delay={1.5} />
          <FloatingIcon icon={BarChart3} className="bottom-40 left-[10%]" delay={2} />
          <FloatingIcon icon={Megaphone} className="bottom-24 left-[20%]" delay={0.8} />

          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <motion.div 
              className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="space-y-5 md:space-y-10">
                <motion.div variants={itemVariants}>
                  <span className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-semibold tracking-wide mb-3 md:mb-5 border border-primary/20">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Free AI-Powered Go-To-Market Strategy
                  </span>
                  <h1 id="hero-heading" className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.08] text-foreground">
                    <span className="gradient-text">{HERO.headline}</span>
                  </h1>
                </motion.div>
                
                <motion.p variants={itemVariants} className="text-sm md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                  {HERO.subhead}
                </motion.p>
                
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    size="lg" 
                    className="h-12 md:h-14 px-6 md:px-8 text-base md:text-lg shadow-lg shadow-primary/25 relative overflow-hidden group hero-cta-btn" 
                    onClick={() => setLocation("/auth")}
                    data-testid="button-analyze-website"
                  >
                    <span className="relative z-10 flex items-center">
                      Analyze My Website Free <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </span>
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-muted-foreground pt-1 md:pt-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500" aria-hidden="true" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 md:h-5 md:w-5 text-green-500" aria-hidden="true" />
                    <span>Dashboard starts in 30-60 seconds</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 md:h-5 md:w-5 text-green-500" aria-hidden="true" />
                    <span>Top-three channel focus</span>
                  </div>
                </motion.div>
              </div>

              <motion.div variants={itemVariants} className="relative hidden md:block">
                <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/20 via-violet-500/10 to-cyan-500/10 rounded-3xl blur-2xl pointer-events-none" aria-hidden="true" />
                <div className="relative">
                  <DashboardPreview />
                </div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-indigo-500/30 to-violet-500/30 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="relative py-5 md:py-10 border-y bg-gradient-to-r from-background via-primary/[0.03] to-background" aria-label="Key metrics">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid grid-cols-2 md:flex md:flex-wrap md:justify-center items-center gap-4 md:gap-14 lg:gap-24">
              {[
                { value: <AnimatedCounter target={13} />, label: "Marketing Channels", icon: BarChart3 },
                { value: <AnimatedCounter target={3} />, label: "Priority Channels", icon: Target },
                { value: "$0", label: "Free Forever", icon: Shield },
                { value: "90d", label: "Execution Roadmap", icon: Clock },
              ].map((metric, i) => {
                const Icon = metric.icon;
                return (
                  <motion.div 
                    key={metric.label} 
                    className="flex items-center gap-3 py-3"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold font-display gradient-text">{metric.value}</p>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 md:py-36 relative overflow-hidden" aria-labelledby="how-it-works-heading">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5 border border-primary/20"
              >
                Simple 3-Step Process
              </motion.span>
              <h2 id="how-it-works-heading" className="text-3xl md:text-5xl font-display font-bold mb-5">
                From Website to Focused Plan <span className="gradient-text">in 3 Steps</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Start with your website, see your strongest opportunities, and leave with a sequenced plan your team can execute.
              </p>
            </div>

            <div className="relative max-w-5xl mx-auto">
              <div className="hidden md:block absolute top-[60px] left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-[3px]" aria-hidden="true">
                <div className="w-full h-full bg-gradient-to-r from-indigo-500/60 via-violet-500/40 to-indigo-500/60 rounded-full" />
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/40 via-violet-500/30 to-indigo-500/40 rounded-full blur-md" />
              </div>
              <div className="grid md:grid-cols-3 gap-8 md:gap-10">
                {STEPS.map((step, idx) => ({
                  ...step,
                  gradient: [
                    "from-indigo-500 to-blue-600",
                    "from-violet-500 to-purple-600",
                    "from-indigo-500 to-violet-600",
                  ][idx],
                  shadow: [
                    "shadow-indigo-500/30",
                    "shadow-violet-500/30",
                    "shadow-indigo-500/30",
                  ][idx],
                })).map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ delay: idx * 0.15, duration: 0.4 }}
                    className="relative text-center group"
                  >
                    <div className="relative z-10 mx-auto mb-6">
                      <div className={`w-[64px] h-[64px] rounded-2xl bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center text-2xl font-bold mx-auto shadow-xl ${item.shadow} ring-4 ring-background`}>
                        {item.step}
                      </div>
                    </div>
                    <Card className="border-none shadow-lg bg-background/80 backdrop-blur-sm h-full hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                      <CardHeader className="pt-5 pb-2">
                        <CardTitle className="text-xl font-bold">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-6">
                        <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 md:py-36 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden" aria-labelledby="features-heading">
          <div className="dot-pattern absolute inset-0 pointer-events-none opacity-30" aria-hidden="true" />
          <div className="absolute top-20 right-10 w-80 h-80 bg-violet-500/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-20 left-10 w-60 h-60 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5 border border-primary/20"
              >
                Full Feature Suite
              </motion.span>
              <h2 id="features-heading" className="text-3xl md:text-5xl font-display font-bold mb-5">
                Strategy You Can <span className="gradient-text">Defend and Execute</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Move from a long list of channel ideas to a focused plan with evidence, readiness gates, economics, and clear next actions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5 max-w-6xl mx-auto">
              {[
                {
                  icon: <Brain className="h-8 w-8 text-indigo-500" aria-hidden="true" />,
                  title: "Deep Personalization",
                  description: "GTM Champion crawls your key pages and extracts verified product names, features, pricing, competitors, positioning, and ICP signals without filling missing inputs with invented details.",
                  span: "md:col-span-4 lg:col-span-7",
                  gradient: "from-indigo-500/10 to-violet-500/10",
                  borderGradient: "from-indigo-500/30 via-violet-500/20 to-transparent",
                },
                {
                  icon: <BarChart3 className="h-8 w-8 text-emerald-500" aria-hidden="true" />,
                  title: "13 Deep Channel Playbooks",
                  description: "Each channel gets distinct strategic pillars, KPIs, quick wins, tools, prerequisites, budget guidance, operating cadence, risks, and a 30, 60, and 90-day roadmap.",
                  span: "md:col-span-2 lg:col-span-5",
                  gradient: "from-emerald-500/10 to-teal-500/10",
                  borderGradient: "from-emerald-500/30 via-teal-500/20 to-transparent",
                },
                {
                  icon: <PenTool className="h-8 w-8 text-violet-500" aria-hidden="true" />,
                  title: "AI Content Tools",
                  description: "Generate ready-to-publish LinkedIn posts, full email campaigns, and long-form blog articles — all written in your brand voice using your actual product details.",
                  span: "md:col-span-3 lg:col-span-5",
                  gradient: "from-violet-500/10 to-purple-500/10",
                  borderGradient: "from-violet-500/30 via-purple-500/20 to-transparent",
                },
                {
                  icon: <Layers className="h-8 w-8 text-rose-500" aria-hidden="true" />,
                  title: "Top-Three Channel Focus",
                  description: "Channel-fit scoring turns 13 possible directions into three priorities and one cross-channel 90-day plan, so your team knows what to do first.",
                  span: "md:col-span-3 lg:col-span-4",
                  gradient: "from-rose-500/10 to-pink-500/10",
                  borderGradient: "from-rose-500/30 via-pink-500/20 to-transparent",
                },
                {
                  icon: <UserCheck className="h-8 w-8 text-cyan-500" aria-hidden="true" />,
                  title: "ICP Detection & Editing",
                  description: "Your Ideal Customer Profile is auto-detected from your site — persona, company size, industry, and pain points — and fully editable right on the dashboard.",
                  span: "md:col-span-3 lg:col-span-3",
                  gradient: "from-cyan-500/10 to-sky-500/10",
                  borderGradient: "from-cyan-500/30 via-sky-500/20 to-transparent",
                },
                {
                  icon: <MessageSquare className="h-8 w-8 text-blue-500" aria-hidden="true" />,
                  title: "AI Q&A Assistant",
                  description: "Ask anything about your GTM strategy and get personalized answers grounded in your company's actual context, channels, and goals.",
                  span: "md:col-span-3 lg:col-span-4",
                  gradient: "from-blue-500/10 to-cyan-500/10",
                  borderGradient: "from-blue-500/30 via-cyan-500/20 to-transparent",
                },
                {
                  icon: <Mail className="h-8 w-8 text-amber-500" aria-hidden="true" />,
                  title: "Weekly Email Sprints",
                  description: "Every Monday, a fresh batch of actionable content ideas lands in your inbox — personalized to your business and ready to execute that week.",
                  span: "md:col-span-3 lg:col-span-4",
                  gradient: "from-amber-500/10 to-orange-500/10",
                  borderGradient: "from-amber-500/30 via-orange-500/20 to-transparent",
                },
                {
                  icon: <Download className="h-8 w-8 text-purple-500" aria-hidden="true" />,
                  title: "Evidence-Rich PDF & CSV Export",
                  description: "Share the complete reasoning behind the plan, including scores, evidence, assumptions, prerequisites, budgets, risks, and roadmaps.",
                  span: "md:col-span-3 lg:col-span-4",
                  gradient: "from-purple-500/10 to-fuchsia-500/10",
                  borderGradient: "from-purple-500/30 via-fuchsia-500/20 to-transparent",
                },
                {
                  icon: <Globe className="h-8 w-8 text-teal-500" aria-hidden="true" />,
                  title: "PageSpeed Insights",
                  description: "Automatic performance audits with Core Web Vitals, loading scores, and top optimization opportunities pulled directly from Google PageSpeed.",
                  span: "md:col-span-3 lg:col-span-4",
                  gradient: "from-teal-500/10 to-emerald-500/10",
                  borderGradient: "from-teal-500/30 via-emerald-500/20 to-transparent",
                },
                {
                  icon: <Wallet className="h-8 w-8 text-orange-500" aria-hidden="true" />,
                  title: "A/B Budget Scenarios",
                  description: "Model conservative, balanced, and aggressive budget allocations side-by-side to see exactly where your marketing dollars will have the most impact. (Pro)",
                  span: "md:col-span-3 lg:col-span-4",
                  gradient: "from-orange-500/10 to-amber-500/10",
                  borderGradient: "from-orange-500/30 via-amber-500/20 to-transparent",
                },
                {
                  icon: <History className="h-8 w-8 text-sky-500" aria-hidden="true" />,
                  title: "12-Month Strategy History",
                  description: "Re-analyze your website anytime and track how your GTM strategy evolves — every snapshot is saved so you can compare progress over time. (Pro)",
                  span: "md:col-span-3 lg:col-span-4",
                  gradient: "from-sky-500/10 to-blue-500/10",
                  borderGradient: "from-sky-500/30 via-blue-500/20 to-transparent",
                },
                {
                  icon: <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />,
                  title: "Readiness, Evidence & Guardrails",
                  description: "See confidence and quality scores, the evidence behind each recommendation, what must be true before launch, and the risks that should stop premature scaling.",
                  span: "md:col-span-6 lg:col-span-4",
                  gradient: "from-indigo-500/10 to-purple-500/10",
                  borderGradient: "from-indigo-500/30 via-purple-500/20 to-transparent",
                }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                  className={feature.span}
                >
                  <div className="bento-card group relative h-full rounded-2xl bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm p-6 md:p-7 hover:shadow-xl transition-all duration-300 overflow-hidden border border-white/60 dark:border-white/10">
                    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${feature.borderGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mb-4 shadow-sm border border-slate-200/50 dark:border-slate-600/50 group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                      <h3 className="text-lg font-bold mb-2 font-display">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="channels" className="py-16 md:py-36 relative overflow-hidden" aria-labelledby="channels-heading">
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute top-20 right-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5 border border-primary/20"
              >
                13 Marketing Channels
              </motion.span>
              <h2 id="channels-heading" className="text-3xl md:text-5xl font-display font-bold mb-5">
                Strategies for Every Marketing Channel
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Every channel includes fit and confidence scoring, evidence, prerequisites, budget guidance, risks, strategic pillars, quick wins, KPIs, and a 90-day roadmap.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-14">
              {Object.entries(CHANNEL_GROUPS).map(([key, group], groupIdx) => {
                const groupColorClasses = {
                  bar: groupIdx === 0 ? "bg-emerald-500" : groupIdx === 1 ? "bg-blue-500" : "bg-violet-500",
                  badge: groupIdx === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" : groupIdx === 1 ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" : "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800",
                  icon: groupIdx === 0 ? "text-emerald-500" : groupIdx === 1 ? "text-blue-500" : "text-violet-500",
                  hover: groupIdx === 0 ? "group-hover:border-emerald-300 dark:group-hover:border-emerald-700 group-hover:shadow-emerald-500/10" : groupIdx === 1 ? "group-hover:border-blue-300 dark:group-hover:border-blue-700 group-hover:shadow-blue-500/10" : "group-hover:border-violet-300 dark:group-hover:border-violet-700 group-hover:shadow-violet-500/10",
                  iconBg: groupIdx === 0 ? "group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40" : groupIdx === 1 ? "group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40" : "group-hover:bg-violet-50 dark:group-hover:bg-violet-950/40",
                  glow: groupIdx === 0 ? "from-emerald-500/20 to-teal-500/10" : groupIdx === 1 ? "from-blue-500/20 to-indigo-500/10" : "from-violet-500/20 to-purple-500/10",
                };
                
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ delay: groupIdx * 0.1, duration: 0.4 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-1.5 h-8 rounded-full ${groupColorClasses.bar}`} />
                      <h3 className="text-lg font-bold font-display text-foreground">{group.label}</h3>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${groupColorClasses.badge}`}>
                        {group.channels.length} channels
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {group.channels.map((channelId, chIdx) => {
                        const channel = CHANNELS.find(c => c.id === channelId)!;
                        const Icon = CHANNEL_ICONS[channel.id] ?? Search;
                        return (
                          <motion.div
                            key={channel.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: chIdx * 0.04, duration: 0.3 }}
                          >
                            <div
                              className={`group bg-background rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 dark:border-slate-800 text-center cursor-default hover:-translate-y-1 ${groupColorClasses.hover}`}
                            >
                              <div className={`w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 transition-all duration-300 ${groupColorClasses.iconBg}`}>
                                <Icon className={`h-5 w-5 ${groupColorClasses.icon} transition-colors`} aria-hidden="true" />
                              </div>
                              <h4 className="font-semibold text-sm mb-1">{channel.id}</h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">{channel.description}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-36 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden" aria-labelledby="ai-chat-heading">
          <div className="absolute top-10 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-10 left-0 w-60 h-60 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="space-y-7">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                >
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    AI Assistant
                  </span>
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  id="ai-chat-heading" className="text-3xl md:text-5xl font-display font-bold"
                >
                  Ask AI About Your GTM Strategy
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="text-lg text-muted-foreground leading-relaxed"
                >
                  Have questions about which channel to prioritize? Wondering how to improve your SEO? GTM Champion's AI assistant answers your marketing questions with personalized advice based on your company's context.
                </motion.p>
                <motion.ul 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  {[
                    "Get personalized answers based on your business model",
                    "Ask about any of the 13 marketing channels",
                    "Receive specific, actionable recommendations",
                    "Powered by GPT-5 with 2025 B2B marketing knowledge"
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </motion.ul>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                >
                  <Button size="lg" onClick={() => setLocation("/auth")} data-testid="button-try-ai-chat" className="group shadow-lg shadow-primary/20">
                    Try AI Chat Free <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </Button>
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-2xl blur-xl -m-2" aria-hidden="true" />
                <div className="relative bg-background rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-800/50 dark:to-indigo-950/20">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">GTM Champion AI</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                        Online · Ask me anything about your marketing
                      </p>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[85%] shadow-sm">
                        What marketing channel should I focus on first for my developer tools company?
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%]">
                        <TypingText text="For a developer tools company, I recommend prioritizing Content Marketing and SEO. Developers research solutions through technical blogs, documentation, and Stack Overflow. Create tutorial content, build SEO around programming terms, and consider a developer community strategy..." />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <div className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm text-muted-foreground">
                        Ask about your GTM strategy...
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                        <ArrowRight className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-36 relative overflow-hidden" aria-labelledby="content-tools-heading">
          <div className="absolute top-10 left-0 w-72 h-72 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-10 right-0 w-60 h-60 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative order-2 lg:order-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-2xl blur-xl -m-2" aria-hidden="true" />
                <div className="relative bg-background rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-violet-50/30 dark:from-slate-800/50 dark:to-violet-950/20">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                      <PenTool className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Content Tools</p>
                      <p className="text-xs text-muted-foreground">Written in your brand voice</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    {[
                      {
                        label: "LinkedIn Post",
                        color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
                        content: "Most B2B teams waste their biggest GTM asset: their customer success stories. Here's how we helped [Client] 3x their pipeline in 90 days using just two channels...",
                      },
                      {
                        label: "Email Campaign",
                        color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                        content: "Subject: The one GTM mistake costing SaaS teams $50K+\n\nHi [First Name], If you're splitting budget evenly across 13 channels, you're probably funding your 11 weakest ones...",
                      },
                      {
                        label: "Blog Article",
                        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                        content: "The 2025 B2B SaaS GTM Playbook: Why PLG and Sales-Led Motions Are Converging — and What It Means for Your Channel Mix...",
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.color}`}>{item.label}</span>
                          <div className="flex gap-1.5">
                            <div className="h-5 w-12 rounded bg-slate-200 dark:bg-slate-700 text-[9px] flex items-center justify-center text-muted-foreground font-medium">Copy</div>
                            <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-700 text-[9px] flex items-center justify-center text-muted-foreground font-medium">Download</div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <div className="space-y-7 order-1 lg:order-2">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                >
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-semibold border border-violet-500/20">
                    <PenTool className="h-3.5 w-3.5" aria-hidden="true" />
                    AI Content Tools
                  </span>
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  id="content-tools-heading" className="text-3xl md:text-5xl font-display font-bold"
                >
                  Strategy Is Just the Start — <span className="gradient-text">We Write the Content Too</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="text-lg text-muted-foreground leading-relaxed"
                >
                  Most strategy tools stop at recommendations. GTM Champion goes further — generating publish-ready content using your actual brand voice, product names, and competitive positioning.
                </motion.p>
                <motion.ul
                  className="space-y-3"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  {[
                    "LinkedIn posts that sound like you wrote them",
                    "Full email campaigns with subject lines and body copy",
                    "Long-form blog articles optimized for SEO",
                    "One-click copy or download as a file",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </motion.ul>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                >
                  <Button size="lg" onClick={() => setLocation("/auth")} data-testid="button-try-content-tools" className="group shadow-lg shadow-primary/20">
                    Try Content Tools Free <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        <PricingSection />

        <section id="faq" className="py-16 md:py-36 bg-slate-50 dark:bg-slate-900/50" aria-labelledby="faq-heading">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5 border border-primary/20"
              >
                FAQ
              </motion.span>
              <h2 id="faq-heading" className="text-3xl md:text-5xl font-display font-bold mb-5">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to know about GTM Champion
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              {FAQ_ITEMS.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  className="border rounded-xl overflow-hidden bg-background shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    aria-expanded={openFaq === idx}
                    aria-controls={`faq-answer-${idx}`}
                  >
                    <span className="font-semibold pr-4">{item.question}</span>
                    <div className={`w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${openFaq === idx ? "rotate-180" : ""}`}>
                      <ChevronDown className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                  </button>
                  {openFaq === idx && (
                    <div 
                      id={`faq-answer-${idx}`}
                      className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-800/50"
                    >
                      <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-16 md:py-36 overflow-hidden" aria-labelledby="cta-heading">
          <div className="cta-mesh-bg absolute inset-0 pointer-events-none" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 via-violet-600/90 to-purple-700/90 pointer-events-none" aria-hidden="true" />
          <div className="cta-particles absolute inset-0 pointer-events-none" aria-hidden="true" />
          <div className="container mx-auto px-4 md:px-8 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto"
            >
              <h2 id="cta-heading" className="text-3xl md:text-5xl font-display font-bold mb-6 text-white">
                Ready to Focus Your Next 90 Days?
              </h2>
              <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto mb-10">
                Start free with no credit card. Turn your website into a prioritized B2B SaaS growth plan with clear channel choices, readiness gates, budgets, risks, and execution roadmaps.
              </p>
              <Button 
                size="lg" 
                variant="secondary" 
                className="h-14 px-8 text-lg shadow-xl group"
                onClick={() => setLocation("/auth")}
                data-testid="button-final-cta"
              >
                Get Started Free <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Button>
              <div className="flex flex-wrap justify-center items-center gap-6 mt-10 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Free forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>2-minute setup</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-12" role="contentinfo">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 font-display font-bold text-lg text-white mb-4">
                <Zap className="h-5 w-5 fill-current" aria-hidden="true" />
                <span>GTM Champion</span>
              </div>
              <p className="text-sm text-slate-400">
                AI-powered Go-To-Market strategy for B2B SaaS companies.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#channels" className="hover:text-white transition-colors">Channels</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/auth" className="hover:text-white transition-colors">Sign Up</a></li>
                <li><a href="/auth" className="hover:text-white transition-colors">Log In</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} GTM Champion. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-slate-400">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
