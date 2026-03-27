import { Link } from "wouter";
import { Zap, ArrowLeft, Linkedin, Target, BarChart3, Brain, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50" role="navigation" aria-label="Main navigation">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg" data-testid="link-home">
            <Zap className="h-5 w-5 fill-current text-primary" aria-hidden="true" />
            <span>GTM Champion</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <main id="main-content" className="container mx-auto px-4 md:px-8 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-6" data-testid="text-about-heading">About GTM Champion</h1>

        <section className="prose prose-slate dark:prose-invert max-w-none mb-16">
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">
            GTM Champion is an AI-powered Go-To-Market strategy platform built specifically for B2B SaaS companies. 
            We help marketers and founders move from guesswork to data-driven strategy in seconds.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-card border rounded-xl p-6">
              <Target className="h-8 w-8 text-primary mb-4" aria-hidden="true" />
              <h2 className="text-xl font-display font-semibold mb-2">Our Mission</h2>
              <p className="text-muted-foreground">
                To democratize Go-To-Market strategy by making AI-powered marketing intelligence 
                accessible to every B2B SaaS company, regardless of budget or team size.
              </p>
            </div>
            <div className="bg-card border rounded-xl p-6">
              <Brain className="h-8 w-8 text-primary mb-4" aria-hidden="true" />
              <h2 className="text-xl font-display font-semibold mb-2">How It Works</h2>
              <p className="text-muted-foreground">
                Enter your website URL and our AI analyzes your product, audience, and competitive 
                positioning to generate personalized strategies across 13 marketing channels.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/5 via-violet-500/5 to-purple-500/5 border rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-display font-bold mb-4">13 Marketing Channels, One Platform</h2>
            <p className="text-muted-foreground mb-6">
              GTM Champion provides actionable strategies across every major B2B marketing channel:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                "SEO", "AI Search / LLMs", "Paid Search", "Paid Social", "Organic Social",
                "Retargeting", "CRO", "Email Marketing", "Content Marketing",
                "Community", "ABM", "Partnerships", "Outbound Sales"
              ].map((ch) => (
                <div key={ch} className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                  <span>{ch}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-display font-bold mb-6">Meet the Creator</h2>
          <div className="bg-card border rounded-xl p-8 flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
                <Rocket className="h-10 w-10 text-white" aria-hidden="true" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold mb-2">Built by a B2B Marketing Veteran</h3>
              <p className="text-muted-foreground mb-4">
                GTM Champion was created by a digital marketing professional with deep expertise in 
                B2B SaaS marketing, online advertising, and go-to-market strategy. With years of 
                hands-on experience helping SaaS companies scale their marketing efforts, this tool 
                was born from real-world challenges — the gap between having a great product and 
                knowing how to bring it to market effectively.
              </p>
              <p className="text-muted-foreground mb-6">
                The vision behind GTM Champion is simple: every B2B SaaS company deserves a 
                world-class GTM strategy, not just the ones that can afford expensive consultants 
                or large marketing teams. By combining AI with proven marketing frameworks, 
                GTM Champion delivers the kind of strategic insight that previously required 
                weeks of agency work — in seconds.
              </p>
              <a
                href="https://www.linkedin.com/in/worldsgreatestmarketer/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
                data-testid="link-creator-linkedin"
              >
                <Linkedin className="h-5 w-5" aria-hidden="true" />
                Connect on LinkedIn
              </a>
            </div>
          </div>
        </section>

        <section className="text-center py-12 border-t">
          <h2 className="text-2xl font-display font-bold mb-4">Ready to build your GTM strategy?</h2>
          <p className="text-muted-foreground mb-6">Get personalized recommendations across 13 channels in under a minute.</p>
          <Link href="/auth">
            <Button size="lg" className="h-12 px-8" data-testid="button-about-cta">
              Get Started Free
            </Button>
          </Link>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-8" role="contentinfo">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} GTM Champion. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
