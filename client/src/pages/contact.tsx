import { Link } from "wouter";
import { Zap, ArrowLeft, Mail, Linkedin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
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

      <main id="main-content" className="container mx-auto px-4 md:px-8 py-16 max-w-3xl">
        <h1 className="text-4xl font-display font-bold mb-4" data-testid="text-contact-heading">Contact Us</h1>
        <p className="text-xl text-muted-foreground mb-12">
          Have questions, feedback, or partnership inquiries? We'd love to hear from you.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-card border rounded-xl p-8">
            <Mail className="h-8 w-8 text-primary mb-4" aria-hidden="true" />
            <h2 className="text-xl font-display font-semibold mb-2">General Inquiries</h2>
            <p className="text-muted-foreground mb-4">
              For questions about GTM Champion, feature requests, or general feedback.
            </p>
            <a
              href="mailto:hello@gtmchampion.com"
              className="text-primary hover:underline font-medium"
              data-testid="link-email-general"
            >
              hello@gtmchampion.com
            </a>
          </div>

          <div className="bg-card border rounded-xl p-8">
            <MessageSquare className="h-8 w-8 text-primary mb-4" aria-hidden="true" />
            <h2 className="text-xl font-display font-semibold mb-2">Support</h2>
            <p className="text-muted-foreground mb-4">
              Need help with your account, billing, or technical issues?
            </p>
            <a
              href="mailto:support@gtmchampion.com"
              className="text-primary hover:underline font-medium"
              data-testid="link-email-support"
            >
              support@gtmchampion.com
            </a>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary/5 via-violet-500/5 to-purple-500/5 border rounded-xl p-8 mb-16">
          <h2 className="text-2xl font-display font-bold mb-4">Connect With Us</h2>
          <p className="text-muted-foreground mb-6">
            Follow the creator on LinkedIn for B2B marketing insights and GTM Champion updates.
          </p>
          <a
            href="https://www.linkedin.com/in/worldsgreatestmarketer/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
            data-testid="link-linkedin"
          >
            <Linkedin className="h-5 w-5" aria-hidden="true" />
            LinkedIn — Creator Profile
          </a>
        </div>

        <section className="text-center py-12 border-t">
          <h2 className="text-2xl font-display font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">Build your AI-powered GTM strategy in under a minute.</p>
          <Link href="/auth">
            <Button size="lg" className="h-12 px-8" data-testid="button-contact-cta">
              Get Started Free
            </Button>
          </Link>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-8" role="contentinfo">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} GTM Champion. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
