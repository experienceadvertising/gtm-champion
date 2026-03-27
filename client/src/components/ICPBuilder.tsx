import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Loader2, ChevronDown, ChevronUp, Pencil, Check, X, Plus, Trash2, Sparkles, Briefcase, MapPin, Target, ShoppingCart, MessageSquare, AlertTriangle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? match[1] : "";
}

interface BuyerPersona {
  id: number;
  companyId: number;
  name: string;
  jobTitle: string;
  seniority: string;
  department: string;
  companySizeRange: string;
  industryVerticals: string[];
  geographicFocus: string;
  painPoints: string[];
  goals: string[];
  buyingTriggers: string[];
  preferredChannels: string[];
  objections: string[];
  dayInTheLife: string;
  messagingAngle?: string;
  contentPreferences?: string[];
  buyerJourneyStage?: { awareness?: string; consideration?: string; decision?: string };
  internalChampionTips?: string;
  socialProofNeeded?: string;
  createdAt: string;
}

const PERSONA_COLORS = [
  { bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-200 dark:border-indigo-800", accent: "text-indigo-600 dark:text-indigo-400" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800", accent: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800", accent: "text-amber-600 dark:text-amber-400" },
  { bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-800", accent: "text-rose-600 dark:text-rose-400" },
];

export function ICPBuilder() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: personas = [], isLoading } = useQuery<BuyerPersona[]>({
    queryKey: ["/api/personas"],
    queryFn: async () => {
      const res = await fetch("/api/personas", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
      toast({ title: "Personas generated!", description: "AI created detailed buyer personas for your company" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/personas/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": getCsrfToken() },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
      toast({ title: "Persona removed" });
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/personas/add", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({}),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    },
    onSuccess: (persona: BuyerPersona) => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
      setExpandedId(persona.id);
      toast({ title: "New persona added" });
    },
  });

  return (
    <div className="space-y-6" data-testid="icp-builder">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            ICP Builder
          </CardTitle>
          <CardDescription>
            AI-generated buyer personas with detailed firmographic, psychographic, and behavioral attributes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-generate-personas"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating personas...
                </>
              ) : personas.length > 0 ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Regenerate Personas
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Buyer Personas
                </>
              )}
            </Button>
            {personas.length > 0 && (
              <Button
                variant="outline"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending}
                data-testid="button-add-persona"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Persona
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {personas.map((persona, index) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            colorScheme={PERSONA_COLORS[index % PERSONA_COLORS.length]}
            expanded={expandedId === persona.id}
            onToggle={() => setExpandedId(expandedId === persona.id ? null : persona.id)}
            onDelete={() => deleteMutation.mutate(persona.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PersonaCard({
  persona,
  colorScheme,
  expanded,
  onToggle,
  onDelete,
}: {
  persona: BuyerPersona;
  colorScheme: typeof PERSONA_COLORS[0];
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const res = await fetch(`/api/personas/${persona.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  return (
    <Card className={`${colorScheme.border} ${colorScheme.bg}`} data-testid={`persona-card-${persona.id}`}>
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <CardHeader className="cursor-pointer pb-3" onClick={onToggle}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-lg font-bold ${colorScheme.accent}`}>
                {persona.name.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-base">{persona.name}</CardTitle>
                <CardDescription className="text-sm">{persona.jobTitle} · {persona.seniority}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{persona.department}</Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={e => { e.stopPropagation(); onDelete(); }}
                aria-label="Delete persona"
                data-testid={`button-delete-persona-${persona.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Toggle details">
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="text-xs"><Briefcase className="h-3 w-3 mr-1" />{persona.companySizeRange}</Badge>
            <Badge variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" />{persona.geographicFocus}</Badge>
            {persona.industryVerticals.slice(0, 2).map(v => (
              <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
            ))}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <EditableListSection
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              title="Pain Points"
              items={persona.painPoints}
              onSave={items => updateMutation.mutate({ painPoints: items })}
            />
            <EditableListSection
              icon={<Target className="h-4 w-4 text-green-500" />}
              title="Goals & Motivations"
              items={persona.goals}
              onSave={items => updateMutation.mutate({ goals: items })}
            />
            <EditableListSection
              icon={<ShoppingCart className="h-4 w-4 text-blue-500" />}
              title="Buying Triggers"
              items={persona.buyingTriggers}
              onSave={items => updateMutation.mutate({ buyingTriggers: items })}
            />
            <EditableListSection
              icon={<MessageSquare className="h-4 w-4 text-purple-500" />}
              title="Preferred Channels"
              items={persona.preferredChannels}
              onSave={items => updateMutation.mutate({ preferredChannels: items })}
            />
            <EditableListSection
              icon={<X className="h-4 w-4 text-orange-500" />}
              title="Common Objections"
              items={persona.objections}
              onSave={items => updateMutation.mutate({ objections: items })}
            />

            <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Day in the Life</span>
              </div>
              <EditableText
                value={persona.dayInTheLife}
                onSave={text => updateMutation.mutate({ dayInTheLife: text })}
                multiline
              />
            </div>

            {/* Messaging Angle */}
            {persona.messagingAngle && (
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg p-3 border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium">Key Messaging Angle</span>
                </div>
                <EditableText
                  value={persona.messagingAngle}
                  onSave={text => updateMutation.mutate({ messagingAngle: text })}
                  multiline
                />
              </div>
            )}

            {/* Content Preferences */}
            {persona.contentPreferences && persona.contentPreferences.length > 0 && (
              <EditableListSection
                icon={<BookOpen className="h-4 w-4 text-cyan-500" />}
                title="Content Preferences"
                items={persona.contentPreferences}
                onSave={items => updateMutation.mutate({ contentPreferences: items })}
              />
            )}

            {/* Buyer Journey */}
            {persona.buyerJourneyStage && (persona.buyerJourneyStage.awareness || persona.buyerJourneyStage.consideration || persona.buyerJourneyStage.decision) && (
              <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-medium">Buyer Journey</span>
                </div>
                <div className="space-y-2.5">
                  {persona.buyerJourneyStage.awareness && (
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded shrink-0 h-fit mt-0.5">Awareness</span>
                      <p className="text-xs text-muted-foreground">{persona.buyerJourneyStage.awareness}</p>
                    </div>
                  )}
                  {persona.buyerJourneyStage.consideration && (
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded shrink-0 h-fit mt-0.5">Evaluation</span>
                      <p className="text-xs text-muted-foreground">{persona.buyerJourneyStage.consideration}</p>
                    </div>
                  )}
                  {persona.buyerJourneyStage.decision && (
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-500 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded shrink-0 h-fit mt-0.5">Decision</span>
                      <p className="text-xs text-muted-foreground">{persona.buyerJourneyStage.decision}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Internal Champion Tips */}
            {persona.internalChampionTips && (
              <div className="bg-green-50/50 dark:bg-green-950/20 rounded-lg p-3 border border-green-100 dark:border-green-900/50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">How to Build an Internal Champion</span>
                </div>
                <EditableText
                  value={persona.internalChampionTips}
                  onSave={text => updateMutation.mutate({ internalChampionTips: text })}
                  multiline
                />
              </div>
            )}

            {/* Social Proof Needed */}
            {persona.socialProofNeeded && (
              <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-100 dark:border-amber-900/50">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Social Proof That Converts</span>
                </div>
                <EditableText
                  value={persona.socialProofNeeded}
                  onSave={text => updateMutation.mutate({ socialProofNeeded: text })}
                  multiline
                />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function EditableListSection({
  icon,
  title,
  items,
  onSave,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  onSave: (items: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<string[]>([]);

  function startEdit() {
    setEditItems([...items]);
    setEditing(true);
  }

  function save() {
    onSave(editItems.filter(i => i.trim()));
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={save} aria-label="Save">
              <Check className="h-3 w-3 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancel} aria-label="Cancel">
              <X className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          {editItems.map((item, i) => (
            <div key={i} className="flex gap-1.5">
              <Input
                value={item}
                onChange={e => {
                  const updated = [...editItems];
                  updated[i] = e.target.value;
                  setEditItems(updated);
                }}
                className="h-7 text-xs"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => setEditItems(editItems.filter((_, j) => j !== i))}
                aria-label="Remove item"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
            onClick={() => setEditItems([...editItems, ""])}
          >
            <Plus className="h-3 w-3 mr-1" />Add
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={startEdit} aria-label={`Edit ${title}`}>
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
            <span className="mt-1 w-1 h-1 bg-muted-foreground rounded-full shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditableText({
  value,
  onSave,
  multiline = false,
}: {
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  if (editing) {
    return (
      <div className="space-y-2">
        {multiline ? (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full text-xs rounded-md border p-2 bg-background min-h-[60px] resize-y"
          />
        ) : (
          <Input value={text} onChange={e => setText(e.target.value)} className="h-7 text-xs" />
        )}
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { onSave(text); setEditing(false); }}>
            <Check className="h-3 w-3 mr-1" />Save
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setText(value); setEditing(false); }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <p
      className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
      onClick={() => { setText(value); setEditing(true); }}
    >
      {value}
      <Pencil className="h-3 w-3 inline ml-1 opacity-0 group-hover:opacity-100" />
    </p>
  );
}
