import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Loader2, PieChart, RefreshCw, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? match[1] : "";
}

interface Allocation {
  channelId: string;
  channelName: string;
  amount: number;
  percentage: number;
  rationale: string;
  expectedROI?: string;
  timeToImpact?: string;
  benchmarkCPL?: string;
  keyMetrics?: string[];
  firstMonthActions?: string[];
}

interface BudgetAllocationData {
  id: number;
  companyId: number;
  totalBudget: number;
  allocations: Allocation[];
  createdAt: string;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6"
];

export function BudgetAllocator() {
  const [budgetInput, setBudgetInput] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: savedAllocation, isLoading: loadingSaved } = useQuery<BudgetAllocationData | null>({
    queryKey: ["/api/budget/latest"],
    queryFn: async () => {
      const res = await fetch("/api/budget/latest", { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.allocations) {
        setAllocations(data.allocations);
        setTotalBudget(data.totalBudget);
        setBudgetInput(data.totalBudget.toString());
      }
      return data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (budget: number) => {
      const res = await fetch("/api/budget/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({ totalBudget: budget }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }
      return res.json();
    },
    onSuccess: (data: BudgetAllocationData) => {
      setAllocations(data.allocations);
      setTotalBudget(data.totalBudget);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/budget/latest"] });
      toast({ title: "Budget allocated!", description: "AI has recommended your channel spending" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/budget/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({ totalBudget, allocations }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/budget/latest"] });
      toast({ title: "Budget saved!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleGenerate() {
    const budget = parseInt(budgetInput);
    if (isNaN(budget) || budget < 100) {
      toast({ title: "Invalid budget", description: "Enter a budget of at least $100", variant: "destructive" });
      return;
    }
    generateMutation.mutate(budget);
  }

  function handleSliderChange(index: number, newPercentage: number) {
    const updated = [...allocations];
    const diff = newPercentage - updated[index].percentage;
    updated[index].percentage = newPercentage;
    updated[index].amount = Math.round(totalBudget * newPercentage / 100);

    const others = updated.filter((_, i) => i !== index && updated[i].percentage > 0);
    const totalOtherPct = others.reduce((s, a) => s + a.percentage, 0);
    if (totalOtherPct > 0) {
      for (let i = 0; i < updated.length; i++) {
        if (i !== index && updated[i].percentage > 0) {
          const share = updated[i].percentage / totalOtherPct;
          updated[i].percentage = Math.max(0, Math.round((updated[i].percentage - diff * share) * 10) / 10);
          updated[i].amount = Math.round(totalBudget * updated[i].percentage / 100);
        }
      }
    }

    setAllocations(updated);
    setHasChanges(true);
  }

  const chartData = allocations
    .filter(a => a.percentage > 0)
    .map(a => ({ name: a.channelName, value: a.amount, percentage: a.percentage }));

  const allocatedTotal = allocations.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="space-y-6" data-testid="budget-allocator">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            AI Budget Allocator
          </CardTitle>
          <CardDescription>
            Enter your monthly marketing budget and get AI-recommended allocation across all channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Monthly budget (e.g. 5000)"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                className="pl-8"
                data-testid="input-budget"
                min={100}
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !budgetInput}
              data-testid="button-generate-budget"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : allocations.length > 0 ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              ) : (
                "Allocate Budget"
              )}
            </Button>
            {hasChanges && (
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                data-testid="button-save-budget"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {allocations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Allocation Breakdown
              </CardTitle>
              <CardDescription>
                Total: ${allocatedTotal.toLocaleString()} of ${totalBudget.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [
                        `$${value.toLocaleString()}`,
                        name,
                      ]}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value: string, entry: any) => (
                        <span className="text-xs">
                          {value} ({entry.payload?.percentage?.toFixed(0)}%)
                        </span>
                      )}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channel Allocations</CardTitle>
              <CardDescription>Adjust sliders to customize your budget split</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {allocations.map((alloc, index) => (
                <div key={alloc.channelId} className="space-y-1.5" data-testid={`allocation-${alloc.channelId}`}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-medium">{alloc.channelName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums">${alloc.amount.toLocaleString()}</span>
                      <span className="text-muted-foreground text-xs tabular-nums w-10 text-right">
                        {alloc.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <Slider
                    value={[alloc.percentage]}
                    max={100}
                    step={1}
                    onValueChange={([v]) => handleSliderChange(index, v)}
                    className="cursor-pointer"
                    data-testid={`slider-${alloc.channelId}`}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xs text-muted-foreground line-clamp-1 cursor-help">
                        <Info className="h-3 w-3 inline mr-1" />
                        {alloc.rationale}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-md">
                      <div className="space-y-2 text-xs">
                        <p>{alloc.rationale}</p>
                        {(alloc.expectedROI || alloc.timeToImpact || alloc.benchmarkCPL) && (
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                            {alloc.expectedROI && (
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-[11px] font-medium">ROI: {alloc.expectedROI}</span>
                            )}
                            {alloc.timeToImpact && (
                              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded text-[11px] font-medium">Impact: {alloc.timeToImpact}</span>
                            )}
                            {alloc.benchmarkCPL && (
                              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded text-[11px] font-medium">CPL: {alloc.benchmarkCPL}</span>
                            )}
                          </div>
                        )}
                        {alloc.firstMonthActions && alloc.firstMonthActions.length > 0 && (
                          <div className="pt-1 border-t border-border/50">
                            <p className="font-semibold mb-1">Month 1 Actions:</p>
                            <ul className="list-disc pl-3 space-y-0.5">
                              {alloc.firstMonthActions.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  {alloc.amount > 0 && (alloc.expectedROI || alloc.timeToImpact) && (
                    <div className="flex gap-2 mt-0.5">
                      {alloc.expectedROI && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">↗ {alloc.expectedROI} ROI</span>
                      )}
                      {alloc.timeToImpact && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">⏱ {alloc.timeToImpact}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {loadingSaved && !allocations.length && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
