import { useState } from "react";
import { useLocation } from "wouter";
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
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import heroImage from "@assets/generated_images/diverse_marketing_team_collaborating.png";

const CHANNELS = [
  { id: "SEO", icon: Search, description: "Organic search optimization" },
  { id: "LLMs", icon: Brain, description: "AI search visibility" },
  { id: "Paid Search", icon: TrendingUp, description: "Google & Bing ads" },
  { id: "Paid Social", icon: Megaphone, description: "LinkedIn & social ads" },
  { id: "Organic Social", icon: Share2, description: "LinkedIn & Twitter growth" },
  { id: "Retargeting", icon: RefreshCw, description: "Re-engage visitors" },
  { id: "CRO", icon: Target, description: "Conversion optimization" },
  { id: "Email", icon: Mail, description: "Nurture campaigns" },
  { id: "Content", icon: PenTool, description: "Blogs, guides & webinars" },
  { id: "Community", icon: Users, description: "Build your audience" },
  { id: "ABM", icon: Target, description: "Account-based marketing" },
  { id: "Partnerships", icon: Handshake, description: "Partner ecosystem" },
  { id: "Outbound", icon: Phone, description: "Cold email & sales" },
];

const FAQ_ITEMS = [
  {
    question: "What is GTM Champion?",
    answer: "GTM Champion is an AI-powered Go-To-Market strategy platform for B2B SaaS companies. It analyzes your website, understands your product and target audience, and generates personalized marketing recommendations across 13 channels including SEO, paid search, content marketing, ABM, and partnerships."
  },
  {
    question: "How does GTM Champion work?",
    answer: "Simply enter your website URL and GTM Champion's AI will scrape and analyze your site content. Within seconds, you'll receive a comprehensive GTM strategy with channel-specific recommendations, quick wins, KPIs to track, and weekly content ideas tailored to your business."
  },
  {
    question: "What marketing channels does GTM Champion cover?",
    answer: "GTM Champion provides strategies for 13 marketing channels: SEO, LLMs/AI Search, Paid Search, Paid Social, Organic Social, Retargeting, CRO (Conversion Rate Optimization), Email Marketing, Content Marketing, Community Building, ABM (Account-Based Marketing), Partnerships, and Outbound Sales."
  },
  {
    question: "Is GTM Champion free to use?",
    answer: "Yes, GTM Champion offers a free Starter plan that includes basic GTM analysis and 3 monthly recommendations. The Growth plan at $49/month provides unlimited recommendations, weekly AI content sprints, and CRM integrations."
  },
  {
    question: "What are the weekly AI content sprints?",
    answer: "Every Monday morning, GTM Champion sends you a fresh batch of actionable content ideas and marketing tactics via email. These are personalized to your business and designed to be executed within the week for maximum impact."
  },
  {
    question: "Can I ask questions about my GTM strategy?",
    answer: "Yes! GTM Champion includes an AI assistant that answers your marketing questions with personalized advice based on your company's specific context, business model, and GTM motion. Ask about any channel and get actionable recommendations."
  }
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      {/* Skip to main content for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded z-50">
        Skip to main content
      </a>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md" role="navigation" aria-label="Main navigation">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <a href="/" className="flex items-center gap-2 font-display font-bold text-xl tracking-tight text-primary" aria-label="GTM Champion Home">
            <Zap className="h-6 w-6 fill-current" aria-hidden="true" />
            <span>GTM Champion</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">How it works</a>
            <a href="#channels" className="hover:text-primary transition-colors">Channels</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="/blog" className="hover:text-primary transition-colors">Blog</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/auth")} data-testid="button-login">Log in</Button>
            <Button onClick={() => setLocation("/auth")} data-testid="button-get-started">Get Started</Button>
          </div>
        </div>
      </nav>

      <main id="main-content">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden" aria-labelledby="hero-heading">
          <div className="container mx-auto px-4 md:px-8">
            <motion.div 
              className="grid lg:grid-cols-2 gap-12 items-center"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="space-y-8">
                <motion.div variants={itemVariants}>
                  <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide mb-6">
                    AI-Powered Go-To-Market Strategy
                  </span>
                  <h1 id="hero-heading" className="text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.1] text-foreground">
                    Your B2B SaaS Marketing Strategy, <span className="gradient-text">Solved by AI.</span>
                  </h1>
                </motion.div>
                
                <motion.p variants={itemVariants} className="text-xl text-muted-foreground max-w-xl leading-relaxed">
                  Stop guessing which channels to invest in. GTM Champion analyzes your website and generates personalized Go-To-Market recommendations across 13 marketing channels in seconds.
                </motion.p>
                
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    className="h-14 px-8 text-lg shadow-lg shadow-primary/25" 
                    onClick={() => setLocation("/auth")}
                    data-testid="button-analyze-website"
                  >
                    Analyze My Website Free <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-500" aria-hidden="true" />
                    <span>Results in 30 seconds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" aria-hidden="true" />
                    <span>13 channel strategies</span>
                  </div>
                </motion.div>
              </div>

              <motion.div variants={itemVariants} className="relative lg:h-[600px] w-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-900/10 bg-slate-50">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent mix-blend-overlay z-10 pointer-events-none" aria-hidden="true" />
                <img 
                  src={heroImage} 
                  alt="Marketing team collaborating on Go-To-Market strategy, analyzing growth charts and analytics dashboard in modern office" 
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                  loading="eager"
                  width="800"
                  height="600"
                />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 bg-slate-50 dark:bg-slate-900/50" aria-labelledby="how-it-works-heading">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 id="how-it-works-heading" className="text-3xl md:text-4xl font-display font-bold mb-6">
                How GTM Champion Works
              </h2>
              <p className="text-lg text-muted-foreground">
                Get a complete Go-To-Market strategy in three simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Enter Your Website URL",
                  description: "Simply paste your company website URL. Our AI will scrape and analyze your content, product features, and target audience."
                },
                {
                  step: "2",
                  title: "AI Analyzes Your Business",
                  description: "GPT-4o examines your business model, identifies your GTM motion, and evaluates which of the 13 marketing channels fit best."
                },
                {
                  step: "3",
                  title: "Get Personalized Strategy",
                  description: "Receive detailed recommendations with quick wins, strategic pillars, KPIs to track, and weekly content ideas for each channel."
                }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative"
                >
                  <Card className="border-none shadow-lg bg-background h-full">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                        {item.step}
                      </div>
                      <CardTitle className="text-xl font-bold">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10" aria-hidden="true">
                      <ArrowRight className="h-8 w-8 text-primary/30" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24" aria-labelledby="features-heading">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 id="features-heading" className="text-3xl md:text-4xl font-display font-bold mb-6">
                Everything You Need to Go to Market
              </h2>
              <p className="text-lg text-muted-foreground">
                Powered by AI and the proven 2025 B2B SaaS marketing playbook
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Brain className="h-8 w-8 text-primary" aria-hidden="true" />,
                  title: "AI-Powered Analysis",
                  description: "GPT-4o analyzes your website content and generates personalized strategies based on your unique business model and target audience."
                },
                {
                  icon: <BarChart3 className="h-8 w-8 text-primary" aria-hidden="true" />,
                  title: "13 Channel Strategies",
                  description: "Get tailored recommendations for SEO, paid ads, content, email, ABM, partnerships, outbound, and 6 more marketing channels."
                },
                {
                  icon: <MessageSquare className="h-8 w-8 text-primary" aria-hidden="true" />,
                  title: "AI Q&A Assistant",
                  description: "Ask questions about your GTM strategy and get personalized answers based on your company's context and marketing goals."
                },
                {
                  icon: <Mail className="h-8 w-8 text-primary" aria-hidden="true" />,
                  title: "Weekly Email Sprints",
                  description: "Receive fresh, actionable content ideas every Monday morning tailored to your business and ready to execute."
                },
                {
                  icon: <Target className="h-8 w-8 text-primary" aria-hidden="true" />,
                  title: "Quick Wins",
                  description: "Each channel includes low-effort, high-impact tactics you can implement this week to start seeing results fast."
                },
                {
                  icon: <TrendingUp className="h-8 w-8 text-primary" aria-hidden="true" />,
                  title: "KPIs & Metrics",
                  description: "Know exactly what to measure with channel-specific KPIs and benchmarks based on 2025 B2B SaaS industry standards."
                },
                {
                  icon: <Globe className="h-8 w-8 text-primary" aria-hidden="true" />,
                  title: "Integrations",
                  description: "Connect your analytics, CRM, and marketing tools to enrich recommendations with real performance data."
                },
                {
                  icon: <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />,
                  title: "Strategic Pillars",
                  description: "Get long-term strategic initiatives with specific tactics, objectives, and measurement criteria for each channel."
                }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-background h-full">
                    <CardHeader>
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        {feature.icon}
                      </div>
                      <CardTitle className="text-lg font-bold">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 13 Channels Section */}
        <section id="channels" className="py-24 bg-slate-50 dark:bg-slate-900/50" aria-labelledby="channels-heading">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 id="channels-heading" className="text-3xl md:text-4xl font-display font-bold mb-6">
                Strategies for 13 Marketing Channels
              </h2>
              <p className="text-lg text-muted-foreground">
                Each channel includes strategic pillars, quick wins, KPIs, and personalized recommendations based on your GTM motion
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
              {CHANNELS.map((channel, idx) => {
                const Icon = channel.icon;
                return (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-background rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-800 text-center"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{channel.id}</h3>
                    <p className="text-xs text-muted-foreground">{channel.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI Chat Feature Highlight */}
        <section className="py-24" aria-labelledby="ai-chat-heading">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  New Feature
                </span>
                <h2 id="ai-chat-heading" className="text-3xl md:text-4xl font-display font-bold">
                  Ask AI About Your GTM Strategy
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Have questions about which channel to prioritize? Wondering how to improve your SEO? GTM Champion's AI assistant answers your marketing questions with personalized advice based on your company's context.
                </p>
                <ul className="space-y-3">
                  {[
                    "Get personalized answers based on your business model",
                    "Ask about any of the 13 marketing channels",
                    "Receive specific, actionable recommendations",
                    "Powered by GPT-4o with 2025 B2B marketing knowledge"
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" onClick={() => setLocation("/auth")} data-testid="button-try-ai-chat">
                  Try AI Chat Free <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="bg-background rounded-xl p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">GTM Champion AI</p>
                      <p className="text-xs text-muted-foreground">Ask me anything about your marketing</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 text-sm">
                      What marketing channel should I focus on first for my developer tools company?
                    </div>
                    <div className="bg-primary/10 rounded-lg p-3 text-sm">
                      For a developer tools company, I recommend prioritizing <strong>Content Marketing</strong> and <strong>SEO</strong>. Developers research solutions through technical blogs, documentation, and Stack Overflow. Create tutorial content, build SEO around programming terms, and consider a developer community strategy...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900/50" aria-labelledby="pricing-heading">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 id="pricing-heading" className="text-3xl md:text-4xl font-display font-bold mb-6">
                Simple, Transparent Pricing
              </h2>
              <p className="text-lg text-muted-foreground">
                Start free. Upgrade when you're ready to scale your marketing.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Tier */}
              <Card className="relative border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">Starter</CardTitle>
                  <CardDescription>Perfect for early-stage founders exploring their GTM strategy</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    "AI-powered GTM analysis",
                    "All 13 channel strategies",
                    "3 monthly AI chat questions",
                    "Email support"
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                      <span className="text-slate-600 dark:text-slate-300">{item}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full h-12" onClick={() => setLocation("/auth")} data-testid="button-starter-plan">
                    Get Started Free
                  </Button>
                </CardFooter>
              </Card>

              {/* Paid Tier */}
              <Card className="relative border-primary/20 shadow-2xl shadow-primary/10 scale-105 z-10 bg-background">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Most Popular
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-primary">Growth</CardTitle>
                  <CardDescription>For scaling SaaS companies serious about growth</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">$49</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    "Everything in Starter",
                    "Unlimited AI chat questions",
                    "Weekly content sprint emails",
                    "CRM & analytics integrations",
                    "Priority support"
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                      <span className="text-slate-900 dark:text-slate-100 font-medium">{item}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button className="w-full h-12 text-lg shadow-lg shadow-primary/20" onClick={() => setLocation("/auth")} data-testid="button-growth-plan">
                    Start Free Trial
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24" aria-labelledby="faq-heading">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 id="faq-heading" className="text-3xl md:text-4xl font-display font-bold mb-6">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to know about GTM Champion
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {FAQ_ITEMS.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full px-6 py-4 text-left flex items-center justify-between bg-background hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    aria-expanded={openFaq === idx}
                    aria-controls={`faq-answer-${idx}`}
                  >
                    <span className="font-semibold pr-4">{item.question}</span>
                    {openFaq === idx ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div 
                      id={`faq-answer-${idx}`}
                      className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t"
                    >
                      <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-primary" aria-labelledby="cta-heading">
          <div className="container mx-auto px-4 md:px-8 text-center">
            <h2 id="cta-heading" className="text-3xl md:text-4xl font-display font-bold mb-6 text-primary-foreground">
              Ready to Supercharge Your GTM Strategy?
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Join hundreds of B2B SaaS marketers using AI to build smarter Go-To-Market strategies. Get your personalized recommendations in 30 seconds.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              className="h-14 px-8 text-lg"
              onClick={() => setLocation("/auth")}
              data-testid="button-final-cta"
            >
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
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
                <li><a href="/auth" className="hover:text-white transition-colors">Sign Up</a></li>
                <li><a href="/auth" className="hover:text-white transition-colors">Log In</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              © 2025 GTM Champion. All rights reserved.
            </p>
            <p className="text-xs text-slate-500">
              Built with AI to help B2B SaaS companies grow faster.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
