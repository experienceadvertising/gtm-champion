import { Link } from "wouter";
import { Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageMeta } from "@/components/PageMeta";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Privacy Policy - GTM Champion"
        description="GTM Champion's privacy policy: how we collect, use, and protect data when you use our AI-powered Go-To-Market strategy platform."
        path="/privacy"
      />
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
        <h1 className="text-4xl font-display font-bold mb-2" data-testid="text-privacy-heading">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-display font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">When you use GTM Champion, we collect the following information:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Account Information:</strong> Your email address and name when you register.</li>
              <li><strong>Company Data:</strong> The website URL you provide for analysis, along with publicly available information scraped from that URL.</li>
              <li><strong>Usage Data:</strong> How you interact with our platform, including pages visited and features used.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and IP address for security and analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To generate personalized Go-To-Market strategy recommendations.</li>
              <li>To send weekly AI content sprint emails (you can unsubscribe at any time).</li>
              <li>To improve our AI models and platform functionality.</li>
              <li>To communicate with you about your account and platform updates.</li>
              <li>To detect and prevent fraud or abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold mb-3">3. Data Sharing</h2>
            <p className="text-muted-foreground mb-3">We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>AI Service Providers:</strong> We use OpenAI to process website content and generate recommendations. Your company URL and publicly available website content may be sent to OpenAI for analysis.</li>
              <li><strong>Payment Processors:</strong> If you subscribe to a paid plan, Stripe processes your payment information. We do not store credit card details.</li>
              <li><strong>Analytics:</strong> We use Google Analytics to understand how our platform is used.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold mb-3">4. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures including HTTPS encryption, CSRF protection, 
              secure session management, and rate limiting. Your data is stored in encrypted PostgreSQL databases. 
              Passwords are hashed using bcrypt with salt rounds.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold mb-3">5. Cookies</h2>
            <p className="text-muted-foreground">
              We use essential cookies for session management and CSRF protection. We also use Google Analytics 
              cookies to understand platform usage. You can disable non-essential cookies in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Opt out of marketing emails at any time.</li>
              <li>Request a copy of your data in a portable format.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your account data for as long as your account is active. If you delete your account, 
              all associated data (company information, recommendations, channel insights) is permanently 
              removed from our systems through cascading deletion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold mb-3">8. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy from time to time. We will notify you of significant 
              changes by email or through a notice on our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold mb-3">9. Contact</h2>
            <p className="text-muted-foreground">
              If you have questions about this privacy policy or your data, please visit our{" "}
              <Link href="/contact" className="text-primary hover:underline">contact page</Link>.
            </p>
          </section>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-8" role="contentinfo">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} GTM Champion. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
