import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, Link, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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
  Loader2,
  RefreshCw,
  Search,
  Bot,
  Share2,
  PenTool,
  MousePointerClick,
  MessageSquare,
  Megaphone,
  RotateCcw,
  Building2,
  Handshake,
  Phone,
  ChevronDown,
  Menu,
  DollarSign,
  Info,
  ChevronRight,
  MoreHorizontal,
  Shield,
  Download,
  UserPlus,
  Send,
  X,
  Sun,
  Moon,
  Filter,
  FileSpreadsheet,
  Keyboard,
  Undo2,
  CheckSquare,
  Square,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { fetchDashboard, retryAnalysis, updateRecommendationStatus, getSession, logout, createPortalSession, type DashboardData, type ChannelInsight } from "@/lib/api";
import { useSubscription } from "@/hooks/useSubscription";
import { AIChat } from "@/components/AIChat";
import { InteractiveTutorial, useTutorial } from "@/components/InteractiveTutorial";
import { PushPermissionPrompt, AgentPushOptIn } from "@/components/PushPermissionPrompt";
// Lazy-loaded: these views are only reached on demand and BudgetAllocator pulls
// in recharts, so deferring them keeps the initial dashboard chunk smaller.
const BudgetAllocator = lazy(() =>
  import("@/components/BudgetAllocator").then((m) => ({ default: m.BudgetAllocator })),
);
const ICPBuilder = lazy(() =>
  import("@/components/ICPBuilder").then((m) => ({ default: m.ICPBuilder })),
);
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Circle, Clock, BarChart3, Bookmark, ArrowRight, Sparkles, Gauge, AlertTriangle, Activity, FileText, Linkedin, MailOpen, Globe, Video, Mic, Volume2, VolumeX } from "lucide-react";
import { useAmbientMusic } from "@/hooks/use-ambient-music";
import { useTheme } from "@/components/ThemeProvider";
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from "@/hooks/use-keyboard-shortcuts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

const CHANNELS = [
  { id: "all", label: "All Channels", icon: LayoutDashboard, tooltip: "Overview of all marketing channels" },
  { id: "divider1", label: "ORGANIC", divider: true },
  { id: "SEO", label: "SEO", icon: Search, tooltip: "Search engine optimization — rank higher on Google for relevant keywords" },
  { id: "LLMs", label: "LLMs / AEO", icon: Bot, tooltip: "AI & Answer Engine Optimization — appear in ChatGPT, Perplexity, and AI search results" },
  { id: "Organic Social", label: "Organic Social", icon: Share2, tooltip: "Unpaid social media — LinkedIn, Twitter/X posts and engagement" },
  { id: "Content", label: "Content", icon: PenTool, tooltip: "Content marketing — blogs, guides, whitepapers, and thought leadership" },
  { id: "Email Marketing", label: "Email Marketing", icon: Mail, tooltip: "Email campaigns — newsletters, drip sequences, and nurture flows" },
  { id: "CRO", label: "CRO", icon: MousePointerClick, tooltip: "Conversion Rate Optimization — improve website and funnel performance" },
  { id: "Community", label: "Community", icon: MessageSquare, tooltip: "Community building — forums, Slack/Discord groups, user communities" },
  { id: "divider2", label: "PAID", divider: true },
  { id: "Paid Social", label: "Paid Social", icon: Megaphone, tooltip: "Paid social ads — LinkedIn Ads, Facebook/Instagram Ads, and promoted posts" },
  { id: "Paid Search", label: "Paid Search", icon: DollarSign, tooltip: "Paid search ads — Google Ads, Bing Ads, and PPC campaigns" },
  { id: "Retargeting", label: "Retargeting", icon: RotateCcw, tooltip: "Retargeting — re-engage website visitors across ad networks" },
  { id: "ABM", label: "ABM", icon: Building2, tooltip: "Account-Based Marketing — target and engage specific high-value accounts" },
  { id: "divider3", label: "GROWTH", divider: true },
  { id: "Partnerships", label: "Partnerships", icon: Handshake, tooltip: "Strategic partnerships — co-marketing, integrations, and affiliate programs" },
  { id: "Outbound", label: "Outbound", icon: Phone, tooltip: "Outbound sales — cold outreach, SDR sequences, and prospecting" },
] as const;

function formatStrategyDescription(desc: string, compact = false) {
  if (!desc) return null;

  const numberedPattern = /\b\d+\)\s+/;
  if (numberedPattern.test(desc)) {
    const items = desc.split(/\b\d+\)\s+/).filter(s => s.trim().length > 5);
    const introMatch = desc.match(/^([\s\S]*?)(?=\b\d+\)\s)/);
    const intro = introMatch?.[1]?.trim();
    return (
      <div>
        {intro && <p className="text-slate-500 mb-2">{intro}</p>}
        <ol className={`${compact ? 'space-y-1' : 'space-y-2'} list-none ml-0`}>
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 items-start text-slate-500">
              <span className={`${compact ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-xs'} rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 mt-0.5`}>{i + 1}</span>
              <span>{item.replace(/;\s*$/, '').trim()}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const labelPattern = /(?:ToFu|MoFu|BoFu|Cadence|Goal|KPIs?|Strategy|Tactics|Timeline|Metrics?|Budget|Channels?|Audience|Targeting|Outcome|Expected\s*Outcome|Results?|Steps?|Action|Next Steps?|Frequency|Format|Tools?):/i;
  if (labelPattern.test(desc)) {
    const parts = desc.split(new RegExp(`((?:ToFu|MoFu|BoFu|Cadence|Goal|KPIs?|Strategy|Tactics|Timeline|Metrics?|Budget|Channels?|Audience|Targeting|Expected\\s*Outcome|Outcome|Results?|Steps?|Action|Next Steps?|Frequency|Format|Tools?):)`, 'i')).filter(p => p.trim());
    const result: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (labelPattern.test(part) && part.length <= 20) {
        const content = parts[i + 1]?.trim().replace(/^[.]\s*/, '') || '';
        result.push(
          <div key={i} className={`${compact ? 'mt-2' : 'mt-3'} first:mt-0 ${compact ? '' : 'bg-slate-50/60 rounded-lg px-3 py-2'}`}>
            <span className={`font-semibold text-slate-700 ${compact ? 'text-[11px]' : 'text-xs'} uppercase tracking-wide block mb-0.5`}>{part}</span>
            <span className="text-slate-500">{content}</span>
          </div>
        );
        i++;
      } else {
        result.push(<p key={i} className="text-slate-500">{part}</p>);
      }
    }
    return <div>{result}</div>;
  }

  const sentences = desc.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim());
  if (sentences.length <= 2) return <p className="text-slate-500">{desc}</p>;
  return (
    <ul className={`${compact ? 'space-y-1.5' : 'space-y-2'} mt-1 list-none`}>
      {sentences.map((s, i) => (
        <li key={i} className="flex gap-2.5 items-start text-slate-500">
          <span className={`w-1.5 h-1.5 rounded-full bg-slate-300 ${compact ? 'mt-1.5' : 'mt-[7px]'} shrink-0`} />
          <span>{s.trim()}</span>
        </li>
      ))}
    </ul>
  );
}

