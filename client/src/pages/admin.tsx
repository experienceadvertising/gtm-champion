import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getSession } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Users,
  BarChart3,
  Trash2,
  Search,
  TrendingUp,
  CheckCircle2,
  Target,
  Calendar,
  Building2,
  Shield,
  Loader2,
  ExternalLink,
  Bot,
  Zap,
  Mail,
  Trophy,
  Bell,
  ChevronLeft,
  ChevronRight,
  Crown,
  Play,
} from "lucide-react";

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  companyUrl: string;
  isPremium: boolean;
  isAdmin: boolean;
  createdAt: string;
  company: {
    name: string | null;
    gtmMotion: string | null;
    lastScraped: string | null;
  } | null;
}

interface Analytics {
  totalUsers: number;
  premiumUsers: number;
  analyzedCompanies: number;
  recentUsers: number;
  weeklyUsers: number;
  gtmMotions: Record<string, number>;
  recentSignups: [string, number][];
  totalRecs: number;
  completedRecs: number;
  recsByCategory: Record<string, number>;
}

interface AgentEvent {
  id: number;
  userId: string;
  eventType: string;
  channelId: string | null;
  recommendationId: number | null;
  channel: string;
  sentAt: string;
  userEmail: string;
  userFullName: string;
}

interface AgentEventsData {
  events: AgentEvent[];
  total: number;
  byEventType: Record<string, number>;
  activeProUsersWithAgent: number;
}

const EVENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "milestone_start", label: "Milestone Start" },
  { value: "stall_nudge", label: "Stall Nudge" },
  { value: "completion_congrats", label: "Completion Congrats" },
  { value: "weekly_digest", label: "Weekly Digest" },
];

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
];

function eventTypeLabel(type: string) {
  return EVENT_TYPES.find(e => e.value === type)?.label ?? type;
}

function eventTypeIcon(type: string) {
  switch (type) {
    case "milestone_start": return <Zap className="h-3.5 w-3.5 text-blue-500" />;
    case "stall_nudge": return <Bell className="h-3.5 w-3.5 text-amber-500" />;
    case "completion_congrats": return <Trophy className="h-3.5 w-3.5 text-green-500" />;
    case "weekly_digest": return <Mail className="h-3.5 w-3.5 text-violet-500" />;
    default: return <Bot className="h-3.5 w-3.5 text-slate-400" />;
  }
}

function eventTypeBadgeClass(type: string) {
  switch (type) {
    case "milestone_start": return "bg-blue-50 text-blue-700 border-blue-100";
    case "stall_nudge": return "bg-amber-50 text-amber-700 border-amber-100";
    case "completion_congrats": return "bg-green-50 text-green-700 border-green-100";
    case "weekly_digest": return "bg-violet-50 text-violet-700 border-violet-100";
    default: return "bg-slate-50 text-slate-600 border-slate-100";
  }
}

