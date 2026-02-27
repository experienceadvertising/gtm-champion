import { useState, useEffect } from "react";
import { useLocation, Link, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Lightbulb, 
  Mail, 
  Settings, 
  LogOut, 
  Zap, 
  ArrowUpRight, 
  TrendingUp,
  Users,
  Target,
  Lock,
  Loader2,
  RefreshCw,
  Search,
  Bot,
  Share2,
  FileText,
  MousePointerClick,
  MessageSquare,
  CreditCard,
  RotateCcw,
  Building2,
  Handshake,
  Send,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { fetchDashboard, retryAnalysis, getSession, clearSession, type DashboardData, type ChannelInsight } from "@/lib/api";
import { AIChat } from "@/components/AIChat";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Circle, Clock, BarChart3, Bookmark, ArrowRight, Sparkles } from "lucide-react";

// Channel definitions with icons
const CHANNELS = [
  { id: "all", label: "All Channels", icon: LayoutDashboard },
  { id: "divider1", label: "ORGANIC", divider: true },
  { id: "SEO", label: "SEO", icon: Search },
  { id: "LLMs", label: "LLMs / AEO", icon: Bot },
  { id: "Organic Social", label: "Organic Social", icon: Share2 },
  { id: "Content", label: "Content", icon: FileText },
  { id: "Email Marketing", label: "Email Marketing", icon: Mail },
  { id: "CRO", label: "CRO", icon: MousePointerClick },
  { id: "Community", label: "Community", icon: MessageSquare },
  { id: "divider2", label: "PAID", divider: true },
  { id: "Paid Social", label: "Paid Social", icon: CreditCard },
  { id: "Paid Search", label: "Paid Search", icon: Search },
  { id: "Retargeting", label: "Retargeting", icon: RotateCcw },
  { id: "ABM", label: "ABM", icon: Building2 },
  { id: "divider3", label: "GROWTH", divider: true },
  { id: "Partnerships", label: "Partnerships", icon: Handshake },
  { id: "Outbound", label: "Outbound", icon: Send },
] as const;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedChannel, setSelectedChannel] = useState<string>("all");

  // Get userId from URL or session
  const urlParams = new URLSearchParams(searchString);
  const urlUserId = urlParams.get("userId");
  const session = getSession();
  const userId = urlUserId || session?.userId;

  // Redirect to auth if no user
  useEffect(() => {
    if (!userId) {
      setLocation("/auth");
    }
  }, [userId, setLocation]);

  // Fetch dashboard data
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard", userId],
    queryFn: () => fetchDashboard(userId!),
    enabled: !!userId,
    refetchInterval: 10000, // Poll every 10 seconds while analysis might be in progress
  });


  // Handle manual refresh with feedback
  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Dashboard Refreshed",
        description: "Latest data loaded successfully.",
      });
    } catch (err) {
      toast({
        title: "Refresh Failed",
        description: "Could not refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Retry analysis mutation
  const retryMutation = useMutation({
    mutationFn: () => {
      if (!data?.company || !data?.user) throw new Error("Missing data");
      return retryAnalysis(
        data.company.id, 
        data.user.fullName, 
        data.user.email, 
        data.company.url
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
      toast({
        title: "Analysis Restarted",
        description: "Please wait while we analyze your website...",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle Stripe checkout
  const handleLogout = () => {
    clearSession();
    setLocation("/");
  };

  const SidebarItem = ({ icon: Icon, label, active = false, href = "#" }: { icon: any, label: string, active?: boolean, href?: string }) => (
    <Link href={href}>
      <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-slate-100 hover:text-slate-900'}`}>
        <Icon className="h-4 w-4" />
        {label}
      </button>
    </Link>
  );

  // Loading state
  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <h2 className="text-xl font-bold">Analyzing Your Website...</h2>
            <p className="text-muted-foreground mt-2">
              Our AI is scraping and analyzing your company. This may take 30-60 seconds.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state - might still be processing
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <RefreshCw className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Still Processing...</h2>
          <p className="text-muted-foreground">
            Your company analysis is still in progress. This typically takes 30-60 seconds.
          </p>
          <Button onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> {isFetching ? 'Checking...' : 'Check Again'}
          </Button>
        </div>
      </div>
    );
  }

  const { user, company, recommendations, weeklyIdeas, channelInsights = [] } = data;
  
  // Check if analysis is still in progress or failed
  const isAnalyzing = !company.name && company.summary === "Analyzing your website...";
  const analysisFailed = company.summary?.includes("couldn't analyze") || company.summary?.includes("temporarily unavailable");

  // Format date with fallback
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Pending";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Pending";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins === 0) return "Just now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  // Filter recommendations by selected channel
  const filteredRecommendations = selectedChannel === "all" 
    ? recommendations 
    : recommendations.filter(r => r.category === selectedChannel);

  // Count recommendations per channel
  const channelCounts = recommendations.reduce((acc, rec) => {
    acc[rec.category] = (acc[rec.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Channel Sidebar */}
      <aside className="w-64 border-r bg-slate-50/50 hidden md:flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 font-display font-bold text-xl text-primary">
            <Zap className="h-6 w-6 fill-current" />
            <span>GTM Champion</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {CHANNELS.map((channel) => {
              if ('divider' in channel && channel.divider) {
                return (
                  <div key={channel.id} className="pt-4 pb-2 px-3">
                    <span className="text-xs font-bold text-muted-foreground tracking-wider">{channel.label}</span>
                  </div>
                );
              }
              const Icon = (channel as { icon: typeof LayoutDashboard }).icon;
              const count = channel.id === "all" ? recommendations.length : (channelCounts[channel.id] || 0);
              const isActive = selectedChannel === channel.id;
              return (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : 'text-muted-foreground hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  data-testid={`channel-${channel.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{channel.label}</span>
                  </div>
                  {count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t space-y-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start text-xs" 
            onClick={() => setLocation("/integrations")}
            data-testid="button-integrations"
          >
            <Settings className="mr-2 h-3 w-3" /> Integrations
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start text-xs bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:bg-amber-100" 
            onClick={() => setLocation(`/content-tools?userId=${userId}`)}
            data-testid="button-content-tools"
          >
            <Sparkles className="mr-2 h-3 w-3 text-amber-600" /> Content Tools
          </Button>

          <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3 w-3 text-primary fill-primary" />
              <span className="font-bold text-xs text-primary">Free Plan</span>
            </div>
            <p className="text-xs text-muted-foreground">All features included</p>
          </div>
         
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border">
              <AvatarFallback className="text-xs">{user.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium truncate" data-testid="text-username">{user.fullName}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {selectedChannel === "all" ? (
          <>
            {/* Overview Dashboard */}
            <header className="h-16 border-b flex items-center justify-between px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
              <h1 className="font-display font-bold text-lg">Dashboard Overview</h1>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching} data-testid="button-refresh">
                  <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> {isFetching ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button size="sm" onClick={() => setLocation("/emails")}>
                  <Mail className="mr-2 h-4 w-4" /> View Emails
                </Button>
              </div>
            </header>

            <div className="p-8 max-w-7xl mx-auto space-y-8">
              {/* Company Snapshot */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className={`md:col-span-2 border-none shadow-sm ring-1 ${analysisFailed ? 'bg-gradient-to-br from-red-50 to-white ring-red-200' : 'bg-gradient-to-br from-white to-slate-50 ring-slate-200'}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold" data-testid="text-company-name">
                        {company.name || company.url || "Your Company"}
                      </CardTitle>
                      {isAnalyzing ? (
                        <Badge variant="secondary" className="font-medium bg-amber-100 text-amber-700">
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Analyzing...
                        </Badge>
                      ) : analysisFailed ? (
                        <Badge variant="secondary" className="font-medium bg-red-100 text-red-700">
                          Analysis Failed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-medium" data-testid="text-gtm-motion">
                          {company.gtmMotion || "Growth Marketing"}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-base mt-2" data-testid="text-company-summary">
                      {company.summary || "Your company analysis is being prepared..."}
                    </CardDescription>
                    {analysisFailed && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4 border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => retryMutation.mutate()}
                        disabled={retryMutation.isPending}
                        data-testid="button-retry-analysis"
                      >
                        {retryMutation.isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retrying...</>
                        ) : (
                          <><RefreshCw className="mr-2 h-4 w-4" /> Try Again</>
                        )}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                     <div className="flex gap-6 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Website Status</p>
                          {isAnalyzing ? (
                            <div className="flex items-center gap-2 text-amber-600 font-medium">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Processing
                            </div>
                          ) : analysisFailed ? (
                            <div className="flex items-center gap-2 text-red-600 font-medium">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              Error
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-green-600 font-medium">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              Analyzed
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Last Analyzed</p>
                          <p className="font-medium">{formatDate(company.lastScraped)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">ICP Match Score</p>
                          <p className="font-medium" data-testid="text-icp-score">{company.icpScore ?? "—"}/100</p>
                        </div>
                     </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                  <CardHeader>
                    <CardTitle className="text-lg opacity-90">Weekly Focus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold mb-2" data-testid="text-recommendation-count">
                      {recommendations.filter(r => r.impact === "High").length}
                    </div>
                    <p className="opacity-80 text-sm mb-4">High-impact tasks identified for this week.</p>
                    <Progress 
                      value={Math.round((recommendations.filter(r => r.status === "Completed").length / Math.max(recommendations.length, 1)) * 100)} 
                      className="h-2 bg-primary-foreground/20 [&>div]:bg-white" 
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Channel Overview Grid */}
              <div>
                <h2 className="text-xl font-bold font-display mb-6">Your Channel Strategy</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {CHANNELS.filter(c => !('divider' in c) && c.id !== 'all').map((channel) => {
                    const Icon = (channel as { icon: typeof LayoutDashboard }).icon;
                    const count = channelCounts[channel.id] || 0;
                    const hasRecs = count > 0;
                    return (
                      <motion.div
                        key={channel.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-all ${hasRecs ? 'hover:border-primary hover:shadow-md' : 'opacity-50'}`}
                          onClick={() => hasRecs && setSelectedChannel(channel.id)}
                          data-testid={`overview-channel-${channel.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${hasRecs ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{channel.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {count} {count === 1 ? 'strategy' : 'strategies'}
                                </p>
                              </div>
                              {hasRecs && <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

               {/* AI Chat Section */}
              <div>
                <h2 className="text-xl font-bold font-display mb-6">Ask AI Advisor</h2>
                <AIChat 
                  userId={userId!} 
                  companyName={company.name || 'Your Company'} 
                />
              </div>

              {/* Weekly Content Ideas */}
               <div className="grid lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2">
                   <h2 className="text-xl font-bold font-display mb-6">Weekly Content Sprints</h2>
                   <Card>
                     <CardContent className="p-0">
                       {weeklyIdeas.length === 0 ? (
                         <div className="p-8 text-center">
                           <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
                           <p className="text-muted-foreground text-sm">Generating content ideas...</p>
                         </div>
                       ) : (
                         weeklyIdeas.map((idea, idx) => (
                           <div key={idea.id}>
                              <div className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors" data-testid={`card-idea-${idea.id}`}>
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                                   <Lightbulb className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-semibold text-slate-900">{idea.title}</h4>
                                    <span className="text-xs text-muted-foreground">{formatDate(idea.createdAt)}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{idea.description}</p>
                                  <Badge variant="secondary" className="text-xs">{idea.type}</Badge>
                                </div>
                                <Button size="icon" variant="ghost">
                                  <ArrowUpRight className="h-4 w-4" />
                                </Button>
                              </div>
                              {idx < weeklyIdeas.length - 1 && <Separator />}
                           </div>
                         ))
                       )}
                     </CardContent>
                   </Card>
                 </div>

                 {/* Competitor Intel */}
                 <div>
                   <h2 className="text-xl font-bold font-display mb-6">Competitor Intel</h2>
                   <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
                     <CardContent className="p-6 text-center">
                       <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                         <TrendingUp className="h-6 w-6 text-primary" />
                       </div>
                       <h3 className="font-bold text-lg mb-2">Competitor Intel Coming Soon</h3>
                       <p className="text-sm text-muted-foreground">We're building tools to show what your top competitors are doing across LinkedIn, SEO, and more.</p>
                     </CardContent>
                   </Card>
                 </div>
               </div>
            </div>
          </>
        ) : (
          <>
            {/* Channel Detail Page */}
            {(() => {
              const channelInsight = channelInsights.find(ci => ci.channelId === selectedChannel);
              const channelData = CHANNELS.find(c => c.id === selectedChannel);
              const ChannelIcon = channelData && 'icon' in channelData ? channelData.icon : Target;
              
              return (
                <>
                  <header className="h-16 border-b flex items-center justify-between px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedChannel("all")}>
                        <ArrowUpRight className="mr-2 h-4 w-4 rotate-[225deg]" /> Back
                      </Button>
                      <Separator orientation="vertical" className="h-6" />
                      <h1 className="font-display font-bold text-lg">{channelData?.label || selectedChannel}</h1>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> {isFetching ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </header>

                  <div className="p-8 max-w-6xl mx-auto space-y-8">
                    {/* Hero Section */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent rounded-2xl p-8 border border-primary/10"
                    >
                      <div className="flex items-start gap-6">
                        <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-lg">
                          <ChannelIcon className="h-8 w-8" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold font-display">{channelData?.label || selectedChannel} Strategy</h1>
                            {channelInsight?.priority && (
                              <Badge className={`
                                ${channelInsight.priority === 'High' ? 'bg-green-100 text-green-700 border-green-200' : ''}
                                ${channelInsight.priority === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : ''}
                                ${channelInsight.priority === 'Low' ? 'bg-slate-100 text-slate-700 border-slate-200' : ''}
                              `}>
                                {channelInsight.priority} Priority
                              </Badge>
                            )}
                          </div>
                          <p className="text-lg text-muted-foreground mb-4">
                            {channelInsight 
                              ? `Personalized ${selectedChannel} strategy for ${company.name || 'your company'}`
                              : `${filteredRecommendations.length} tailored ${filteredRecommendations.length === 1 ? 'recommendation' : 'recommendations'} for ${company.name || 'your company'}`
                            }
                          </p>
                          {channelInsight?.whyItMatters && (
                            <div className="bg-white/60 rounded-lg p-4 border border-primary/10">
                              <h3 className="font-semibold text-sm text-primary mb-1">Why This Matters For You</h3>
                              <p className="text-slate-700">{channelInsight.whyItMatters}</p>
                            </div>
                          )}
                          {!channelInsight && filteredRecommendations.length > 0 && (
                            <div className="bg-amber-50/60 rounded-lg p-4 border border-amber-200/50">
                              <p className="text-sm text-amber-700">Deep insights for this channel will be available after your next analysis refresh.</p>
                            </div>
                          )}
                        </div>
                        {channelInsight?.heroStat && (
                          <div className="text-right bg-white rounded-xl p-4 shadow-sm border">
                            <div className="text-3xl font-bold text-primary">{channelInsight.heroStat.value}</div>
                            <div className="text-sm text-muted-foreground">{channelInsight.heroStat.label}</div>
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* KPI Strip */}
                    {channelInsight?.topKpis && channelInsight.topKpis.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          Key Metrics to Track
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {channelInsight.topKpis.map((kpi, idx) => (
                            <Card key={idx} className="bg-slate-50 border-slate-200">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-primary" />
                                  <span className="text-sm font-medium">{kpi}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Two Column Layout */}
                    <div className="grid lg:grid-cols-2 gap-8">
                      {/* Strategic Pillars */}
                      {channelInsight?.strategicPillars && channelInsight.strategicPillars.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Strategic Pillars
                          </h2>
                          <Accordion type="single" collapsible className="space-y-3">
                            {channelInsight.strategicPillars.map((pillar, idx) => (
                              <AccordionItem key={idx} value={`pillar-${idx}`} className="border rounded-lg bg-white shadow-sm">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                  <div className="flex items-center gap-3 text-left">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <p className="font-semibold">{pillar.title}</p>
                                      <p className="text-sm text-muted-foreground">{pillar.objective}</p>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                  <div className="pl-11 space-y-4">
                                    <div>
                                      <h4 className="font-medium text-sm text-slate-700 mb-2">Tactics</h4>
                                      <ul className="space-y-2">
                                        {pillar.tactics.map((tactic, tidx) => (
                                          <li key={tidx} className="flex items-start gap-2 text-sm text-slate-600">
                                            <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                            {tactic}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                      <h4 className="font-medium text-sm text-slate-700 mb-1">How to Measure</h4>
                                      <p className="text-sm text-slate-600">{pillar.measurement}</p>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </motion.div>
                      )}

                      {/* Quick Wins */}
                      {channelInsight?.quickWins && channelInsight.quickWins.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            Quick Wins
                          </h2>
                          <div className="space-y-4">
                            {channelInsight.quickWins.map((win, idx) => (
                              <Card key={idx} className="border-slate-200 hover:border-primary/30 transition-colors">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-semibold">{win.title}</h3>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {win.duration}
                                      </Badge>
                                      <Badge variant="outline" className={`text-xs ${win.effort === 'Low' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                        {win.effort} Effort
                                      </Badge>
                                    </div>
                                  </div>
                                  <ul className="space-y-2">
                                    {win.steps.map((step, sidx) => (
                                      <li key={sidx} className="flex items-start gap-2.5 text-sm text-slate-600">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                                        {step}
                                      </li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Resources */}
                    {channelInsight?.resources && channelInsight.resources.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <Bookmark className="h-5 w-5 text-primary" />
                          Recommended Resources & Tools
                        </h2>
                        <div className="flex flex-wrap gap-2">
                          {channelInsight.resources.map((resource, idx) => (
                            <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-sm">
                              {resource}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* AI Chat for Channel */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                    >
                      <AIChat 
                        userId={userId!} 
                        companyName={company.name || 'Your Company'}
                        channelId={selectedChannel}
                        variant="compact"
                      />
                    </motion.div>

                    {/* Channel Recommendations */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        Specific Strategies for {company.name || 'Your Company'}
                      </h2>
                      {filteredRecommendations.length === 0 ? (
                        <Card className="p-8 text-center bg-slate-50">
                          <p className="text-muted-foreground">No specific recommendations generated for this channel yet.</p>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          {filteredRecommendations.map((rec, idx) => (
                            <motion.div
                              key={rec.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 + idx * 0.1 }}
                            >
                              <Card className="border-slate-200 hover:shadow-md transition-shadow" data-testid={`card-recommendation-${rec.id}`}>
                                <CardHeader className="pb-2">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        {rec.status === "New" && <Badge className="bg-green-100 text-green-700 border-none text-xs">New</Badge>}
                                        {rec.status === "In Progress" && <Badge className="bg-blue-100 text-blue-700 border-none text-xs">In Progress</Badge>}
                                      </div>
                                      <CardTitle className="text-lg">{rec.title}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className={rec.impact === 'High' ? 'border-green-200 bg-green-50 text-green-700' : rec.impact === 'Medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}>
                                        {rec.impact} Impact
                                      </Badge>
                                      <Badge variant="outline" className={rec.effort === 'Low' ? 'border-green-200 bg-green-50 text-green-700' : rec.effort === 'Medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}>
                                        {rec.effort} Effort
                                      </Badge>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-muted-foreground leading-relaxed">
                                    {rec.description}
                                  </p>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>

                    {/* Company Fit Summary */}
                    {channelInsight?.companyFitSummary && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-gradient-to-r from-primary/5 to-transparent rounded-xl p-6 border border-primary/10"
                      >
                        <h3 className="font-semibold mb-2">How {selectedChannel} Fits Your GTM Strategy</h3>
                        <p className="text-slate-600">{channelInsight.companyFitSummary}</p>
                      </motion.div>
                    )}
                  </div>
                </>
              );
            })()}
          </>
        )}
      </main>

    </div>
  );
}
