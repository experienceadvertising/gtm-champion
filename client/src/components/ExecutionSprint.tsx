import { CalendarDays, CheckCircle2, ChevronRight, Circle, Sparkles, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChannelInsight, Recommendation } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

type SprintRecommendation = Recommendation & { category: string };

interface ExecutionSprintProps {
  companyId: number;
  recommendations: SprintRecommendation[];
  channelInsights: ChannelInsight[];
  topChannelIds: string[];
  onStart: (recommendation: SprintRecommendation) => void;
  onViewChannel: (channelId: string) => void;
}

export function selectSprintTasks(
  recommendations: SprintRecommendation[],
  topChannelIds: string[],
): SprintRecommendation[] {
  const rank = (recommendation: SprintRecommendation) => {
    const statusRank = recommendation.status === "In Progress" ? 0 : recommendation.status === "New" ? 1 : 2;
    const impactRank = recommendation.impact === "High" ? 0 : recommendation.impact === "Medium" ? 1 : 2;
    const topChannelIndex = topChannelIds.indexOf(recommendation.category);
    const channelRank = topChannelIndex === -1 ? 100 : topChannelIndex;
    return [statusRank, channelRank, impactRank, recommendation.id] as const;
  };

  return recommendations
    .filter(recommendation => recommendation.status !== "Completed")
    .sort((a, b) => {
      const left = rank(a);
      const right = rank(b);
      for (let index = 0; index < left.length; index++) {
        if (left[index] !== right[index]) return left[index] - right[index];
      }
      return 0;
    })
    .slice(0, 3);
}

export function ExecutionSprint({
  companyId,
  recommendations,
  channelInsights,
  topChannelIds,
  onStart,
  onViewChannel,
}: ExecutionSprintProps) {
  const tasks = selectSprintTasks(recommendations, topChannelIds);
  const started = tasks.filter(task => task.status === "In Progress").length;
  const channelInsight = (channelId: string) => channelInsights.find(insight => insight.channelId === channelId);
  const phases = [
    { label: "Start today", helper: "Choose one task and make it active." },
    { label: "Build this week", helper: "Set up the inputs that make the work repeatable." },
    { label: "Review by day 30", helper: "Use results to decide what to scale, adjust, or stop." },
  ];

  if (!tasks.length) return null;

  return (
    <section aria-labelledby="execution-sprint-heading" data-testid="section-execution-sprint">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-white to-violet-50/70 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Target className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Your operating plan</Badge>
                  <span className="text-xs text-muted-foreground">30 days</span>
                </div>
                <CardTitle id="execution-sprint-heading" className="font-display text-xl">Turn strategy into a weekly marketing sprint</CardTitle>
                <CardDescription className="mt-1 max-w-2xl">
                  Start one high-value action, measure a real signal, then let the next decision come from evidence instead of guesswork.
                </CardDescription>
              </div>
            </div>
            <div className="rounded-lg border border-primary/15 bg-white/80 px-3 py-2 text-sm">
              <span className="font-semibold text-primary">{started}</span> of {tasks.length} priorities active
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {phases.map((phase, index) => {
              const task = tasks[index];
              const insight = task ? channelInsight(task.category) : undefined;
              const measurement = insight?.topKpis?.[0] || "A meaningful business outcome for this channel";
              const evidenceCount = insight?.strategyMeta?.evidence?.length || 0;
              if (!task) return null;

              return (
                <div key={phase.label} className="rounded-xl border border-slate-200/80 bg-white/85 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-primary">{phase.label}</span>
                    <Badge variant="outline" className="text-[10px]">{task.category}</Badge>
                  </div>
                  <p className="text-sm font-semibold leading-snug">{task.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex items-start gap-2 text-slate-600">
                      <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <span><strong>Measure:</strong> {measurement}</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-600">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <span>{evidenceCount ? `${evidenceCount} evidence points support this channel strategy.` : "Validate the key assumptions before scaling spend."}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {task.status === "New" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          trackEvent("execution_sprint_started", { company_id: companyId, channel: task.category, recommendation_id: task.id });
                          onStart(task);
                        }}
                        data-testid={`button-sprint-start-${task.id}`}
                      >
                        <Circle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Start task
                      </Button>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> In progress
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        trackEvent("execution_sprint_channel_viewed", { company_id: companyId, channel: task.category });
                        onViewChannel(task.category);
                      }}
                      data-testid={`button-sprint-channel-${task.id}`}
                    >
                      See evidence <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Run this sprint for 30 days. Keep what moves a real KPI and replace work that does not create signal.</span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
