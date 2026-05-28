import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createCheckoutSession, getStripeProducts, type StripeProduct } from "@/lib/api";
import {
  PREMIUM_REQUIRED_EVENT,
  type PremiumRequiredEventDetail,
} from "@/lib/premiumInterceptor";

const PRO_FEATURES = [
  "🤖 GTM Agent — personal coaching nudges when you stall, celebrates wins, weekly digests",
  "10x higher AI chat + content generation limits",
  "Branded, multi-page PDF exports with your logo",
  "Unlimited re-analysis + 12-month strategy history",
  "Up to 8 buyer personas + scenario-based budget allocations",
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
  const pro = products.find((p) =>
    /pro/i.test(p.name) || p.metadata?.tier === "premium"
  );
  if (!pro) return {};
  const monthly = pro.prices.find((pr) => pr.recurring?.interval === "month" && pr.active);
  const yearly = pro.prices.find((pr) => pr.recurring?.interval === "year" && pr.active);
  const toRow = (pr?: StripeProduct["prices"][number]): PriceRow | undefined =>
    pr ? { id: pr.id, amount: pr.unit_amount, currency: pr.currency, interval: pr.recurring.interval } : undefined;
  return { monthly: toRow(monthly), yearly: toRow(yearly) };
}

export function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [interval, setIntervalState] = useState<"month" | "year">("year");
  const [trigger, setTrigger] = useState<PremiumRequiredEventDetail | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { toast } = useToast();

  const { data: productsResponse } = useQuery({
    queryKey: ["stripeProducts"],
    queryFn: getStripeProducts,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const prices = useMemo(() => pickProPrices(productsResponse?.data ?? []), [productsResponse]);
  const selectedPrice = interval === "year" ? prices.yearly : prices.monthly;
  const yearlySavings = useMemo(() => {
    if (!prices.monthly || !prices.yearly) return null;
    const annualizedMonthly = prices.monthly.amount * 12;
    const diff = annualizedMonthly - prices.yearly.amount;
    if (diff <= 0) return null;
    return formatPrice(diff, prices.yearly.currency);
  }, [prices]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PremiumRequiredEventDetail>).detail;
      setTrigger(detail ?? null);
      setOpen(true);
    };
    window.addEventListener(PREMIUM_REQUIRED_EVENT, handler);
    return () => window.removeEventListener(PREMIUM_REQUIRED_EVENT, handler);
  }, []);

  const handleCheckout = async () => {
    if (!selectedPrice) {
      toast({
        title: "Pricing unavailable",
        description: "Could not load Pro pricing. Please try again in a moment.",
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
      // If checkout itself returns 401, the user isn't logged in — bounce to auth.
      if (/401/.test(message)) {
        window.location.href = `/auth?redirect=${encodeURIComponent("/dashboard?upgrade=pending")}`;
        return;
      }
      toast({ title: "Checkout failed", description: message, variant: "destructive" });
      setCheckoutLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Upgrade to GTM Champion Pro
          </DialogTitle>
          <DialogDescription>
            {trigger?.message
              ? trigger.message
              : "Unlock the full power of your Go-To-Market strategy."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {PRO_FEATURES.map((feature) => (
            <div key={feature} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                interval === "month"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setIntervalState("month")}
              data-testid="upgrade-interval-month"
            >
              Monthly
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-2 ${
                interval === "year"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setIntervalState("year")}
              data-testid="upgrade-interval-year"
            >
              Yearly
              {yearlySavings && (
                <Badge variant="secondary" className="text-[10px] py-0">
                  Save {yearlySavings}
                </Badge>
              )}
            </button>
          </div>

          <div className="text-center">
            {selectedPrice ? (
              <>
                <span className="text-4xl font-bold">
                  {formatPrice(selectedPrice.amount, selectedPrice.currency)}
                </span>
                <span className="text-muted-foreground ml-1">
                  / {selectedPrice.interval === "year" ? "year" : "month"}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground text-sm">Loading pricing…</span>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={checkoutLoading}>
            Maybe later
          </Button>
          <Button onClick={handleCheckout} disabled={checkoutLoading || !selectedPrice} data-testid="upgrade-checkout-button">
            {checkoutLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting…
              </>
            ) : (
              "Upgrade to Pro"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
