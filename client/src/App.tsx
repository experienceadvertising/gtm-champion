import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import EmailPreview from "@/pages/email-preview";
import Integrations from "@/pages/integrations";
import Blog from "@/pages/blog";
import Article from "@/pages/article";
import UpgradePage from "@/pages/upgrade";
import ContentTools from "@/pages/content-tools";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/emails" component={EmailPreview} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={Article} />
        <Route path="/upgrade" component={UpgradePage} />
        <Route path="/content-tools" component={ContentTools} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