function SlackConnectSection({
  slackConnected,
  onDisconnected,
}: {
  slackConnected: boolean;
  onDisconnected: () => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const { toast } = useToast();

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
      await fetch("/api/agent/slack", {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrfMatch ? csrfMatch[1] : "" },
        credentials: "include",
      });
      toast({ title: "Slack disconnected" });
      onDisconnected();
    } catch {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="rounded-lg border border-indigo-100 bg-white/70 p-3 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-[#4A154B] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.27 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.833 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.833 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.833 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.833zm0 1.27a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.833a2.528 2.528 0 0 1 2.522-2.521h6.311zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.833a2.528 2.528 0 0 1-2.523 2.521h-2.522V8.833zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.311zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.523v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Slack notifications</p>
            <p className="text-xs text-muted-foreground">
              {slackConnected ? "Connected — nudges sent to your Slack channel" : "Get nudges directly in Slack"}
            </p>
          </div>
        </div>
        {slackConnected ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleDisconnect}
            disabled={disconnecting}
            data-testid="btn-slack-disconnect"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </Button>
        ) : (
          <a
            href="/api/auth/slack"
            data-testid="btn-slack-connect"
            className="inline-flex items-center gap-2 px-3 h-8 rounded border border-[#ddd] bg-white hover:bg-slate-50 transition-colors text-[#1D1C1D] text-sm font-medium"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.27 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.833 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.833 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.833 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.833zm0 1.27a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.833a2.528 2.528 0 0 1 2.522-2.521h6.311zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.833a2.528 2.528 0 0 1-2.523 2.521h-2.522V8.833zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.311zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.523v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A"/>
              <path d="M8.833 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.833 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.833zm1.27 3.791a2.528 2.528 0 0 1 2.521-2.521 2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.833a2.528 2.528 0 0 1 2.522-2.521h6.311z" fill="#36C5F0"/>
            </svg>
            Add to Slack
          </a>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isPremium } = useSubscription();

  const handleManageSubscription = async () => {
    try {
      const { url } = await createPortalSession();
      window.location.assign(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open billing portal";
      toast({ title: "Could not open billing portal", description: message, variant: "destructive" });
    }
  };

  const handleOpenUpgrade = () => {
    window.dispatchEvent(new CustomEvent("premium-required", {
      detail: { message: "Unlock 10x higher AI limits, branded PDFs, unlimited re-analysis, and more." },
    }));
  };
  const params = new URLSearchParams(searchString);
  const channelParam = params.get("channel");
  const [selectedChannel, setSelectedChannel] = useState<string>(channelParam || "all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareName, setShareName] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareSending, setShareSending] = useState(false);
  const session = getSession();
  const { resetTutorial } = useTutorial(session?.userId);

  const mainRef = useRef<HTMLElement>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [impactFilter, setImpactFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState<boolean | null>(null);
  const [agentToggling, setAgentToggling] = useState(false);
  const [pushPromptTriggered, setPushPromptTriggered] = useState(false);
  const agentCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) {
      const currentPath = window.location.pathname + window.location.search;
      setLocation(`/auth?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [session, setLocation]);

  useEffect(() => {
    if (channelParam && channelParam !== selectedChannel) {
      setSelectedChannel(channelParam);
    }
  }, [channelParam]);

  useEffect(() => {
    const slackConnected = params.get("slack_connected");
    const slackError = params.get("slack_error");
    if (slackConnected === "1") {
      toast({ title: "Slack connected!", description: "A test message was sent to your channel. You'll now get nudges there." });
      queryClient.invalidateQueries({ queryKey: ["agentEvents"] });
      const clean = new URLSearchParams(searchString);
      clean.delete("slack_connected");
      const q = clean.toString();
      window.history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
    } else if (slackError) {
      const messages: Record<string, string> = {
        cancelled: "Slack authorization was cancelled.",
        invalid_state: "Authorization failed — please try again.",
        no_webhook: "Slack did not return a webhook. Make sure you select a channel.",
        not_configured: "Slack is not configured. Contact support.",
        server_error: "Something went wrong — please try again.",
      };
      toast({ title: "Slack connection failed", description: messages[slackError] ?? "Please try again.", variant: "destructive" });
      const clean = new URLSearchParams(searchString);
      clean.delete("slack_error");
      const q = clean.toString();
      window.history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [selectedChannel]);

  const { data: agentEventsData } = useQuery({
    queryKey: ["agentEvents"],
    queryFn: async () => {
      const res = await fetch("/api/agent/events", { credentials: "include" });
      if (!res.ok) return { events: [], nextCheckIn: null, slackConnected: false } as { events: Array<{ id: number; eventType: string; channelId: string | null; sentAt: string; channel: string }>; nextCheckIn: { dueAt: string; channelId: string; nudgeType: string } | null; slackConnected: boolean };
      return res.json() as Promise<{
        events: Array<{ id: number; eventType: string; channelId: string | null; sentAt: string; channel: string }>;
        nextCheckIn: { dueAt: string; channelId: string; nudgeType: string } | null;
        slackConnected: boolean;
      }>;
    },
    enabled: !!session && (isPremium || false),
    refetchInterval: false,
  });

  useEffect(() => {
    if (!isPremium) return;
    const el = agentCardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPushPromptTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isPremium, agentCardRef.current]);

  useEffect(() => {
    if (!isPremium) return;
    if ((agentEventsData?.events?.length ?? 0) > 0) {
      setPushPromptTriggered(true);
    }
  }, [isPremium, agentEventsData]);

  const handleAgentToggle = async (enabled: boolean) => {
    setAgentToggling(true);
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
      const csrfToken = csrfMatch ? csrfMatch[1] : "";
      const res = await fetch("/api/agent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        credentials: "include",
        body: JSON.stringify({ agentEnabled: enabled }),
      });
      if (!res.ok) throw new Error();
      setAgentEnabled(enabled);
      toast({ title: enabled ? "GTM Agent enabled" : "GTM Agent paused", description: enabled ? "You'll receive coaching nudges and weekly digests." : "You won't receive coaching emails until you re-enable the agent." });
    } catch {
      toast({ title: "Failed to update agent settings", variant: "destructive" });
    } finally {
      setAgentToggling(false);
    }
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
    enabled: !!session,
    retry: (failureCount, err) => {
      if (err instanceof Error && err.message === "SESSION_EXPIRED") return false;
      return failureCount < 3;
    },
    refetchInterval: (query) => {
      const d = query.state.data as DashboardData | undefined;
      if (!d) return 4000;
      const analyzing = !d.company.name && d.company.summary === "Analyzing your website...";
      if (analyzing) return 4000;
      const insightCount = d.channelInsights?.length || 0;
      const lastScraped = d.company.lastScraped ? new Date(d.company.lastScraped).getTime() : 0;
      const recentlyAnalyzed = (Date.now() - lastScraped) < 5 * 60 * 1000;
      if (insightCount < 13 && recentlyAnalyzed) return 4000;
      return false;
    },
  });


  useEffect(() => {
    if (data?.user?.agentEnabled !== undefined && agentEnabled === null) {
      setAgentEnabled(data.user.agentEnabled);
    }
  }, [data?.user?.agentEnabled]);

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
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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

  const statusMutation = useMutation({
    mutationFn: ({ id, status, previousStatus }: { id: number; status: string; previousStatus?: string }) => 
      updateRecommendationStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (variables.previousStatus) {
        toast({
          title: "Status updated",
          description: `Changed to "${variables.status}"`,
          action: (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                statusMutation.mutate({ id: variables.id, status: variables.previousStatus! });
              }}
              data-testid="button-undo-status"
            >
              <Undo2 className="mr-1 h-3 w-3" /> Undo
            </Button>
          ),
        });
      } else {
        toast({ title: "Status updated" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusChange = useCallback((id: number, newStatus: string, currentStatus?: string) => {
    statusMutation.mutate({ id, status: newStatus, previousStatus: currentStatus });
  }, [statusMutation]);

  const handleBulkStatusChange = useCallback(async (newStatus: string) => {
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map(id => updateRecommendationStatus(id, newStatus))
    );
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    setSelectedIds(new Set());
    setBulkMode(false);
    if (failed > 0) {
      toast({ title: `${succeeded} updated, ${failed} failed`, description: "Some items could not be updated.", variant: "destructive" });
    } else {
      toast({ title: `${succeeded} items updated to "${newStatus}"` });
    }
  }, [selectedIds, queryClient, toast]);

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const [icpEditing, setIcpEditing] = useState(false);
  const [icpForm, setIcpForm] = useState({ persona: '', companySize: '', industry: '', painPoints: '' });

  useEffect(() => {
    if (data?.company?.siteProfile?.icpDetails) {
      const icp = data.company.siteProfile.icpDetails;
      setIcpForm({
        persona: icp.persona || '',
        companySize: icp.companySize || '',
        industry: icp.industry || '',
        painPoints: icp.painPoints?.join(', ') || '',
      });
    }
  }, [data?.company?.siteProfile?.icpDetails]);

  const icpMutation = useMutation({
    mutationFn: async () => {
      if (!data?.company) throw new Error("Missing data");
      const res = await fetch(`/api/company/${data.company.id}/icp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          persona: icpForm.persona,
          companySize: icpForm.companySize,
          industry: icpForm.industry,
          painPoints: icpForm.painPoints.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("Failed to save ICP");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setIcpEditing(false);
      toast({ title: "ICP updated" });
    },
    onError: (error: any) => {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    setInviteSending(true);
    try {
      const res = await fetch("/api/invite-friend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toEmail: inviteEmail, toName: inviteName }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Invite sent!", description: `${inviteName || inviteEmail} will receive an email about GTM Champion` });
      setInviteDialogOpen(false);
      setInviteName("");
      setInviteEmail("");
    } catch {
      toast({ title: "Failed to send invite", description: "Please try again.", variant: "destructive" });
    } finally {
      setInviteSending(false);
    }
  };

  const handleShareStrategy = async () => {
    if (!shareEmail || !selectedChannel || selectedChannel === "all") return;
    setShareSending(true);
    try {
      const res = await fetch("/api/share-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toEmail: shareEmail, toName: shareName, channelId: selectedChannel }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Strategy shared!", description: `${shareName || shareEmail} will receive the ${selectedChannel} strategy` });
      setShareDialogOpen(false);
      setShareName("");
      setShareEmail("");
    } catch {
      toast({ title: "Failed to share strategy", description: "Please try again.", variant: "destructive" });
    } finally {
      setShareSending(false);
    }
  };

  const channelKeys = CHANNELS.filter(c => !('divider' in c) && c.id !== 'all');
  useKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onEscape: () => {
      setShortcutsOpen(false);
      setInviteDialogOpen(false);
      setShareDialogOpen(false);
      setBulkMode(false);
      setSelectedIds(new Set());
    },
    onHelp: () => setShortcutsOpen(prev => !prev),
    onChannelSelect: (index) => {
      if (index < channelKeys.length) {
        setSelectedChannel(channelKeys[index].id);
      }
    },
  });

  const handleDownloadCSV = async () => {
    try {
      const res = await fetch('/api/export/csv', { credentials: 'include' });
      if (!res.ok) {
        toast({ title: "Download failed", description: "Could not generate CSV", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] || 'recommendations.csv';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "CSV downloaded", description: "Your recommendations have been exported" });
    } catch {
      toast({ title: "Download failed", description: "Could not generate CSV. Please try again.", variant: "destructive" });
    }
  };

  const SidebarItem = ({ icon: Icon, label, active = false, href = "#" }: { icon: any, label: string, active?: boolean, href?: string }) => (
    <Link href={href}>
      <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-slate-100 hover:text-slate-900'}`}>
        <Icon className="h-4 w-4" />
        {label}
      </button>
    </Link>
  );

  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const analysisStages = [
    { label: "Scanning website...", icon: Search },
    { label: "Capturing screenshot...", icon: Search },
    { label: "Analyzing with AI...", icon: Bot },
    { label: "Generating strategies...", icon: Sparkles },
  ];

  const shouldAnimate = isLoading || !data || (!data.company.name && data.company.summary === "Analyzing your website...");
  const { stop: stopMusic, isPlaying: isMusicPlaying, isMuted: isMusicMuted, toggleMute: toggleMusic } = useAmbientMusic(shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate && isMusicPlaying) {
      stopMusic();
    }
  }, [shouldAnimate, isMusicPlaying, stopMusic]);

  useEffect(() => {
    if (!shouldAnimate) {
      setAnalysisProgress(0);
      setAnalysisStep(0);
      return;
    }
    const stepInterval = setInterval(() => {
      setAnalysisStep(prev => Math.min(prev + 1, analysisStages.length - 1));
    }, 6000);
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 95) return 95;
        const increment = prev < 30 ? 4 : prev < 55 ? 2.5 : prev < 75 ? 1.5 : prev < 85 ? 0.8 : prev < 92 ? 0.3 : 0.1;
        return Math.min(prev + increment, 95);
      });
    }, 1000);
    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [shouldAnimate]);

  if (error) {
    if (error.message === "SESSION_EXPIRED") {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-md w-full px-6"
        >
          <div className="relative mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display">Still Processing...</h2>
            <p className="text-muted-foreground mt-2">
              Your analysis is taking longer than usual. Please check again shortly.
            </p>
          </div>
          <Button onClick={() => window.location.reload()} data-testid="button-check-again">
            <RefreshCw className="mr-2 h-4 w-4" />
            Check Again
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (isLoading || !data) {
    return (
      <div className="h-screen bg-background flex overflow-hidden" role="status" aria-label="Loading dashboard">
        <aside className="w-64 border-r border-slate-200/60 hidden md:flex flex-col p-4 space-y-4">
          <div className="flex items-center gap-2.5 mb-4">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="space-y-2 mt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <div className="h-14 border-b border-slate-200/60 flex items-center px-8">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-6 w-40 mb-6" />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            </div>
            <div>
              <Skeleton className="h-6 w-36 mb-6" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </main>
        <span className="sr-only">Loading your dashboard data...</span>
      </div>
    );
  }

  const { user, company, recommendations = [], weeklyIdeas = [], channelInsights = [] } = data;
  
  const isAnalyzingRaw = !company.name && company.summary === "Analyzing your website...";
  const analysisStaleMinutes = 10;
  const lastScrapedTime = company.lastScraped ? new Date(company.lastScraped).getTime() : 0;
  const minutesSinceLastScrape = (Date.now() - lastScrapedTime) / 60000;
  const isAnalysisStuck = isAnalyzingRaw && minutesSinceLastScrape > analysisStaleMinutes;
  const isAnalyzing = isAnalyzingRaw && !isAnalysisStuck;
  const analysisFailed = isAnalysisStuck || company.summary?.includes("couldn't analyze") || company.summary?.includes("temporarily unavailable");
  const recentlyAnalyzedForInsights = lastScrapedTime > 0 && (Date.now() - lastScrapedTime) < 5 * 60 * 1000;
  const isChannelInsightsLoading = !isAnalyzing && !analysisFailed && channelInsights.length < 13 && recentlyAnalyzedForInsights;

  if (isAnalyzing) {
    const estimatedRemaining = Math.max(Math.round(30 - (analysisProgress * 0.35)), 5);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-8 max-w-md w-full px-6"
        >
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display">Building Your GTM Strategy</h2>
            <p className="text-muted-foreground mt-2">
              Our AI is analyzing your website and generating personalized strategies across 13 channels. This typically takes 20-30 seconds.
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Progress value={analysisProgress} className="h-2.5 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500 [&>div]:transition-all [&>div]:duration-1000" />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">{Math.round(analysisProgress)}%</span>
                <span className="text-xs text-muted-foreground">{analysisProgress >= 85 ? 'Almost done...' : `~${estimatedRemaining}s remaining`}</span>
              </div>
            </div>

            <div className="space-y-2">
              {analysisStages.map((stage, idx) => {
                const StageIcon = stage.icon;
                const isActive = idx === analysisStep;
                const isCompleted = idx < analysisStep;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                      isActive ? 'bg-primary/10 text-primary font-medium' : isCompleted ? 'text-green-600' : 'text-muted-foreground/50'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span>{stage.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMusic}
              className="gap-2 text-xs text-muted-foreground hover:text-primary"
              data-testid="button-toggle-music-2"
            >
              {isMusicMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              {isMusicMuted ? "Turn on music" : "Mute music"}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannel(channelId);
    setMobileMenuOpen(false);
  };

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

  const channelEntries = CHANNELS.filter(c => !('divider' in c) && c.id !== 'all') as Array<{ id: string; label: string }>;
  const normalizeCategory = (category: string): string => {
    const lower = category.toLowerCase().trim();
    for (const ch of channelEntries) {
      if (ch.id.toLowerCase() === lower) return ch.id;
      if (ch.label.toLowerCase() === lower) return ch.id;
    }
    if (lower.includes("llm") || lower.includes("aeo")) return "LLMs";
    if (lower.includes("paid social")) return "Paid Social";
    if (lower.includes("paid search") || lower.includes("ppc")) return "Paid Search";
    if (lower.includes("outbound")) return "Outbound";
    return category;
  };

  const normalizedRecommendations = recommendations.map(r => ({
    ...r,
    category: normalizeCategory(r.category),
  }));

  const handleDownloadChannelCSV = (channelId: string) => {
    const channelData = CHANNELS.find(c => c.id === channelId);
    const channelLabel = channelData?.label || channelId;
    const insight = channelInsights.find(ci => ci.channelId === channelId);
    const recs = normalizedRecommendations.filter(r => r.category === channelId);

    const escapeCSV = (val: string) => {
      if (!val) return '';
      let safe = val;
      if (/^[=+\-@\t\r]/.test(safe)) safe = "'" + safe;
      if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) return `"${safe.replace(/"/g, '""')}"`;
      return safe;
    };

    const lines: string[] = [];
    lines.push(`${channelLabel} Strategy`);
    lines.push('');
    if (insight) {
      lines.push(`Priority,${escapeCSV(insight.priority)}`);
      if (insight.heroStat) lines.push(`Key Stat,${escapeCSV(insight.heroStat.value)} - ${escapeCSV(insight.heroStat.label)}`);
      if (insight.whyItMatters) lines.push(`Why It Matters,${escapeCSV(insight.whyItMatters)}`);
      lines.push('');
      if (insight.topKpis?.length) {
        lines.push('Key Metrics to Track');
        insight.topKpis.forEach(kpi => lines.push(`,${escapeCSV(kpi)}`));
        lines.push('');
      }
      if (insight.strategicPillars?.length) {
        lines.push('Strategic Pillars');
        lines.push('Title,Objective,Tactics,Measurement');
        insight.strategicPillars.forEach(p => {
          lines.push([escapeCSV(p.title), escapeCSV(p.objective), escapeCSV(p.tactics.join('; ')), escapeCSV(p.measurement)].join(','));
        });
        lines.push('');
      }
      if (insight.quickWins?.length) {
        lines.push('Quick Wins');
        lines.push('Title,Steps,Effort,Duration');
        insight.quickWins.forEach(w => {
          lines.push([escapeCSV(w.title), escapeCSV(w.steps.join('; ')), escapeCSV(w.effort), escapeCSV(w.duration)].join(','));
        });
        lines.push('');
      }
      if (insight.resources?.length) {
        lines.push('Recommended Resources & Tools');
        insight.resources.forEach(r => lines.push(`,${escapeCSV(r)}`));
        lines.push('');
      }
    }
    if (recs.length) {
      lines.push('Specific Strategies');
      lines.push('Title,Description,Impact,Effort,Status');
      recs.forEach(r => {
        lines.push([escapeCSV(r.title), escapeCSV(r.description), escapeCSV(r.impact), escapeCSV(r.effort), escapeCSV(r.status)].join(','));
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${channelLabel.replace(/[^a-zA-Z0-9]/g, '_')}_strategy.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "CSV downloaded", description: `${channelLabel} strategy exported` });
  };

  const handleDownloadChannelPDF = (channelId: string) => {
    const channelData = CHANNELS.find(c => c.id === channelId);
    const channelLabel = channelData?.label || channelId;
    const insight = channelInsights.find(ci => ci.channelId === channelId);
    const recs = normalizedRecommendations.filter(r => r.category === channelId);
    const companyName = company?.name || 'Your Company';

    let html = `<!DOCTYPE html><html><head><title>${channelLabel} Strategy - ${companyName}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 30px; color: #1e293b; line-height: 1.6; }
      h1 { color: #6d28d9; margin-bottom: 4px; }
      h2 { color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 28px; }
      h3 { color: #475569; margin-bottom: 4px; }
      .subtitle { color: #64748b; margin-bottom: 20px; }
      .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
      .high { background: #dcfce7; color: #15803d; } .medium { background: #fef9c3; color: #a16207; } .low { background: #f1f5f9; color: #475569; }
      .callout { background: #f5f3ff; border-left: 3px solid #6d28d9; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 12px 0; }
      .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; display: inline-block; margin-right: 12px; }
      .stat-value { font-size: 22px; font-weight: 700; color: #6d28d9; }
      .stat-label { font-size: 12px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th { background: #f8fafc; text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; }
      td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; }
      ul { padding-left: 20px; } li { margin-bottom: 4px; }
      .pillar { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
      .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      @media print { body { padding: 20px; } }
    </style></head><body>`;

    html += `<h1>${channelLabel} Strategy</h1>`;
    html += `<p class="subtitle">Personalized ${channelLabel} strategy for ${companyName}</p>`;

    if (insight) {
      if (insight.priority) html += `<p><span class="badge ${insight.priority.toLowerCase()}">${insight.priority} Priority</span></p>`;
      if (insight.heroStat) html += `<div class="stat-box"><div class="stat-value">${insight.heroStat.value}</div><div class="stat-label">${insight.heroStat.label}</div></div>`;
      if (insight.whyItMatters) html += `<div class="callout"><strong>Why This Matters For You</strong><br>${insight.whyItMatters}</div>`;

      if (insight.topKpis?.length) {
        html += `<h2>Key Metrics to Track</h2><ul>`;
        insight.topKpis.forEach(kpi => { html += `<li>${kpi}</li>`; });
        html += `</ul>`;
      }

      if (insight.strategicPillars?.length) {
        html += `<h2>Strategic Pillars</h2>`;
        insight.strategicPillars.forEach((p, i) => {
          html += `<div class="pillar"><h3>${i + 1}. ${p.title}</h3><p><em>${p.objective}</em></p><ul>`;
          p.tactics.forEach(t => { html += `<li>${t}</li>`; });
          html += `</ul><p><strong>How to Measure:</strong> ${p.measurement}</p></div>`;
        });
      }

      if (insight.quickWins?.length) {
        html += `<h2>Quick Wins</h2>`;
        insight.quickWins.forEach(w => {
          html += `<div class="pillar"><h3>${w.title} <span class="badge low">${w.effort} Effort · ${w.duration}</span></h3><ul>`;
          w.steps.forEach(s => { html += `<li>${s}</li>`; });
          html += `</ul></div>`;
        });
      }

      if (insight.resources?.length) {
        html += `<h2>Recommended Resources & Tools</h2><ul>`;
        insight.resources.forEach(r => { html += `<li>${r}</li>`; });
        html += `</ul>`;
      }
    }

    if (recs.length) {
      html += `<h2>Specific Strategies</h2><table><tr><th>Title</th><th>Impact</th><th>Effort</th><th>Status</th></tr>`;
      recs.forEach(r => {
        html += `<tr><td><strong>${r.title}</strong><br><span style="color:#64748b;font-size:12px">${r.description}</span></td><td><span class="badge ${r.impact.toLowerCase()}">${r.impact}</span></td><td>${r.effort}</td><td>${r.status}</td></tr>`;
      });
      html += `</table>`;
    }

    html += `<div class="footer">Generated by GTM Champion · ${new Date().toLocaleDateString()}</div></body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.print(); };
    }
    toast({ title: "PDF ready", description: `Print dialog opened for ${channelLabel} strategy` });
  };

  const filteredRecommendations = selectedChannel === "all" 
    ? normalizedRecommendations 
    : normalizedRecommendations.filter(r => r.category === selectedChannel);

  const channelCounts = normalizedRecommendations.reduce((acc, rec) => {
    acc[rec.category] = (acc[rec.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const channelHasContent = channelInsights.reduce((acc, ci) => {
    acc[ci.channelId] = true;
    return acc;
  }, {} as Record<string, boolean>);

  const highImpactRecs = normalizedRecommendations.filter(r => r.impact === "High");
  const totalRecs = highImpactRecs.length;
  const completedRecs = highImpactRecs.filter(r => r.status === "Completed").length;
  const inProgressRecs = highImpactRecs.filter(r => r.status === "In Progress").length;
  const completionPercent = Math.round((completedRecs / Math.max(totalRecs, 1)) * 100);

  const channelColorMap: Record<string, string> = {
    "SEO": "from-blue-500/10 to-blue-600/5 hover:border-blue-400",
    "LLMs": "from-violet-500/10 to-violet-600/5 hover:border-violet-400",
    "Organic Social": "from-sky-500/10 to-sky-600/5 hover:border-sky-400",
    "Content": "from-emerald-500/10 to-emerald-600/5 hover:border-emerald-400",
    "Email Marketing": "from-rose-500/10 to-rose-600/5 hover:border-rose-400",
    "CRO": "from-orange-500/10 to-orange-600/5 hover:border-orange-400",
    "Community": "from-teal-500/10 to-teal-600/5 hover:border-teal-400",
    "Paid Social": "from-pink-500/10 to-pink-600/5 hover:border-pink-400",
    "Paid Search": "from-amber-500/10 to-amber-600/5 hover:border-amber-400",
    "Retargeting": "from-cyan-500/10 to-cyan-600/5 hover:border-cyan-400",
    "ABM": "from-indigo-500/10 to-indigo-600/5 hover:border-indigo-400",
    "Partnerships": "from-lime-500/10 to-lime-600/5 hover:border-lime-400",
    "Outbound": "from-fuchsia-500/10 to-fuchsia-600/5 hover:border-fuchsia-400",
  };

  const channelIconColorMap: Record<string, string> = {
    "SEO": "bg-blue-100 text-blue-600",
    "LLMs": "bg-violet-100 text-violet-600",
    "Organic Social": "bg-sky-100 text-sky-600",
    "Content": "bg-emerald-100 text-emerald-600",
    "Email Marketing": "bg-rose-100 text-rose-600",
    "CRO": "bg-orange-100 text-orange-600",
    "Community": "bg-teal-100 text-teal-600",
    "Paid Social": "bg-pink-100 text-pink-600",
    "Paid Search": "bg-amber-100 text-amber-600",
    "Retargeting": "bg-cyan-100 text-cyan-600",
    "ABM": "bg-indigo-100 text-indigo-600",
    "Partnerships": "bg-lime-100 text-lime-600",
    "Outbound": "bg-fuchsia-100 text-fuchsia-600",
  };

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-slate-200/60">
        <div className="rounded-xl bg-gradient-to-br from-primary/12 via-primary/8 to-violet-500/5 border border-primary/15 p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.12em]">Progress</span>
            <Badge variant="secondary" className="text-[10px] px-2 py-0 h-[18px] bg-primary/15 text-primary border-0 font-bold">
              {completionPercent}%
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/60 rounded-lg py-1.5">
              <div className="text-lg font-bold text-foreground">{totalRecs}</div>
              <div className="text-[10px] text-muted-foreground font-medium">Total</div>
            </div>
            <div className="bg-white/60 rounded-lg py-1.5">
              <div className="text-lg font-bold text-blue-600">{inProgressRecs}</div>
              <div className="text-[10px] text-muted-foreground font-medium">Active</div>
            </div>
            <div className="bg-white/60 rounded-lg py-1.5">
              <div className="text-lg font-bold text-green-600">{completedRecs}</div>
              <div className="text-[10px] text-muted-foreground font-medium">Done</div>
            </div>
          </div>
          <Progress 
            value={completionPercent} 
            className="h-1.5 mt-3 bg-primary/10 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500 [&>div]:transition-all [&>div]:duration-700" 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3" data-tour="sidebar-channels">
        <div className="space-y-0.5">
          {CHANNELS.map((channel) => {
            if ('divider' in channel && channel.divider) {
              return (
                <div key={channel.id} className="pt-5 pb-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground/60 tracking-[0.15em] uppercase">{channel.label}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-slate-200/80 to-transparent" />
                  </div>
                </div>
              );
            }
            const Icon = (channel as { icon: typeof LayoutDashboard }).icon;
            const tooltipText = 'tooltip' in channel ? (channel as any).tooltip : '';
            const hasInsight = channel.id !== "all" && channelHasContent[channel.id];
            const isActive = selectedChannel === channel.id;
            return (
              <Tooltip key={channel.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleChannelSelect(channel.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      isActive 
                        ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm' 
                        : 'text-muted-foreground hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                    data-testid={`channel-${channel.id}`}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={`${channel.label}${channel.id !== 'all' ? ` channel` : ''}`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                    )}
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                      <span>{channel.label}</span>
                    </div>
                    {channel.id === "all" ? (
                      <span className={`text-[10px] font-semibold min-w-[20px] text-center px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-primary/20 text-primary' : 'bg-slate-200/80 text-slate-500'
                      }`}>
                        13
                      </span>
                    ) : (() => {
                      const channelRecs = normalizedRecommendations.filter(r => r.category === channel.id);
                      const newCount = channelRecs.filter(r => r.status === "New").length;
                      const totalCount = channelRecs.length;
                      const hasInteracted = totalCount > 0 && newCount < totalCount;
                      return hasInteracted && newCount > 0 ? (
                        <span className="text-[10px] font-bold min-w-[18px] text-center px-1.5 py-0.5 rounded-full bg-red-500 text-white" aria-label={`${newCount} new`}>
                          {newCount}
                        </span>
                      ) : hasInsight ? (
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary' : 'bg-emerald-400'}`} />
                      ) : isChannelInsightsLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/60" aria-label="Loading strategy" />
                      ) : null;
                    })()}
                  </button>
                </TooltipTrigger>
                {tooltipText && (
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">{tooltipText}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200/60 space-y-2.5">

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start text-xs bg-gradient-to-r from-amber-50/80 to-orange-50/60 border-amber-200/80 hover:border-amber-300 hover:from-amber-50 hover:to-orange-50 transition-all" 
          onClick={() => { setMobileMenuOpen(false); setLocation("/content-tools"); }}
          data-testid="button-content-tools"
          data-tour="content-tools"
        >
          <Sparkles className="mr-2 h-3 w-3 text-amber-600" /> Content Tools
        </Button>
        <Button
          variant={selectedChannel === "budget-allocator" ? "default" : "outline"}
          size="sm"
          className={`w-full justify-start text-xs ${selectedChannel === "budget-allocator" ? "" : "bg-gradient-to-r from-green-50/80 to-emerald-50/60 border-green-200/80 hover:border-green-300 hover:from-green-50 hover:to-emerald-50"} transition-all`}
          onClick={() => { setMobileMenuOpen(false); setSelectedChannel("budget-allocator"); }}
          data-testid="button-budget-allocator"
        >
          <DollarSign className="mr-2 h-3 w-3 text-green-600" /> Budget Allocator
        </Button>
        <Button
          variant={selectedChannel === "icp-builder" ? "default" : "outline"}
          size="sm"
          className={`w-full justify-start text-xs ${selectedChannel === "icp-builder" ? "" : "bg-gradient-to-r from-indigo-50/80 to-violet-50/60 border-indigo-200/80 hover:border-indigo-300 hover:from-indigo-50 hover:to-violet-50"} transition-all`}
          onClick={() => { setMobileMenuOpen(false); setSelectedChannel("icp-builder"); }}
          data-testid="button-icp-builder"
        >
          <Users className="mr-2 h-3 w-3 text-indigo-600" /> ICP Builder
        </Button>

        <div className="bg-gradient-to-br from-primary/8 to-violet-500/5 border border-primary/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-3 w-3 text-primary fill-primary" />
            <span className="font-bold text-xs text-primary">Free Plan</span>
          </div>
          <p className="text-[11px] text-muted-foreground">All features included</p>
        </div>
       
        <div className="flex items-center gap-2.5 pt-1">
          <Avatar className="h-8 w-8 border border-slate-200/80 shadow-sm ring-1 ring-slate-100">
            <AvatarFallback className="text-xs bg-gradient-to-br from-primary/10 to-violet-500/10 text-primary font-semibold">{(user?.fullName || '?').split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium truncate" data-testid="text-username">{user?.fullName || 'User'}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={handleLogout} data-testid="button-logout" aria-label="Log out">
            <LogOut className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
    <div className="h-screen bg-background flex overflow-hidden">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 font-display font-bold text-xl text-primary">
              <Zap className="h-6 w-6 fill-current" />
              <span>GTM Champion</span>
            </div>
          </div>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      <aside className="w-64 border-r border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 hidden md:flex flex-col shadow-[1px_0_8px_-3px_rgba(0,0,0,0.05)]" role="navigation" aria-label="Channel navigation">
        <div className="p-4 border-b border-slate-200/60">
          <div className="flex items-center gap-2.5 font-display font-bold text-xl text-primary">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-primary/10">
              <Zap className="h-4.5 w-4.5 fill-current text-white" />
            </div>
            <span className="tracking-tight">GTM Champion</span>
          </div>
        </div>
        {sidebarContent}
      </aside>

      <InteractiveTutorial userId={session?.userId} />

      <main ref={mainRef} className="flex-1 overflow-y-auto">
        {selectedChannel === "budget-allocator" ? (
          <div className="p-4 md:p-8 space-y-6">
            <header className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedChannel("all")} data-testid="button-back-dashboard">
                ← Back
              </Button>
            </header>
            <Suspense fallback={<div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading" /></div>}>
              <BudgetAllocator />
            </Suspense>
          </div>
        ) : selectedChannel === "icp-builder" ? (
          <div className="p-4 md:p-8 space-y-6">
            <header className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedChannel("all")} data-testid="button-back-dashboard">
                ← Back
              </Button>
            </header>
            <Suspense fallback={<div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading" /></div>}>
              <ICPBuilder />
            </Suspense>
          </div>
        ) : selectedChannel === "all" ? (
          <>
            <header className="h-14 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04)]" role="banner">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setMobileMenuOpen(true)} data-testid="button-mobile-menu" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
                <h1 className="font-display font-bold text-lg tracking-tight">Dashboard Overview</h1>
                {(() => {
                  const newCount = normalizedRecommendations.filter(r => r.status === "New").length;
                  const totalCount = normalizedRecommendations.length;
                  const hasInteracted = totalCount > 0 && newCount < totalCount;
                  return hasInteracted && newCount > 0 ? (
                    <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 h-5 hover:bg-red-600" data-testid="badge-new-count">
                      {newCount} new
                    </Badge>
                  ) : null;
                })()}
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                      data-testid="button-theme-toggle"
                      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
                    >
                      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShortcutsOpen(true)} data-testid="button-shortcuts" aria-label="Keyboard shortcuts">
                      <Keyboard className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Keyboard shortcuts (?)</p></TooltipContent>
                </Tooltip>
                <div className="hidden md:flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={resetTutorial} data-testid="button-take-tour">
                    <Info className="mr-1.5 h-3.5 w-3.5" /> Take Tour
                  </Button>
                  <Button variant="outline" size="sm" data-testid="button-download-pdf" onClick={async () => {
                    try {
                      const res = await fetch('/api/export/pdf', { credentials: 'include' });
                      if (!res.ok) { toast({ title: "Download failed", variant: "destructive" }); return; }
                      const blob = await res.blob();
                      const disposition = res.headers.get('content-disposition') || '';
                      const match = disposition.match(/filename="(.+)"/);
                      const filename = match?.[1] || 'gtm_strategy.pdf';
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = filename;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast({ title: "PDF downloaded" });
                    } catch { toast({ title: "Download failed", variant: "destructive" }); }
                  }}>
                    <Download className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <Button variant="outline" size="sm" data-testid="button-download-csv" onClick={handleDownloadCSV}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" data-testid="button-tell-friend" onClick={() => setInviteDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Tell a Friend
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-reanalyze" data-tour="reanalyze">
                        <RefreshCw className={`mr-2 h-4 w-4 ${retryMutation.isPending ? 'animate-spin' : ''}`} /> 
                        {retryMutation.isPending ? 'Analyzing...' : 'Re-analyze'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Re-analyze your website?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will re-crawl your website and generate fresh AI recommendations. The process takes 30-60 seconds. Your existing recommendations will be replaced with updated ones.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => retryMutation.mutate()}>Re-analyze</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {isPremium ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleManageSubscription}
                      data-testid="button-manage-subscription"
                    >
                      <Sparkles className="mr-2 h-4 w-4 text-primary" /> Pro · Manage
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleOpenUpgrade}
                      data-testid="button-upgrade-to-pro"
                      className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md hover:from-indigo-600 hover:to-violet-700"
                    >
                      <Sparkles className="mr-2 h-4 w-4" /> Upgrade to Pro
                    </Button>
                  )}
                  {(user as any).isAdmin && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setLocation("/admin")} data-testid="button-admin-panel">
                        <Shield className="mr-2 h-4 w-4" /> Admin
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setLocation("/emails")} data-testid="button-view-emails">
                        <Mail className="mr-2 h-4 w-4" /> View Emails
                      </Button>
                    </>
                  )}
                </div>
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8" data-testid="button-mobile-actions" aria-label="More actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={resetTutorial}><Info className="mr-2 h-4 w-4" /> Take Tour</DropdownMenuItem>
                      <DropdownMenuItem onClick={async () => {
                        const res = await fetch('/api/export/pdf', { credentials: 'include' });
                        if (res.ok) { const b = await res.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'strategy.pdf'; a.click(); URL.revokeObjectURL(u); }
                      }}><Download className="mr-2 h-4 w-4" /> Download PDF</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Tell a Friend</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => retryMutation.mutate()}><RefreshCw className="mr-2 h-4 w-4" /> Re-analyze</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
              <PushPermissionPrompt triggered={pushPromptTriggered} />
              <div className="grid md:grid-cols-3 gap-6">
                <Card className={`md:col-span-2 border-none shadow-lg overflow-hidden ${analysisFailed ? 'ring-1 ring-red-200' : 'ring-1 ring-slate-200/50'}`}>
                  <div className={`h-2 w-full ${analysisFailed ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-primary via-violet-500 to-purple-500'}`} />
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-md ${analysisFailed ? 'bg-red-100' : 'bg-gradient-to-br from-primary/15 to-violet-500/10'}`}>
                          <Building2 className={`h-5 w-5 ${analysisFailed ? 'text-red-600' : 'text-primary'}`} />
                        </div>
                        <CardTitle className="text-xl font-bold font-display tracking-tight" data-testid="text-company-name">
                          {company.name || company.url || "Your Company"}
                        </CardTitle>
                      </div>
                      {isAnalyzing ? (
                        <Badge variant="secondary" className="font-medium bg-amber-100 text-amber-700">
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Analyzing...
                        </Badge>
                      ) : analysisFailed ? (
                        <Badge variant="secondary" className="font-medium bg-red-100 text-red-700">
                          Analysis Failed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-medium bg-primary/10 text-primary border-primary/20" data-testid="text-gtm-motion">
                          {company.gtmMotion || "Growth Marketing"}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-base mt-3 leading-relaxed" data-testid="text-company-summary">
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
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-100">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shadow-sm ${isAnalyzing ? 'bg-amber-100' : analysisFailed ? 'bg-red-100' : 'bg-green-100'}`}>
                          {isAnalyzing ? (
                            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                          ) : analysisFailed ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Status</p>
                          <p className={`font-semibold text-sm ${isAnalyzing ? 'text-amber-600' : analysisFailed ? 'text-red-600' : 'text-green-600'}`}>
                            {isAnalyzing ? 'Processing' : analysisFailed ? 'Error' : 'Analyzed'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-100">
                        <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shadow-sm">
                          <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Last Analyzed</p>
                          <p className="font-semibold text-sm">{formatDate(company.lastScraped)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-100">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shadow-sm">
                          <Target className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ICP Score</p>
                          <p className="font-semibold text-sm" data-testid="text-icp-score">{company.icpScore ?? "—"}/100</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="border-none shadow-lg bg-gradient-to-br from-primary via-primary to-violet-600 text-primary-foreground cursor-pointer hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 group overflow-hidden relative"
                  onClick={() => {
                    if (recommendationsRef.current) {
                      recommendationsRef.current.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  data-testid="card-weekly-focus"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
                  <CardHeader className="relative">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg opacity-90">Weekly Focus</CardTitle>
                      <ChevronRight className="h-5 w-5 opacity-60 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="flex items-center gap-5 mb-4">
                      <div className="relative">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                          <circle 
                            cx="18" cy="18" r="15.5" fill="none" 
                            stroke="white" strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={`${completionPercent * 0.974} 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold">{completionPercent}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold" data-testid="text-recommendation-count">
                          {normalizedRecommendations.filter(r => r.impact === "High").length}
                        </div>
                        <p className="opacity-80 text-sm">High-impact tasks</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs opacity-70 mb-1">
                      <span>{completedRecs} of {totalRecs} completed</span>
                    </div>
                    <Progress 
                      value={completionPercent} 
                      className="h-1.5 bg-white/15 [&>div]:bg-white" 
                    />
                    <p className="text-xs opacity-50 mt-3 group-hover:opacity-70 transition-opacity">Click to view tasks →</p>
                  </CardContent>
                </Card>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.07 }}
              >
                <Card
                  className="border-none shadow-md ring-1 ring-violet-200/50 bg-gradient-to-br from-violet-50 via-white to-indigo-50 overflow-hidden relative"
                  data-testid="card-no-click-marketing"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-violet-200/20 rounded-full -translate-y-12 translate-x-12" />
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                          <Megaphone className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <Badge variant="secondary" className="mb-1 bg-violet-100 text-violet-700 hover:bg-violet-100">New Framework</Badge>
                          <CardTitle className="text-lg font-display">No-Click Marketing</CardTitle>
                          <CardDescription className="text-xs">
                            Influence buyers without relying on clicks or last-click attribution.
                          </CardDescription>
                        </div>
                      </div>
                      <a
                        href="/blog/no-click-marketing-future-of-brand-visibility"
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="link-no-click-article"
                      >
                        <Button variant="outline" size="sm" className="border-violet-200 hover:bg-violet-100 hover:text-violet-700">
                          Read the guide <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent className="relative pt-0">
                    <p className="text-sm text-muted-foreground mb-4">
                      AI Overviews, dark social, and platform-native content are breaking last-click attribution.
                      The brands that win are the ones being seen, mentioned, and remembered everywhere their buyers pay attention.
                    </p>
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Organic Social & LinkedIn", channel: "Organic Social" },
                        { label: "LLMs / AEO visibility", channel: "LLMs" },
                        { label: "Retargeting & display", channel: "Retargeting" },
                        { label: "Community & word of mouth", channel: "Community" },
                      ].map((item) => (
                        <button
                          key={item.channel}
                          onClick={() => handleChannelSelect(item.channel)}
                          className="text-left p-3 rounded-lg bg-white/70 hover:bg-white border border-violet-100 hover:border-violet-300 transition-colors group"
                          data-testid={`button-no-click-channel-${item.channel}`}
                        >
                          <div className="text-xs font-medium text-foreground group-hover:text-violet-700 transition-colors">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            View strategy <ChevronRight className="h-3 w-3" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {isPremium && (
                <motion.div
                  ref={agentCardRef}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.075 }}
                >
                  <Card
                    className="border-none shadow-md ring-1 ring-indigo-200/60 bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden relative"
                    data-testid="card-gtm-agent"
                  >
                    <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-200/20 rounded-full -translate-y-10 translate-x-10" />
                    <CardHeader className="relative pb-3">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <Badge variant="secondary" className="mb-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Pro</Badge>
                            <CardTitle className="text-lg font-display">GTM Agent</CardTitle>
                            <CardDescription className="text-xs">Your personal marketing coach — checks in when you stall and celebrates wins</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{agentEnabled === false ? "Paused" : "Active"}</span>
                          <Switch
                            checked={agentEnabled === true}
                            onCheckedChange={handleAgentToggle}
                            disabled={agentToggling || agentEnabled === null}
                            aria-label="Toggle GTM Agent"
                            data-testid="toggle-gtm-agent"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative pt-0">
                      {agentEnabled === false && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-4">
                          GTM Agent is paused. Toggle it on to receive coaching nudges and weekly digest emails.
                        </div>
                      )}
                      {(() => {
                        const recs = data?.recommendations ?? [];
                        const inProgressChannels = Array.from(new Set(
                          recs.filter(r => r.status === "In Progress").map(r => r.category)
                        ));
                        const nextCheckIn = agentEventsData?.nextCheckIn;
                        const nextCheckInDate = nextCheckIn?.dueAt ? new Date(nextCheckIn.dueAt) : null;
                        const daysUntil = nextCheckInDate
                          ? Math.ceil((nextCheckInDate.getTime() - Date.now()) / 86400000)
                          : null;
                        const nudgeLabel: Record<string, string> = {
                          stall: "stall check-in",
                          completion_congrats: "completion congrats",
                          weekly_digest: "weekly digest",
                        };
                        return (
                          <div className="grid sm:grid-cols-2 gap-3 mb-4">
                            <div className="rounded-lg bg-white/70 border border-indigo-100 p-3">
                              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">In-progress channels</p>
                              {inProgressChannels.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {inProgressChannels.map(ch => (
                                    <Badge key={ch} variant="outline" className="text-[10px] h-5 px-2 border-indigo-200 text-indigo-600 bg-indigo-50">{ch}</Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No channels in progress yet. Start a recommendation to activate your agent.</p>
                              )}
                            </div>
                            <div className="rounded-lg bg-white/70 border border-indigo-100 p-3">
                              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">Next scheduled check-in</p>
                              {nextCheckIn ? (
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {daysUntil !== null && daysUntil <= 0
                                      ? "Sending today"
                                      : daysUntil === 1
                                      ? "Tomorrow"
                                      : `In ${daysUntil} days`}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {nudgeLabel[nextCheckIn.nudgeType] ?? nextCheckIn.nudgeType}
                                    {nextCheckIn.channelId ? ` — ${nextCheckIn.channelId}` : ""}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No upcoming nudges scheduled. Every Monday you'll get a weekly digest.</p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notification channels</p>
                        <div className="space-y-2">
                          <AgentPushOptIn />
                          <SlackConnectSection
                            slackConnected={agentEventsData?.slackConnected ?? false}
                            onDisconnected={() => queryClient.invalidateQueries({ queryKey: ["agentEvents"] })}
                          />
                        </div>
                      </div>
                      {(agentEventsData?.events?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent activity</p>
                          <div className="space-y-1">
                            {agentEventsData!.events.slice(0, 5).map((event) => {
                              const eventLabels: Record<string, string> = {
                                milestone_start: "Milestone check-in sent",
                                stall_nudge: "Stall nudge sent",
                                completion_congrats: "Congrats email sent",
                                weekly_digest: "Weekly digest sent",
                              };
                              const eventIcons: Record<string, string> = {
                                milestone_start: "🚀",
                                stall_nudge: "⏰",
                                completion_congrats: "🎉",
                                weekly_digest: "📊",
                              };
                              const label = eventLabels[event.eventType] || event.eventType;
                              const icon = eventIcons[event.eventType] || "🤖";
                              const sentAt = new Date(event.sentAt);
                              const daysAgo = Math.floor((Date.now() - sentAt.getTime()) / 86400000);
                              const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
                              return (
                                <div key={event.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-indigo-50 last:border-0" data-testid={`agent-event-${event.id}`}>
                                  <span className="text-base leading-none">{icon}</span>
                                  <span className="text-foreground font-medium">{label}</span>
                                  {event.channelId && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-indigo-200 text-indigo-600">{event.channelId}</Badge>}
                                  <span className="ml-auto text-muted-foreground">{timeLabel}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {(agentEventsData?.events?.length ?? 0) === 0 && agentEnabled !== false && (
                        <p className="text-xs text-muted-foreground italic">No activity yet. Start working on a channel recommendation to trigger your first coaching nudge.</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {!isPremium && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.075 }}
                >
                  <Card
                    className="border-none shadow-md ring-1 ring-indigo-200/60 bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden relative"
                    data-testid="card-gtm-agent-locked"
                  >
                    <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-200/20 rounded-full -translate-y-10 translate-x-10" />
                    <CardHeader className="relative pb-3">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <Badge variant="secondary" className="mb-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Pro</Badge>
                            <CardTitle className="text-lg font-display">GTM Agent</CardTitle>
                            <CardDescription className="text-xs">Your personal marketing coach — checks in when you stall and celebrates wins</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative pt-0">
                      <div className="grid sm:grid-cols-3 gap-3 mb-4">
                        {[
                          { icon: "⏰", label: "Stall nudges", desc: "Notified when you stop making progress on a channel" },
                          { icon: "🎉", label: "Win celebrations", desc: "Personalised congrats when you complete a recommendation" },
                          { icon: "📊", label: "Weekly digests", desc: "Monday recap of progress and next-best actions" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg bg-white/70 border border-indigo-100 p-3 text-center">
                            <div className="text-2xl mb-1">{item.icon}</div>
                            <p className="text-xs font-semibold text-indigo-700 mb-1">{item.label}</p>
                            <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                      <Button
                        className="w-full"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent("premium-required", {
                              detail: { message: "GTM Agent coaching is a Pro feature. Upgrade to get personal coaching nudges, win celebrations, and weekly digests." },
                            })
                          )
                        }
                        data-testid="button-gtm-agent-upgrade"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Upgrade to Pro to unlock GTM Agent
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {company.siteProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-md ring-1 ring-slate-200/50" data-testid="card-icp-details">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-display flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Target Customer (ICP)
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-primary"
                            onClick={() => {
                              if (icpEditing && data?.company?.siteProfile?.icpDetails) {
                                const icp = data.company.siteProfile.icpDetails;
                                setIcpForm({
                                  persona: icp.persona || '',
                                  companySize: icp.companySize || '',
                                  industry: icp.industry || '',
                                  painPoints: icp.painPoints?.join(', ') || '',
                                });
                              }
                              setIcpEditing(!icpEditing);
                            }}
                            data-testid="button-edit-icp"
                          >
                            {icpEditing ? "Cancel" : "Edit"}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {icpEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Persona</label>
                              <input
                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={icpForm.persona}
                                onChange={(e) => setIcpForm({ ...icpForm, persona: e.target.value })}
                                data-testid="input-icp-persona"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">Company Size</label>
                                <input
                                  className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  value={icpForm.companySize}
                                  onChange={(e) => setIcpForm({ ...icpForm, companySize: e.target.value })}
                                  data-testid="input-icp-company-size"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">Industry</label>
                                <input
                                  className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  value={icpForm.industry}
                                  onChange={(e) => setIcpForm({ ...icpForm, industry: e.target.value })}
                                  data-testid="input-icp-industry"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Pain Points (comma-separated)</label>
                              <input
                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={icpForm.painPoints}
                                onChange={(e) => setIcpForm({ ...icpForm, painPoints: e.target.value })}
                                data-testid="input-icp-pain-points"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => icpMutation.mutate()}
                              disabled={icpMutation.isPending}
                              data-testid="button-save-icp"
                            >
                              {icpMutation.isPending ? "Saving..." : "Save ICP"}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {company.siteProfile.icpDetails?.persona && (
                              <div className="flex items-start gap-2">
                                <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Persona</p>
                                  <p className="text-sm font-medium" data-testid="text-icp-persona">{company.siteProfile.icpDetails.persona}</p>
                                </div>
                              </div>
                            )}
                            {company.siteProfile.icpDetails?.companySize && (
                              <div className="flex items-start gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Company Size</p>
                                  <p className="text-sm font-medium" data-testid="text-icp-company-size">{company.siteProfile.icpDetails.companySize}</p>
                                </div>
                              </div>
                            )}
                            {company.siteProfile.icpDetails?.industry && (
                              <div className="flex items-start gap-2">
                                <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Industry</p>
                                  <p className="text-sm font-medium" data-testid="text-icp-industry">{company.siteProfile.icpDetails.industry}</p>
                                </div>
                              </div>
                            )}
                            {company.siteProfile.icpDetails?.painPoints && company.siteProfile.icpDetails.painPoints.length > 0 && (
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Pain Points</p>
                                  <div className="flex flex-wrap gap-1.5 mt-1" data-testid="text-icp-pain-points">
                                    {company.siteProfile.icpDetails.painPoints.map((point, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">{point}</Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            {!company.siteProfile.icpDetails?.persona && (
                              <p className="text-sm text-muted-foreground italic">No ICP detected yet. Click "Edit" to add your target customer details.</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-md ring-1 ring-slate-200/50" data-testid="card-content-gaps">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-display flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-amber-500" />
                          Content Opportunities
                        </CardTitle>
                        <CardDescription>Auto-detected gaps in your content strategy</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {company.siteProfile.contentGaps && company.siteProfile.contentGaps.length > 0 ? (
                          <div className="space-y-2">
                            {company.siteProfile.contentGaps.map((gap, i) => (
                              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50/50 border border-amber-100/60" data-testid={`text-content-gap-${i}`}>
                                <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-slate-700">{gap}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No content gaps detected. Re-analyze to refresh.</p>
                        )}
                        {company.siteProfile.keyDifferentiators && company.siteProfile.keyDifferentiators.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Key Differentiators</p>
                            <div className="flex flex-wrap gap-1.5">
                              {company.siteProfile.keyDifferentiators.map((diff, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary" data-testid={`text-differentiator-${i}`}>
                                  {diff}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {(company.screenshotUrl || company.visualAnalysis) && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-xl font-bold font-display mb-6 flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Website Visual Analysis
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {company.screenshotUrl && (
                      <Card className="border-none shadow-md overflow-hidden">
                        <CardContent className="p-0">
                          <img 
                            src={company.screenshotUrl} 
                            alt={`Screenshot of ${company.name || company.url}`}
                            className="w-full h-auto rounded-lg"
                            data-testid="img-website-screenshot"
                          />
                        </CardContent>
                      </Card>
                    )}
                    {company.visualAnalysis && (
                      <Card className="border-none shadow-md">
                        <CardHeader>
                          <CardTitle className="text-lg">Design & UX Insights</CardTitle>
                          <CardDescription>AI-powered visual analysis of your website</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none text-muted-foreground" data-testid="text-visual-analysis">
                            {company.visualAnalysis.split('\n').map((line, i) => {
                              if (line.startsWith('**') && line.endsWith('**')) {
                                return <p key={i} className="font-semibold text-foreground mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
                              }
                              if (line.match(/^\d+\.\s\*\*/)) {
                                const cleaned = line.replace(/\*\*/g, '');
                                return <p key={i} className="mt-2"><span className="font-semibold text-foreground">{cleaned.split(':')[0]}:</span>{cleaned.split(':').slice(1).join(':')}</p>;
                              }
                              if (line.trim()) {
                                return <p key={i} className="mt-1">{line.replace(/\*\*/g, '')}</p>;
                              }
                              return null;
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </motion.div>
              )}

              {company.pageSpeedData && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                >
                  <h2 className="text-xl font-bold font-display mb-6 flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-primary" />
                    Website Performance
                  </h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    {(() => {
                      const psd = company.pageSpeedData;
                      if (!psd || typeof psd.performanceScore !== 'number' || !psd.coreWebVitals) return null;
                      const score = psd.performanceScore || 0;
                      const scoreColor = score >= 90 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';
                      const scoreRingColor = score >= 90 ? 'stroke-green-500' : score >= 50 ? 'stroke-amber-500' : 'stroke-red-500';
                      const scoreBg = score >= 90 ? 'from-green-50 to-emerald-50' : score >= 50 ? 'from-amber-50 to-orange-50' : 'from-red-50 to-rose-50';
                      const scoreLabel = score >= 90 ? 'Excellent' : score >= 50 ? 'Needs Work' : 'Poor';

                      return (
                        <>
                          <Card className={`border-none shadow-md bg-gradient-to-br ${scoreBg}`} data-testid="card-performance-score">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold">Performance Score</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center pb-6">
                              <div className="relative w-32 h-32 mb-3">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200" />
                                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round" className={scoreRingColor}
                                    strokeDasharray={`${(score / 100) * 327} 327`}
                                    style={{ transition: 'stroke-dasharray 1s ease-out' }}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
                                  <span className="text-xs text-muted-foreground">/100</span>
                                </div>
                              </div>
                              <Badge variant="outline" className={`${score >= 90 ? 'border-green-300 bg-green-100 text-green-700' : score >= 50 ? 'border-amber-300 bg-amber-100 text-amber-700' : 'border-red-300 bg-red-100 text-red-700'}`}>
                                {scoreLabel}
                              </Badge>
                            </CardContent>
                          </Card>

                          <Card className="border-none shadow-md" data-testid="card-core-web-vitals">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                Core Web Vitals
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {[
                                { key: 'lcp', label: 'LCP', unit: 'ms', desc: 'Largest Contentful Paint' },
                                { key: 'fcp', label: 'FCP', unit: 'ms', desc: 'First Contentful Paint' },
                                { key: 'cls', label: 'CLS', unit: '', desc: 'Cumulative Layout Shift' },
                                { key: 'ttfb', label: 'TTFB', unit: 'ms', desc: 'Time to First Byte' },
                                { key: 'inp', label: 'INP', unit: 'ms', desc: 'Interaction to Next Paint' },
                              ].map(({ key, label, unit, desc }) => {
                                const metric = psd.coreWebVitals?.[key as keyof typeof psd.coreWebVitals];
                                if (!metric || typeof metric.value !== 'number' || (metric.value === 0 && key === 'inp')) return null;
                                const displayValue = isNaN(metric.value) ? 0 : metric.value;
                                const ratingColor = metric.rating === 'good' ? 'bg-green-500' : metric.rating === 'needs-improvement' ? 'bg-amber-500' : 'bg-red-500';
                                return (
                                  <Tooltip key={key}>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center justify-between py-1 cursor-help">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${ratingColor}`} />
                                          <span className="text-sm font-medium">{label}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground tabular-nums">
                                          {key === 'cls' ? displayValue.toFixed(3) : `${displayValue.toLocaleString()}${unit}`}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      <p className="text-xs">{desc}: {metric.rating === 'good' ? 'Good' : metric.rating === 'needs-improvement' ? 'Needs improvement' : 'Poor'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </CardContent>
                          </Card>

                          <Card className="border-none shadow-md" data-testid="card-performance-opportunities">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Top Opportunities
                              </CardTitle>
                              <CardDescription className="text-xs">Improvements to boost your score</CardDescription>
                            </CardHeader>
                            <CardContent>
                              {!Array.isArray(psd.opportunities) || psd.opportunities.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No major opportunities found — your site is well optimized.</p>
                              ) : (
                                <div className="space-y-3">
                                  {psd.opportunities.map((opp, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                      <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                                        {idx + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-tight">{opp.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Save ~{opp.savings}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </>
                      );
                    })()}
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h2 className="text-xl font-bold font-display mb-6 tracking-tight">Your Channel Strategy</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {CHANNELS.filter(c => !('divider' in c) && c.id !== 'all').map((channel, idx) => {
                    const Icon = (channel as { icon: typeof LayoutDashboard }).icon;
                    const count = channelCounts[channel.id] || 0;
                    const completedInChannel = normalizedRecommendations.filter(r => r.category === channel.id && r.status === "Completed").length;
                    const hasRecs = count > 0;
                    const colorClasses = channelColorMap[channel.id] || "from-slate-500/10 to-slate-600/5 hover:border-slate-400";
                    const iconColor = channelIconColorMap[channel.id] || "bg-slate-100 text-slate-600";
                    return (
                      <motion.div
                        key={channel.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * idx }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-all duration-200 border shadow-sm ${hasRecs ? `bg-gradient-to-br ${colorClasses} hover:shadow-lg` : 'opacity-40 bg-slate-50'}`}
                          onClick={() => hasRecs && setSelectedChannel(channel.id)}
                          data-testid={`overview-channel-${channel.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm ${hasRecs ? iconColor : 'bg-slate-100 text-slate-400'}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{channel.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {count} {count === 1 ? 'strategy' : 'strategies'}
                                </p>
                              </div>
                              {hasRecs && <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                            </div>
                            {hasRecs && count > 0 && (
                              <div className="mt-3 flex items-center gap-2">
                                <Progress 
                                  value={Math.round((completedInChannel / count) * 100)} 
                                  className="h-1.5 flex-1 bg-slate-200/40 [&>div]:bg-primary/50 [&>div]:transition-all [&>div]:duration-500 rounded-full" 
                                />
                                <span className="text-[10px] text-muted-foreground font-medium tabular-nums">{completedInChannel}/{count}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="bg-card dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search recommendations... (Ctrl+K)"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      data-testid="input-search-recommendations"
                      aria-label="Search recommendations"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px] h-9 text-xs" data-testid="select-status-filter" aria-label="Filter by status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={impactFilter} onValueChange={setImpactFilter}>
                      <SelectTrigger className="w-[120px] h-9 text-xs" data-testid="select-impact-filter" aria-label="Filter by impact">
                        <SelectValue placeholder="Impact" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Impact</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={channelFilter} onValueChange={setChannelFilter}>
                      <SelectTrigger className="w-[140px] h-9 text-xs" data-testid="select-channel-filter" aria-label="Filter by channel">
                        <SelectValue placeholder="Channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Channels</SelectItem>
                        {CHANNELS.filter(c => !('divider' in c) && c.id !== 'all').map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant={bulkMode ? "default" : "outline"}
                      size="sm"
                      className="h-9 text-xs"
                      onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
                      data-testid="button-bulk-mode"
                      aria-label="Toggle bulk selection mode"
                    >
                      <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                      {bulkMode ? "Cancel" : "Bulk"}
                    </Button>
                  </div>
                </div>
              </motion.div>

              <AnimatePresence>
                {bulkMode && selectedIds.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4"
                    role="toolbar"
                    aria-label="Bulk actions"
                  >
                    <span className="text-sm font-medium">{selectedIds.size} selected</span>
                    <Separator orientation="vertical" className="h-5 bg-slate-600 dark:bg-slate-400" />
                    <Button size="sm" variant="ghost" className="text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-300 text-xs" onClick={() => handleBulkStatusChange("New")} data-testid="button-bulk-new">
                      <Circle className="mr-1 h-3 w-3" /> New
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-300 text-xs" onClick={() => handleBulkStatusChange("In Progress")} data-testid="button-bulk-progress">
                      <Clock className="mr-1 h-3 w-3" /> In Progress
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-300 text-xs" onClick={() => handleBulkStatusChange("Completed")} data-testid="button-bulk-complete">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white/60 dark:text-slate-500 hover:text-white dark:hover:text-slate-900 text-xs" onClick={() => { setSelectedIds(new Set()); setBulkMode(false); }} data-testid="button-bulk-cancel" aria-label="Cancel bulk selection">
                      <X className="h-3 w-3" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div 
                ref={recommendationsRef}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                data-tour="high-impact-tasks"
              >
                <h2 className="text-xl font-bold font-display mb-6 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  High-Impact Tasks
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Your most impactful recommendations across all channels. Mark them as In Progress or Completed to track your progress.</p>
                    </TooltipContent>
                  </Tooltip>
                </h2>
                {(() => {
                  const hasActiveFilters = searchQuery || statusFilter !== "all" || impactFilter !== "all" || channelFilter !== "all";
                  let filtered = hasActiveFilters ? normalizedRecommendations : normalizedRecommendations.filter(r => r.impact === "High");
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    filtered = filtered.filter(r => r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
                  }
                  if (statusFilter !== "all") filtered = filtered.filter(r => r.status === statusFilter);
                  if (impactFilter !== "all") filtered = filtered.filter(r => r.impact === impactFilter);
                  if (channelFilter !== "all") filtered = filtered.filter(r => r.category === channelFilter);
                  return filtered.length;
                })() === 0 ? (
                  <Card className="p-10 text-center border-dashed border-2 border-slate-200/80 bg-gradient-to-br from-slate-50/50 to-white">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Zap className="h-8 w-8 text-primary/40" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2 font-display">No high-impact tasks yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto text-sm">They'll appear after your analysis completes. High-impact tasks are your most effective growth levers.</p>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {(() => {
                      const hasActiveFilters = searchQuery || statusFilter !== "all" || impactFilter !== "all" || channelFilter !== "all";
                      let highImpact = hasActiveFilters ? normalizedRecommendations : normalizedRecommendations.filter(r => r.impact === "High");
                      if (searchQuery) {
                        const q = searchQuery.toLowerCase();
                        highImpact = highImpact.filter(r => r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
                      }
                      if (statusFilter !== "all") highImpact = highImpact.filter(r => r.status === statusFilter);
                      if (impactFilter !== "all") highImpact = highImpact.filter(r => r.impact === impactFilter);
                      if (channelFilter !== "all") highImpact = highImpact.filter(r => r.category === channelFilter);
                      const newTasks = highImpact.filter(r => r.status === "New");
                      const inProgressTasks = highImpact.filter(r => r.status === "In Progress");
                      const completedTasks = highImpact.filter(r => r.status === "Completed");
                      
                      const renderTaskGroup = (tasks: typeof highImpact, groupLabel: string, groupIcon: React.ReactNode, borderColor: string) => {
                        if (tasks.length === 0) return null;
                        return (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              {groupIcon}
                              <span className="text-sm font-semibold text-muted-foreground">{groupLabel}</span>
                              <span className="text-xs text-muted-foreground/60">({tasks.length})</span>
                            </div>
                            <div className="space-y-2">
                              {tasks.map((rec) => (
                                <Card 
                                  key={rec.id} 
                                  className={`transition-all duration-200 hover:shadow-md border-l-[3px] ${borderColor} ${rec.status === "Completed" ? 'opacity-50 bg-slate-50/80 dark:bg-slate-800/50' : ''} ${bulkMode && selectedIds.has(rec.id) ? 'ring-2 ring-primary' : ''}`}
                                  data-testid={`card-task-${rec.id}`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      {bulkMode ? (
                                        <button
                                          className="mt-0.5 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                                          onClick={() => toggleSelection(rec.id)}
                                          data-testid={`checkbox-task-${rec.id}`}
                                          aria-label={`Select ${rec.title}`}
                                        >
                                          {selectedIds.has(rec.id) ? (
                                            <CheckSquare className="h-5 w-5 text-primary" />
                                          ) : (
                                            <Square className="h-5 w-5 text-slate-300" />
                                          )}
                                        </button>
                                      ) : (
                                      <button
                                        className="mt-0.5 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                                        onClick={() => handleStatusChange(
                                          rec.id, 
                                          rec.status === "Completed" ? "New" : "Completed",
                                          rec.status
                                        )}
                                        data-testid={`button-toggle-status-${rec.id}`}
                                        aria-label={`Mark ${rec.title} as ${rec.status === "Completed" ? "New" : "Completed"}`}
                                      >
                                        {rec.status === "Completed" ? (
                                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        ) : rec.status === "In Progress" ? (
                                          <Clock className="h-5 w-5 text-blue-500" />
                                        ) : (
                                          <Circle className="h-5 w-5 text-slate-300 hover:text-primary transition-colors" />
                                        )}
                                      </button>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className={`font-semibold text-sm ${rec.status === "Completed" ? 'line-through text-muted-foreground' : ''}`}>
                                            {rec.title}
                                          </p>
                                          <Badge variant="outline" className="text-xs shrink-0">
                                            {rec.category}
                                          </Badge>
                                          {rec.gtmFunnel && rec.gtmFunnel !== 'both' && (
                                            <Badge variant="secondary" className={`text-[10px] shrink-0 ${rec.gtmFunnel === 'plg' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`} data-testid={`badge-funnel-${rec.id}`}>
                                              {rec.gtmFunnel === 'plg' ? 'PLG' : 'Sales'}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                          {formatStrategyDescription(rec.description || '', true)}
                                        </div>
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" data-testid={`button-status-menu-${rec.id}`} aria-label={`Status options for ${rec.title}`}>
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "New", rec.status)} data-testid={`menu-status-new-${rec.id}`}>
                                            <Circle className="h-4 w-4 mr-2 text-slate-400" /> Mark as New
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "In Progress", rec.status)} data-testid={`menu-status-inprogress-${rec.id}`}>
                                            <Clock className="h-4 w-4 mr-2 text-blue-500" /> Mark as In Progress
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "Completed", rec.status)} data-testid={`menu-status-completed-${rec.id}`}>
                                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> Mark as Completed
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        );
                      };

                      return (
                        <>
                          {renderTaskGroup(newTasks, "New", <Circle className="h-4 w-4 text-slate-400" />, "border-l-slate-300")}
                          {renderTaskGroup(inProgressTasks, "In Progress", <Clock className="h-4 w-4 text-blue-500" />, "border-l-blue-400")}
                          {renderTaskGroup(completedTasks, "Completed", <CheckCircle2 className="h-4 w-4 text-green-500" />, "border-l-green-400")}
                        </>
                      );
                    })()}
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                data-tour="ai-advisor"
              >
                <h2 className="text-xl font-bold font-display mb-6">Ask AI Advisor</h2>
                <AIChat 
                  companyName={company.name || 'Your Company'} 
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2" data-tour="content-sprints">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold font-display">Weekly Content Sprints</h2>
                      {weeklyIdeas.length > 0 && (
                        <span className="text-xs text-muted-foreground bg-slate-100 px-2.5 py-1 rounded-full font-medium" data-testid="text-sprint-count">
                          {weeklyIdeas.length} {weeklyIdeas.length === 1 ? 'idea' : 'ideas'}
                        </span>
                      )}
                    </div>
                    <Card className="shadow-lg border-none ring-1 ring-slate-200/50 overflow-hidden">
                      <CardContent className="p-0">
                        {weeklyIdeas.length === 0 ? (
                          <div className="p-10 text-center">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/8 flex items-center justify-center mx-auto mb-3">
                              <Lightbulb className="h-6 w-6 text-primary/60" />
                            </div>
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground text-sm">Generating content ideas...</p>
                          </div>
                        ) : (
                          weeklyIdeas.map((idea, idx) => {
                            const typeConfig: Record<string, { icon: React.ElementType; bg: string; text: string; badgeBg: string }> = {
                              'social': { icon: Linkedin, bg: 'from-blue-500/15 to-blue-600/8', text: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/60' },
                              'linkedin': { icon: Linkedin, bg: 'from-blue-500/15 to-blue-600/8', text: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/60' },
                              'social media': { icon: Linkedin, bg: 'from-blue-500/15 to-blue-600/8', text: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/60' },
                              'email': { icon: MailOpen, bg: 'from-amber-500/15 to-orange-500/8', text: 'text-amber-600', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/60' },
                              'blog': { icon: FileText, bg: 'from-emerald-500/15 to-green-500/8', text: 'text-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
                              'seo': { icon: Globe, bg: 'from-purple-500/15 to-violet-500/8', text: 'text-purple-600', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200/60' },
                              'video': { icon: Video, bg: 'from-rose-500/15 to-pink-500/8', text: 'text-rose-600', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/60' },
                              'podcast': { icon: Mic, bg: 'from-indigo-500/15 to-blue-500/8', text: 'text-indigo-600', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' },
                              'webinar': { icon: Video, bg: 'from-teal-500/15 to-cyan-500/8', text: 'text-teal-600', badgeBg: 'bg-teal-50 text-teal-700 border-teal-200/60' },
                            };
                            const typeKey = (idea.type || '').trim().toLowerCase();
                            const defaultConfig = { icon: Lightbulb, bg: 'from-primary/15 to-violet-500/10', text: 'text-primary', badgeBg: 'bg-slate-100 text-slate-700 border-slate-200/60' };
                            const config = typeConfig[typeKey] || defaultConfig;
                            const TypeIcon = config.icon;
                            const displayType = idea.type?.trim() || 'General';

                            return (
                              <div key={idea.id}>
                                <div className="p-5 sm:p-6 flex items-start gap-4 hover:bg-slate-50/80 transition-all duration-200 group" data-testid={`card-idea-${idea.id}`}>
                                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${config.bg} flex items-center justify-center flex-shrink-0 ${config.text} shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                                    <TypeIcon className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-1.5">
                                      <h4 className="font-semibold text-slate-900 leading-snug">{idea.title}</h4>
                                      <span className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">{formatDate(idea.createdAt)}</span>
                                    </div>
                                    <div className="text-sm text-slate-600 leading-relaxed mb-3">
                                      {(() => {
                                        const desc = idea.description || '';
                                        const stepRegex = /(?:^|\n)\s*(?:Step\s*\d+[:.]|\d+[.)]\s)/i;
                                        if (!stepRegex.test(desc)) return <p>{desc}</p>;
                                        const steps = desc.split(/(?=(?:^|\n)\s*(?:Step\s*\d+[:.]|\d+[.)]\s))/im).filter(s => s.trim());
                                        const intro = steps.length > 0 && !stepRegex.test(steps[0]) ? steps.shift()?.trim() : null;
                                        const cleanedSteps = steps.filter(s => {
                                          const cleaned = s.replace(/^[\s\n]*(?:Step\s*\d+[:.]\s*|\d+[.)]\s*)/, '').trim();
                                          return cleaned.length > 3;
                                        });
                                        if (cleanedSteps.length === 0) return <p>{desc}</p>;
                                        return (
                                          <>
                                            {intro && <p className="mb-2 text-slate-500">{intro}</p>}
                                            <ol className="list-none space-y-1.5 pl-0 mt-1">
                                              {cleanedSteps.map((step, i) => (
                                                <li key={i} className="flex gap-2.5 items-start">
                                                  <span className={`${config.text} font-bold shrink-0 text-xs mt-[3px] w-5 h-5 rounded-full bg-gradient-to-br ${config.bg} flex items-center justify-center`}>{i + 1}</span>
                                                  <span className="text-slate-600">{step.replace(/^[\s\n]*(?:Step\s*\d+[:.]\s*|\d+[.)]\s*)/, '').trim()}</span>
                                                </li>
                                              ))}
                                            </ol>
                                          </>
                                        );
                                      })()}
                                    </div>
                                    <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 ${config.badgeBg}`}>
                                      <TypeIcon className="h-3 w-3 mr-1" />
                                      {displayType}
                                    </Badge>
                                  </div>
                                  <Button size="icon" variant="ghost" className="hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-200 flex-shrink-0 mt-0.5" aria-label={`View ${idea.title}`}>
                                    <ArrowUpRight className="h-4 w-4" />
                                  </Button>
                                </div>
                                {idx < weeklyIdeas.length - 1 && <Separator className="mx-6" />}
                              </div>
                            );
                          })
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold font-display mb-6">Competitor Intel</h2>
                    <Card className="border-dashed border-2 border-slate-200/80 bg-gradient-to-br from-slate-50/60 to-white shadow-sm">
                      <CardContent className="p-6 text-center">
                        <div className="h-14 w-14 bg-gradient-to-br from-primary/12 to-violet-500/8 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                          <TrendingUp className="h-7 w-7 text-primary/70" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 font-display">Competitor Intel Coming Soon</h3>
                        <p className="text-sm text-muted-foreground">We're building tools to show what your top competitors are doing across LinkedIn, SEO, and more.</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        ) : (
          <>
            {(() => {
              const channelInsight = channelInsights.find(ci => ci.channelId === selectedChannel);
              const channelData = CHANNELS.find(c => c.id === selectedChannel);
              const ChannelIcon = channelData && 'icon' in channelData ? channelData.icon : Target;
              const heroIconColor = channelIconColorMap[selectedChannel] || "bg-primary/20 text-primary";
              
              return (
                <>
                  <header className="h-14 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-3 md:gap-4">
                      <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setMobileMenuOpen(true)} data-testid="button-mobile-menu-channel" aria-label="Open navigation menu">
                        <Menu className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedChannel("all")} className="hover:bg-slate-100">
                        <ArrowUpRight className="mr-2 h-4 w-4 rotate-[225deg]" /> Back
                      </Button>
                      <Separator orientation="vertical" className="h-5" />
                      <h1 className="font-display font-bold text-lg tracking-tight">{channelData?.label || selectedChannel}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-download-channel-strategy">
                            <Download className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Download</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownloadChannelPDF(selectedChannel)} data-testid="button-download-channel-pdf">
                            <FileText className="mr-2 h-4 w-4" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadChannelCSV(selectedChannel)} data-testid="button-download-channel-csv">
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {channelInsight && (
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid="button-share-strategy"
                          onClick={() => setShareDialogOpen(true)}
                        >
                          <Send className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Share Strategy</span>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">{isFetching ? 'Refreshing...' : 'Refresh'}</span>
                      </Button>
                    </div>
                  </header>

                  <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative overflow-hidden rounded-2xl border border-primary/10 shadow-lg shadow-primary/5"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-violet-500/6 to-purple-500/3" />
                      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-primary/8 to-transparent rounded-full -translate-y-24 translate-x-24" />
                      <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-violet-500/6 to-transparent rounded-full translate-y-20 -translate-x-20" />
                      <div className="relative p-6 md:p-8">
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`h-13 w-13 rounded-xl flex items-center justify-center shadow-lg ${heroIconColor}`}>
                            <ChannelIcon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h1 className="text-2xl font-bold font-display tracking-tight">{channelData?.label || selectedChannel} Strategy</h1>
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
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {channelInsight 
                                ? `Personalized ${selectedChannel} strategy for ${company.name || 'your company'}`
                                : `${filteredRecommendations.length} tailored ${filteredRecommendations.length === 1 ? 'recommendation' : 'recommendations'} for ${company.name || 'your company'}`
                              }
                            </p>
                          </div>
                          {channelInsight?.heroStat && (
                            <div className="hidden sm:block text-right bg-white/90 backdrop-blur-sm rounded-xl px-5 py-3 shadow-lg border border-white/60 shrink-0">
                              <div className="text-2xl font-bold text-primary leading-tight">{channelInsight.heroStat.value}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 font-medium">{channelInsight.heroStat.label}</div>
                            </div>
                          )}
                        </div>
                        {channelInsight?.whyItMatters && (
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-primary/10 shadow-sm">
                            <h3 className="font-semibold text-xs text-primary mb-1">Why This Matters For You</h3>
                            <p className="text-sm text-slate-700 leading-relaxed">{channelInsight.whyItMatters}</p>
                          </div>
                        )}
                        {channelInsight?.heroStat && (
                          <div className="sm:hidden mt-3 text-center bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2.5 shadow-sm border border-white/50">
                            <div className="text-xl font-bold text-primary">{channelInsight.heroStat.value}</div>
                            <div className="text-xs text-muted-foreground">{channelInsight.heroStat.label}</div>
                          </div>
                        )}
                        {!channelInsight && filteredRecommendations.length > 0 && (() => {
                          const lastScrapedDate = company.lastScraped ? new Date(company.lastScraped) : null;
                          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                          const isRecentlyAnalyzed = lastScrapedDate && lastScrapedDate > fiveMinutesAgo;
                          
                          return isRecentlyAnalyzed ? (
                            <div className="bg-primary/5 rounded-lg p-3 border border-primary/10 flex items-center gap-3 mt-3">
                              <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                              <p className="text-sm text-primary">Loading deep insights for this channel...</p>
                            </div>
                          ) : (
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between mt-3">
                              <p className="text-sm text-slate-600">Channel insights couldn't be generated. Click Re-analyze to try again.</p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="ml-3 shrink-0"
                                onClick={() => retryMutation.mutate()}
                                disabled={retryMutation.isPending}
                                data-testid="button-reanalyze-insights"
                              >
                                <RefreshCw className={`mr-1.5 h-3 w-3 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                                {retryMutation.isPending ? 'Analyzing...' : 'Re-analyze'}
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>

                    {isChannelInsightsLoading && !channelInsight && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                      >
                        <div className="rounded-xl border border-primary/10 bg-primary/3 p-4 flex items-center gap-3">
                          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                          <p className="text-sm text-primary font-medium">Generating your personalized {CHANNELS.find(c => c.id === selectedChannel)?.label || selectedChannel} strategy — usually takes 15–30 seconds...</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-5 w-40 rounded" />
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                              <Card key={i} className="border-slate-200/80">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-2.5">
                                    <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
                                    <Skeleton className="h-4 w-full rounded" />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-8">
                          {[0, 1].map((col) => (
                            <div key={col}>
                              <Skeleton className="h-6 w-44 rounded mb-4" />
                              <div className="space-y-4">
                                {[...Array(2)].map((_, i) => (
                                  <Card key={i} className="border-slate-200/80">
                                    <CardContent className="p-5 space-y-3">
                                      <Skeleton className="h-5 w-3/4 rounded" />
                                      <Skeleton className="h-4 w-full rounded" />
                                      <Skeleton className="h-4 w-5/6 rounded" />
                                      <Skeleton className="h-4 w-2/3 rounded" />
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

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
                            <Card key={idx} className="bg-gradient-to-br from-slate-50/80 to-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-primary to-violet-500 shadow-sm shadow-primary/20" />
                                  <span className="text-sm font-medium">{kpi}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {selectedChannel === "LLMs" && channelInsight && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="rounded-2xl border border-indigo-200/70 dark:border-indigo-800/50 bg-gradient-to-br from-indigo-50/80 via-violet-50/40 to-white dark:from-indigo-950/30 dark:via-violet-950/20 dark:to-transparent overflow-hidden shadow-sm"
                      >
                        <div className="px-6 py-5 border-b border-indigo-100 dark:border-indigo-800/40 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                            <Brain className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-indigo-900 dark:text-indigo-100">How AI Search Actually Works: Query Fan-out</h3>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">The hidden process behind ChatGPT, Perplexity, Gemini & Google AI Mode</p>
                          </div>
                        </div>
                        <div className="p-6 space-y-5">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            When a user asks AI one question, the AI secretly breaks it into <strong>8–20 sub-queries</strong> running in parallel — covering definitions, comparisons, pricing, implementation, troubleshooting, and reviews — before synthesizing one final answer. The user never sees these sub-queries.
                          </p>

                          <div className="rounded-xl bg-white/80 dark:bg-slate-800/50 border border-indigo-100 dark:border-indigo-800/30 p-4">
                            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-3 uppercase tracking-wide">Example: "What is the best CRM for SaaS startups?"</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 italic">The AI internally researches all of these at once:</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                "What is CRM software?",
                                "Best CRM for startups",
                                "HubSpot vs Pipedrive vs Close",
                                "CRM pricing comparison",
                                "CRM implementation guide",
                                "CRM automation features",
                                "CRM integrations",
                                "CRM migration best practices",
                              ].map((q, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                  <Search className="h-3 w-3 text-indigo-400 mt-0.5 shrink-0" />
                                  <span>{q}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 italic">The user only sees the final synthesized answer.</p>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="rounded-xl bg-white/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                  <Search className="h-3 w-3 text-slate-500" />
                                </div>
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Traditional SEO</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Rank <strong>one page</strong> for <strong>one keyword</strong>. Win the top result and you're done.</p>
                            </div>
                            <div className="rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                  <Brain className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">AEO / GEO</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Demonstrate expertise across an <strong>entire topic ecosystem</strong> so AI encounters your brand across multiple sub-queries — not just the commercial one.</p>
                            </div>
                          </div>

                          <div className="rounded-xl bg-white/80 dark:bg-slate-800/50 border border-indigo-100 dark:border-indigo-800/30 p-4">
                            <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-3 uppercase tracking-wide flex items-center gap-1.5">
                              <Zap className="h-3.5 w-3.5" /> AI Topic Coverage Score
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                              Measures how consistently your brand appears across the full fan-out cluster — not just one commercial keyword.
                            </p>
                            <div className="bg-indigo-50/80 dark:bg-indigo-950/40 rounded-lg p-3 font-mono text-xs text-center space-y-1">
                              <div className="text-indigo-700 dark:text-indigo-300 font-bold">Brand Mentions ÷ Total Fan-out Prompts × 100</div>
                              <div className="text-slate-500 dark:text-slate-400">e.g. 6 mentions ÷ 8 prompts × 100 = <span className="font-bold text-indigo-600">Score: 75</span></div>
                              <div className="text-xs text-slate-400 pt-1">Target: 60+ across the topic ecosystem</div>
                            </div>
                          </div>

                          <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 p-4">
                            <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                              <Lightbulb className="h-3.5 w-3.5" /> The Key Insight
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              Many fan-out sub-queries have <strong>little or no measurable search volume</strong> in traditional keyword tools — yet AI systems execute them constantly behind the scenes. The most valuable AEO content opportunities won't show up in Google Search Console.
                            </p>
                          </div>

                          <div className="text-xs text-slate-400 dark:text-slate-500 pt-1">
                            Sources: iPullRank · Zyppy Signal · DataForSEO
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {((channelInsight?.strategicPillars && channelInsight.strategicPillars.length > 0) || (channelInsight?.quickWins && channelInsight.quickWins.length > 0)) && (
                    <div className="grid lg:grid-cols-2 gap-8">
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
                              <AccordionItem key={idx} value={`pillar-${idx}`} className="border border-slate-200/80 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                  <div className="flex items-center gap-3 text-left">
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 flex items-center justify-center text-primary font-bold text-sm">
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
                              <Card key={idx} className="border-slate-200/80 hover:border-primary/30 hover:shadow-md transition-all duration-200 shadow-sm">
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
                    )}

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
                            <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-default">
                              {resource}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                    >
                      <AIChat 
                        companyName={company.name || 'Your Company'}
                        channelId={selectedChannel}
                        variant="compact"
                      />
                    </motion.div>

                    {(filteredRecommendations.length > 0 || !channelInsight) && (
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
                        <Card className="p-8 text-center bg-gradient-to-br from-slate-50/50 to-white border-dashed border-2 border-slate-200/80">
                          <p className="text-muted-foreground text-sm">No specific recommendations generated for this channel yet.</p>
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
                              <Card className={`transition-all duration-200 shadow-sm border-l-[3px] ${
                                rec.impact === 'High' ? 'border-l-green-400' : rec.impact === 'Medium' ? 'border-l-amber-400' : 'border-l-slate-300'
                              } ${rec.status === "Completed" ? 'opacity-50 bg-slate-50/80' : 'hover:shadow-md hover:border-slate-300'}`} data-testid={`card-recommendation-${rec.id}`}>
                                <CardHeader className="pb-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                      <button
                                        className="mt-1 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                                        onClick={() => handleStatusChange(
                                          rec.id, 
                                          rec.status === "Completed" ? "New" : "Completed",
                                          rec.status
                                        )}
                                        data-testid={`button-toggle-rec-status-${rec.id}`}
                                        aria-label={`Mark ${rec.title} as ${rec.status === "Completed" ? "New" : "Completed"}`}
                                      >
                                        {rec.status === "Completed" ? (
                                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        ) : rec.status === "In Progress" ? (
                                          <Clock className="h-5 w-5 text-blue-500" />
                                        ) : (
                                          <Circle className="h-5 w-5 text-slate-300 hover:text-primary transition-colors" />
                                        )}
                                      </button>
                                      <div>
                                        <CardTitle className={`text-lg ${rec.status === "Completed" ? 'line-through text-muted-foreground' : ''}`}>{rec.title}</CardTitle>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className={rec.impact === 'High' ? 'border-green-200 bg-green-50 text-green-700' : rec.impact === 'Medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}>
                                        {rec.impact} Impact
                                      </Badge>
                                      <Badge variant="outline" className={rec.effort === 'Low' ? 'border-green-200 bg-green-50 text-green-700' : rec.effort === 'Medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}>
                                        {rec.effort} Effort
                                      </Badge>
                                      {rec.gtmFunnel && rec.gtmFunnel !== 'both' && (
                                        <Badge variant="secondary" className={`text-[10px] ${rec.gtmFunnel === 'plg' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                          {rec.gtmFunnel === 'plg' ? 'PLG' : 'Sales'}
                                        </Badge>
                                      )}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-rec-status-menu-${rec.id}`}>
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "New", rec.status)} data-testid={`menu-rec-status-new-${rec.id}`}>
                                            <Circle className="h-4 w-4 mr-2 text-slate-400" /> Mark as New
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "In Progress", rec.status)} data-testid={`menu-rec-status-inprogress-${rec.id}`}>
                                            <Clock className="h-4 w-4 mr-2 text-blue-500" /> Mark as In Progress
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "Completed", rec.status)} data-testid={`menu-rec-status-completed-${rec.id}`}>
                                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> Mark as Completed
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-sm text-muted-foreground leading-relaxed">
                                    {formatStrategyDescription(rec.description || '', false)}
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                    )}

                    {channelInsight?.companyFitSummary && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-gradient-to-r from-primary/8 via-violet-500/5 to-transparent rounded-2xl p-6 border border-primary/10 shadow-sm hover:shadow-md transition-shadow duration-200"
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

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Tell a Friend about GTM Champion
            </DialogTitle>
            <DialogDescription>
              Send an email invitation to a friend or colleague to try GTM Champion for free.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="invite-name">Their Name</label>
              <input
                id="invite-name"
                type="text"
                placeholder="e.g. Jane Smith"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                data-testid="input-invite-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="invite-email">Their Email <span className="text-red-500">*</span></label>
              <input
                id="invite-email"
                type="email"
                placeholder="friend@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                data-testid="input-invite-email"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)} data-testid="button-invite-cancel">Cancel</Button>
            <Button onClick={handleSendInvite} disabled={!inviteEmail || inviteSending} data-testid="button-invite-send">
              {inviteSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : <><Send className="mr-2 h-4 w-4" /> Send Invite</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-primary" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <kbd key={j} className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Share {CHANNELS.find(c => c.id === selectedChannel)?.label || selectedChannel} Strategy
            </DialogTitle>
            <DialogDescription>
              Send this channel strategy to a friend or co-worker so they can see the insights.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="share-name">Their Name</label>
              <input
                id="share-name"
                type="text"
                placeholder="e.g. Jane Smith"
                value={shareName}
                onChange={e => setShareName(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                data-testid="input-share-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="share-email">Their Email <span className="text-red-500">*</span></label>
              <input
                id="share-email"
                type="email"
                placeholder="colleague@company.com"
                value={shareEmail}
                onChange={e => setShareEmail(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                data-testid="input-share-email"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)} data-testid="button-share-cancel">Cancel</Button>
            <Button onClick={handleShareStrategy} disabled={!shareEmail || shareSending} data-testid="button-share-send">
              {shareSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : <><Send className="mr-2 h-4 w-4" /> Share Strategy</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
    </>
  );
}
