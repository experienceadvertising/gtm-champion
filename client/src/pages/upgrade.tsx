import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useLocation, useSearch, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Zap, 
  BarChart3, 
  Mail, 
  Bot, 
  Target,
  TrendingUp,
  Users,
  ArrowLeft,
  Loader2,
  Crown,
  Sparkles,
  Shield,
  Clock
} from "lucide-react";
import { getSession, getStripeProducts, createCheckoutSession, type StripeProduct } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const PREMIUM_FEATURES = [
  {
    icon: BarChart3,
    title: "All 13 Marketing Channels",
    description: "Get detailed strategies for SEO, Paid Search, Paid Social, Content, Email, ABM, Partnerships, and more."
  },
  {
    icon: Sparkles,
    title: "Unlimited AI Recommendations",
    description: "Receive personalized, actionable GTM recommendations tailored to your specific business and industry."
  },
  {
    icon: Mail,
    title: "Weekly Strategy Emails",
    description: "Every Monday, receive fresh content ideas and marketing tactics you can execute immediately."
  },
  {
    icon: Bot,
    title: "AI Assistant Chat",
    description: "Ask any marketing question and get personalized advice based on your company's context and goals."
  },
  {
    icon: Target,
    title: "Channel-Specific Insights",
    description: "Deep-dive into each channel with strategic pillars, quick wins, KPIs, and resources."
  },
  {
    icon: TrendingUp,
    title: "Competitor Intelligence",
    description: "See what your top competitors are doing on LinkedIn and SEO to stay ahead."
  },
  {
    icon: Users,
    title: "Priority Support",
    description: "Get faster responses and dedicated help when you need it most."
  },
  {
    icon: Shield,
    title: "Future Updates Included",
    description: "Access all new features and improvements as we continue to enhance the platform."
  }
];

export default function UpgradePage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);
  
  const urlParams = new URLSearchParams(searchString);
  const urlUserId = urlParams.get("userId");
  const session = getSession();
  const userId = urlUserId || session?.userId;

  useEffect(() => {
    if (!userId) {
      setLocation("/auth");
    }
  }, [userId, setLocation]);

  const { data: stripeProducts } = useQuery({
    queryKey: ["stripe-products"],
    queryFn: () => getStripeProducts(),
  });

  const handleCheckout = async (priceId: string) => {
    if (!userId) return;
    setIsCheckoutLoading(priceId);
    try {
      const { url } = await createCheckoutSession(userId, priceId);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setIsCheckoutLoading(null);
    }
  };

  const gtmProduct = stripeProducts?.data?.find(p => p.name === "GTM Champion Pro") || stripeProducts?.data?.[0];

  return (
    <>
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
      <title>Upgrade | GTM Champion</title>
    </Helmet>
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Link href={`/dashboard?userId=${userId}`}>
          <Button variant="ghost" className="mb-8" data-testid="button-back-dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Crown className="h-4 w-4" />
            <span className="font-semibold text-sm">GTM Champion Pro</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
            Unlock Your Full GTM Potential
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get unlimited access to all 13 marketing channels, AI-powered recommendations, 
            and weekly strategy insights to accelerate your growth.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {gtmProduct?.prices?.map((price) => {
            const isAnnual = price.recurring?.interval === 'year';
            const monthlyEquivalent = isAnnual 
              ? Math.round(price.unit_amount / 12 / 100) 
              : Math.round(price.unit_amount / 100);
            
            return (
              <Card 
                key={price.id}
                className={`relative overflow-hidden ${
                  isAnnual 
                    ? 'border-2 border-primary shadow-lg ring-4 ring-primary/10' 
                    : 'border-slate-200'
                }`}
              >
                {isAnnual && (
                  <div className="absolute top-0 right-0 bg-primary text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                    Save 17%
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="mb-6">
                    <h3 className="font-bold text-xl mb-2">
                      {isAnnual ? 'Annual Plan' : 'Monthly Plan'}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold">${monthlyEquivalent}</span>
                      <span className="text-muted-foreground text-lg">/month</span>
                    </div>
                    {isAnnual && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Billed ${price.unit_amount / 100}/year
                      </p>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>All 13 marketing channels</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Unlimited AI recommendations</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Weekly strategy emails</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>AI assistant chat</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Competitor intelligence</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                  
                  <Button 
                    className="w-full h-12 text-lg"
                    variant={isAnnual ? "default" : "outline"}
                    onClick={() => handleCheckout(price.id)}
                    disabled={isCheckoutLoading === price.id}
                    data-testid={`button-checkout-${isAnnual ? 'annual' : 'monthly'}`}
                  >
                    {isCheckoutLoading === price.id ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                    ) : (
                      <>Get {isAnnual ? 'Annual' : 'Monthly'} Plan</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Everything You Get with Pro</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PREMIUM_FEATURES.map((feature, idx) => (
              <Card key={idx} className="border-slate-100">
                <CardContent className="p-6">
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold">100% Money-Back Guarantee</span>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Try GTM Champion Pro risk-free. If you're not completely satisfied within the first 14 days, 
            we'll refund your payment - no questions asked.
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Secure checkout powered by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
    </>
  );
}