const PAGE_SIZE = 50;

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const session = getSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"users" | "analytics" | "agent">("analytics");
  const [searchQuery, setSearchQuery] = useState("");

  // Agent tab filters
  const [agentEventType, setAgentEventType] = useState("all");
  const [agentDateRange, setAgentDateRange] = useState("all");
  const [agentPage, setAgentPage] = useState(0);

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Access denied");
        throw new Error("Failed to load users");
      }
      return res.json();
    },
    enabled: !!session,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    enabled: !!session,
  });

  const agentQueryParams = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(agentPage * PAGE_SIZE),
    ...(agentEventType !== "all" && { eventType: agentEventType }),
    ...(agentDateRange !== "all" && {
      since: new Date(Date.now() - parseInt(agentDateRange) * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

  const { data: agentData, isLoading: agentLoading } = useQuery<AgentEventsData>({
    queryKey: ["admin", "agent-events", agentEventType, agentDateRange, agentPage],
    queryFn: async () => {
      const res = await fetch(`/api/admin/agent-events?${agentQueryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load agent events");
      return res.json();
    },
    enabled: !!session && tab === "agent",
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "User deleted", description: "User and all their data have been removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const togglePremiumMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/premium`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to toggle premium");
      }
      return res.json() as Promise<{ isPremium: boolean }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: data.isPremium ? "Pro granted" : "Pro revoked" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [triggeringUser, setTriggeringUser] = useState<string | null>(null);
  const triggerAgentMutation = useMutation({
    mutationFn: async ({ userId, type }: { userId: string; type: string }) => {
      setTriggeringUser(`${userId}:${type}`);
      const res = await fetch(`/api/admin/agent/trigger/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to trigger");
      return json as { message: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "agent-events"] });
      toast({ title: "Agent triggered", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Trigger failed", description: err.message, variant: "destructive" });
    },
    onSettled: () => setTriggeringUser(null),
  });

  const filteredUsers = (users || []).filter(u =>
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.company?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  };

  const topCategories = analytics
    ? Object.entries(analytics.recsByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
    : [];

  const topMotions = analytics
    ? Object.entries(analytics.gtmMotions)
        .sort(([, a], [, b]) => b - a)
    : [];

  const maxSignupsInDay = analytics
    ? Math.max(...analytics.recentSignups.map(([, c]) => c), 1)
    : 1;

  const totalAgentPages = agentData ? Math.ceil(agentData.total / PAGE_SIZE) : 0;

  return (
    <>
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h1 className="text-lg font-semibold font-display">Admin Panel</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={tab === "analytics" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("analytics")}
              data-testid="button-tab-analytics"
            >
              <BarChart3 className="h-4 w-4 mr-1.5" /> Analytics
            </Button>
            <Button
              variant={tab === "users" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("users")}
              data-testid="button-tab-users"
            >
              <Users className="h-4 w-4 mr-1.5" /> Users ({users?.length || 0})
            </Button>
            <Button
              variant={tab === "agent" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("agent")}
              data-testid="button-tab-agent"
            >
              <Bot className="h-4 w-4 mr-1.5" /> Agent
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === "analytics" && (
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : analytics ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-none shadow-md" data-testid="stat-total-users">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                          <p className="text-xs text-muted-foreground">Total Users</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-md" data-testid="stat-weekly-signups">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{analytics.weeklyUsers}</p>
                          <p className="text-xs text-muted-foreground">This Week</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-md" data-testid="stat-analyzed">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-600/5 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{analytics.analyzedCompanies}</p>
                          <p className="text-xs text-muted-foreground">Analyzed</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-md" data-testid="stat-completion">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {analytics.totalRecs > 0
                              ? Math.round((analytics.completedRecs / analytics.totalRecs) * 100)
                              : 0}%
                          </p>
                          <p className="text-xs text-muted-foreground">Recs Completed</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-none shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Signups (Last 30 Days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics.recentSignups.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No signups in this period</p>
                      ) : (
                        <div className="space-y-1" data-testid="chart-signups">
                          {analytics.recentSignups.map(([date, count]) => (
                            <div key={date} className="flex items-center gap-2 text-xs">
                              <span className="w-16 text-muted-foreground shrink-0">{formatShortDate(date)}</span>
                              <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-primary to-violet-500 rounded transition-all"
                                  style={{ width: `${(count / maxSignupsInDay) * 100}%` }}
                                />
                              </div>
                              <span className="w-6 text-right font-medium tabular-nums">{count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          GTM Motions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topMotions.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
                        ) : (
                          <div className="space-y-2" data-testid="chart-gtm-motions">
                            {topMotions.map(([motion, count]) => {
                              const total = Object.values(analytics.gtmMotions).reduce((a, b) => a + b, 0);
                              const pct = Math.round((count / total) * 100);
                              return (
                                <div key={motion} className="flex items-center gap-2 text-sm">
                                  <span className="flex-1 truncate">{motion}</span>
                                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          Top Channels (by Recommendations)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topCategories.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
                        ) : (
                          <div className="flex flex-wrap gap-2" data-testid="chart-categories">
                            {topCategories.map(([cat, count]) => (
                              <Badge key={cat} variant="secondary" className="text-xs">
                                {cat} <span className="ml-1 text-muted-foreground">({count})</span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Card className="border-none shadow-md">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-center">
                      <div>
                        <p className="text-xl font-bold">{analytics.totalRecs}</p>
                        <p className="text-xs text-muted-foreground">Total Recs</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-green-600">{analytics.completedRecs}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold">{analytics.totalRecs - analytics.completedRecs}</p>
                        <p className="text-xs text-muted-foreground">Open</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold">{analytics.recentUsers}</p>
                        <p className="text-xs text-muted-foreground">30-Day Signups</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold">{analytics.premiumUsers}</p>
                        <p className="text-xs text-muted-foreground">Premium</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>

            {usersLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>

                <div className="grid gap-3">
                  {sortedUsers.map((user) => (
                    <Card key={user.id} className="border-none shadow-sm hover:shadow-md transition-shadow" data-testid={`card-user-${user.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{user.fullName}</p>
                              {user.isAdmin && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary">Admin</Badge>
                              )}
                              {user.isPremium && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">Premium</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(user.createdAt)}
                              </span>
                              {user.company?.name && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {user.company.name}
                                </span>
                              )}
                              {user.company?.gtmMotion && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{user.company.gtmMotion}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            {/* Pro toggle */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 px-2 text-xs gap-1 ${user.isPremium ? "text-amber-600 hover:bg-amber-50" : "text-slate-500 hover:bg-slate-100"}`}
                              onClick={() => togglePremiumMutation.mutate(user.id)}
                              disabled={togglePremiumMutation.isPending}
                              title={user.isPremium ? "Revoke Pro" : "Grant Pro"}
                              data-testid={`button-toggle-premium-${user.id}`}
                            >
                              <Crown className="h-3.5 w-3.5" />
                              {user.isPremium ? "Pro" : "Free"}
                            </Button>

                            {/* Agent triggers */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs gap-1 text-blue-600 hover:bg-blue-50"
                              onClick={() => triggerAgentMutation.mutate({ userId: user.id, type: "milestone_start" })}
                              disabled={triggeringUser === `${user.id}:milestone_start`}
                              title="Fire milestone start nudge"
                              data-testid={`button-trigger-milestone-${user.id}`}
                            >
                              {triggeringUser === `${user.id}:milestone_start` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                              Milestone
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs gap-1 text-amber-600 hover:bg-amber-50"
                              onClick={() => triggerAgentMutation.mutate({ userId: user.id, type: "stall_nudge" })}
                              disabled={triggeringUser === `${user.id}:stall_nudge`}
                              title="Fire stall nudge"
                              data-testid={`button-trigger-stall-${user.id}`}
                            >
                              {triggeringUser === `${user.id}:stall_nudge` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                              Stall
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs gap-1 text-violet-600 hover:bg-violet-50"
                              onClick={() => triggerAgentMutation.mutate({ userId: user.id, type: "weekly_digest" })}
                              disabled={triggeringUser === `${user.id}:weekly_digest`}
                              title="Send weekly digest"
                              data-testid={`button-trigger-digest-${user.id}`}
                            >
                              {triggeringUser === `${user.id}:weekly_digest` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                              Digest
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => window.open(user.companyUrl.startsWith("http") ? user.companyUrl : `https://${user.companyUrl}`, "_blank")}
                              data-testid={`button-visit-${user.id}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                            {!user.isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    data-testid={`button-delete-${user.id}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete <strong>{user.fullName}</strong> ({user.email}) and all their data including company analysis, recommendations, and channel insights. This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(user.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "agent" && (
          <div className="space-y-6">
            {agentLoading && !agentData ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-none shadow-md" data-testid="stat-agent-total">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-600/5 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{agentData?.total ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Total Events</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-md" data-testid="stat-agent-pro-users">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 flex items-center justify-center">
                          <Users className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{agentData?.activeProUsersWithAgent ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Pro + Agent On</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-md" data-testid="stat-agent-stall-nudges">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-600/5 flex items-center justify-center">
                          <Bell className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{agentData?.byEventType?.stall_nudge ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Stall Nudges</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-md" data-testid="stat-agent-completions">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{agentData?.byEventType?.completion_congrats ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Completions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Event type breakdown + filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex flex-wrap gap-2" data-testid="agent-event-type-breakdown">
                    {agentData && Object.entries(agentData.byEventType).length > 0
                      ? Object.entries(agentData.byEventType)
                          .sort(([, a], [, b]) => b - a)
                          .map(([type, c]) => (
                            <button
                              key={type}
                              onClick={() => {
                                setAgentEventType(agentEventType === type ? "all" : type);
                                setAgentPage(0);
                              }}
                              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${eventTypeBadgeClass(type)} ${agentEventType === type ? "ring-2 ring-offset-1 ring-primary/40" : "opacity-80 hover:opacity-100"}`}
                              data-testid={`filter-event-type-${type}`}
                            >
                              {eventTypeIcon(type)}
                              {eventTypeLabel(type)}
                              <span className="ml-0.5 font-bold">{c}</span>
                            </button>
                          ))
                      : <p className="text-sm text-muted-foreground">No events yet</p>
                    }
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Select
                      value={agentEventType}
                      onValueChange={(v) => { setAgentEventType(v); setAgentPage(0); }}
                    >
                      <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-agent-event-type">
                        <SelectValue placeholder="Event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={agentDateRange}
                      onValueChange={(v) => { setAgentDateRange(v); setAgentPage(0); }}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-agent-date-range">
                        <SelectValue placeholder="Date range" />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_RANGES.map(r => (
                          <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Events table */}
                <Card className="border-none shadow-md" data-testid="table-agent-events">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      Agent Events
                      {agentData && (
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          — {agentData.total} total
                          {agentEventType !== "all" && ` · filtered by ${eventTypeLabel(agentEventType)}`}
                          {agentDateRange !== "all" && ` · last ${agentDateRange} days`}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {agentLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : !agentData || agentData.events.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No agent events found
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-slate-50/50 text-xs text-muted-foreground">
                                <th className="text-left px-4 py-2.5 font-medium">User</th>
                                <th className="text-left px-4 py-2.5 font-medium">Event Type</th>
                                <th className="text-left px-4 py-2.5 font-medium">Channel</th>
                                <th className="text-left px-4 py-2.5 font-medium">Delivery</th>
                                <th className="text-left px-4 py-2.5 font-medium">Sent</th>
                              </tr>
                            </thead>
                            <tbody>
                              {agentData.events.map((event, idx) => (
                                <tr
                                  key={event.id}
                                  className={`border-b last:border-0 hover:bg-slate-50/60 transition-colors ${idx % 2 === 0 ? "" : "bg-slate-50/30"}`}
                                  data-testid={`row-agent-event-${event.id}`}
                                >
                                  <td className="px-4 py-3">
                                    <div>
                                      <p className="font-medium text-sm leading-tight">{event.userFullName}</p>
                                      <p className="text-xs text-muted-foreground">{event.userEmail}</p>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium ${eventTypeBadgeClass(event.eventType)}`}>
                                      {eventTypeIcon(event.eventType)}
                                      {eventTypeLabel(event.eventType)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-xs text-muted-foreground">
                                      {event.channelId ?? <span className="italic opacity-60">—</span>}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                      {event.channel === "email"
                                        ? <Mail className="h-3 w-3" />
                                        : <Bell className="h-3 w-3" />
                                      }
                                      {event.channel}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDateTime(event.sentAt)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {totalAgentPages > 1 && (
                          <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
                            <span>
                              Page {agentPage + 1} of {totalAgentPages}
                              {" · "}{agentData.total} events
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={agentPage === 0}
                                onClick={() => setAgentPage(p => p - 1)}
                                data-testid="button-agent-prev-page"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={agentPage >= totalAgentPages - 1}
                                onClick={() => setAgentPage(p => p + 1)}
                                data-testid="button-agent-next-page"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </main>
    </div>
    </>
  );
}
