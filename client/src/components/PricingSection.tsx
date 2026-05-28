import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createCheckoutSession, getStripeProducts, getSession, type StripeProduct } from "@/lib/api";

const FREE_FEATURES = [
  "AI-powered GTM analysis",
  "All 13 channel strategies",
  "AI chat (20 messages / min)",
  "Content tools (10 generations / min)",
  "Weekly strategy emails",
  "Up to 3 buyer personas",
  "1 website re-analysis per week",
  "Standard PDF export (with footer)",
];

const PRO_FEATURES = [
  "Everything in Free",
  "🤖 GTM Agent — personal coaching nudges, stall alerts & weekly digests",
  "10x higher AI chat + content limits",
  "Unlimited website re-analysis",
  "12-month strategy history & snapshots",
  "Branded multi-page PDF export with your logo",
  "Up to 8 buyer personas",
  "A/B budget scenarios (conservative / balanced / aggressive)",
  "Priority email support",
];

interface PriceRow {
  id: string;
  amount: number;
  currency: string;
  interval: string;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function pickProPrices(products: StripeProduct[]): { monthly?: PriceRow; yearly?: PriceRow } {
  const pro = products.find((p) => /pro/i.test(p.name) || p.metadata?.tier === "premium");
  if (!pro) return {};
  const monthly = pro.prices.find((pr) => pr.recurring?.interval === "month" && pr.active);
  const yearly = pro.prices.find((pr) => pr.recurring?.interval === "year" && pr.active);
  const toRow = (pr?: StripeProduct["prices"][number]): PriceRow | undefined =>
    pr ? { id: pr.id, amount: pr.unit_amount, currency: pr.currency, interval: pr.recurring.interval } : undefined;
  return { monthly: toRow(monthly), yearly: toRow(yearly) };
}

export function PricingSection() {
  const [interval, setInterval] = useState<"month" | "year">("year");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: productsResponse } = useQuery({
    queryKey: ["stripeProducts"],
    queryFn: getStripeProducts,
    staleTime: 5 * 60_000,
  });

  const prices = useMemo(() => pickProPrices(productsResponse?.data ?? []), [productsResponse]);
  const selectedPrice = interval === "year" ? prices.yearly : prices.monthly;
  const monthlyDisplay = prices.monthly ? formatPrice(prices.monthly.amount, prices.monthly.currency) : "$29";
  const yearlyDisplay = prices.yearly ? formatPrice(prices.yearly.amount, prices.yearly.currency) : "$290";
  const displayedAmount = interval === "year" ? yearlyDisplay : monthlyDisplay;
  const displayedInterval = interval === "year" ? "year" : "month";
  const yearlySavings = useMemo(() => {
    if (!prices.monthly || !prices.yearly) return null;
    const annualizedMonthly = prices.monthly.amount * 12;
    const diff = annualizedMonthly - prices.yearly.amount;
    if (diff <= 0) return null;
    return formatPrice(diff, prices.yearly.currency);
  }, [prices]);

  const handleStartFree = () => setLocation("/auth");

  const handleUpgrade = async () => {
    const session = getSession();
    if (!session) {
      setLocation(`/auth?redirect=${encodeURIComponent("/dashboard?upgrade=pending")}`);
      return;
    }
    if (!selectedPrice) {
      toast({
        title: "Pricing unavailable",
        description: "Could not load Pro pricing. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }
    setCheckoutLoading(true);
    try {
      const { url } = await createCheckoutSession(selectedPrice.id);
      window.location.assign(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start checkout";
      toast({ title: "Checkout failed", description: message, variant: "destructive" });
      setCheckoutLoading(false);
    }
  };

  return (
    <section id="pricing" className="py-16 md:py-36 relative overflow-hidden" aria-labelledby="pricing-heading">
      <div
        className="absolute inset-0 bg-gradient-to-b from-background via-indigo-50/30 to-background dark:from-background dark:via-indigo-950/10 dark:to-background pointer-events-none"
        aria-hidden="true"
      />
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5 border border-primary/20"
          >
            Pricing
          </motion.span>
          <h2 id="pricing-heading" className="text-3xl md:text-5xl font-display font-bold mb-5">
            Free to start. Pro when you need more.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get the full GTM analysis on day one. Upgrade only when you need higher AI limits, branded reports, or unlimited re-analysis.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-10 text-sm" role="tablist" aria-label="Billing interval">
          <button
            type="button"
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              interval === "month"
                ? "bg-primary text-primary-foreground shadow"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setInterval("month")}
            data-testid="pricing-interval-month"
            aria-selected={interval === "month"}
            role="tab"
          >
            Monthly
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
              interval === "year"
                ? "bg-primary text-primary-foreground shadow"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setInterval("year")}
            data-testid="pricing-interval-year"
            aria-selected={interval === "year"}
            role="tab"
          >
            Yearly
            {yearlySavings && (
              <Badge variant="secondary" className="text-[10px] py-0">
                Save {yearlySavings}
              </Badge>
            )}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <Card className="h-full border-border/60">
              <CardHeader className="pt-8">
                <CardTitle className="text-2xl font-bold">Free</CardTitle>
                <CardDescription>Everything you need to build your first GTM strategy.</CardDescription>
                <div className="mt-5">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-muted-foreground ml-2">forever</span>
                  <p className="text-sm text-muted-foreground mt-2">No credit card required.</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {FREE_FEATURES.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="pt-4 pb-8">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleStartFree}
                  data-testid="button-start-free"
                >
                  Start Free <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative"
          >
            <div className="pricing-glow absolute -inset-2 rounded-3xl opacity-60 blur-lg pointer-events-none" aria-hidden="true" />
            <Card className="relative border-primary/30 shadow-2xl shadow-primary/10 bg-background overflow-hidden h-full">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" aria-hidden="true" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide shadow-lg flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Recommended
              </div>
              <CardHeader className="pt-10">
                <CardTitle className="text-2xl font-bold text-primary">Pro</CardTitle>
                <CardDescription>For teams turning GTM strategy into a system.</CardDescription>
                <div className="mt-5">
                  <span className="text-5xl font-bold gradient-text">{displayedAmount}</span>
                  <span className="text-muted-foreground ml-2">/ {displayedInterval}</span>
                  <p className="text-sm text-muted-foreground mt-2">
                    {interval === "year" ? "Billed annually. Cancel anytime." : "Billed monthly. Cancel anytime."}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {PRO_FEATURES.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="pt-4 pb-8">
                <Button
                  className="w-full shadow-lg shadow-primary/20"
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  data-testid="button-upgrade-pro"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Redirecting…
                    </>
                  ) : (
                    <>
                      Upgrade to Pro <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          Need invoicing, SSO, or team seats? <a href="/contact" className="text-primary hover:underline">Get in touch</a>.
        </p>
      </div>
    </section>
  );
}
