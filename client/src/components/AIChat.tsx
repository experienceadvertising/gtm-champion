import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Bot
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { askAI } from "@/lib/api";

interface AIChatProps {
  userId: string;
  companyName: string;
  channelId?: string;
  variant?: "default" | "compact";
}

const DASHBOARD_EXAMPLES = [
  "What's the best channel to focus on first for my business?",
  "How can I generate more qualified leads this quarter?",
  "What content should I create to attract my ideal customers?",
  "How do I improve my conversion rate?",
];

const getChannelExamples = (channelId: string, companyName: string): string[] => {
  const examples: Record<string, string[]> = {
    "SEO": [
      `What keywords should ${companyName} target first?`,
      "How do I improve my domain authority quickly?",
      "What's the best content strategy for our SEO?",
      "How long until we see SEO results?",
    ],
    "LLMs": [
      `How can ${companyName} optimize for AI search?`,
      "What structured data should we implement?",
      "How do we get featured in ChatGPT responses?",
      "What's Answer Engine Optimization?",
    ],
    "Paid Search": [
      `What's a good Google Ads budget for ${companyName}?`,
      "Should we bid on competitor keywords?",
      "How do we reduce our cost per click?",
      "What conversion rate should we aim for?",
    ],
    "Paid Social": [
      `Which platform is best for ${companyName}'s B2B advertising?`,
      "What ad formats work best on LinkedIn?",
      "How much should we spend on LinkedIn ads?",
      "What's a good click-through rate for B2B?",
    ],
    "Organic Social": [
      `How often should ${companyName} post on LinkedIn?`,
      "What type of content gets the most engagement?",
      "Should we use video or text posts?",
      "How do we build a following from scratch?",
    ],
    "Retargeting": [
      `What's the ideal retargeting window for ${companyName}?`,
      "How do we set up a retargeting pixel?",
      "What offers work best for retargeting?",
      "How much budget should go to retargeting?",
    ],
    "CRO": [
      `What should ${companyName} A/B test first?`,
      "How do we reduce cart abandonment?",
      "What makes a high-converting landing page?",
      "How do we improve our demo request rate?",
    ],
    "Email Marketing": [
      `What's a good email open rate for ${companyName}?`,
      "How often should we email our list?",
      "What subject lines get the best results?",
      "How do we segment our email list effectively?",
    ],
    "Content": [
      `What topics should ${companyName} write about?`,
      "How long should our blog posts be?",
      "Should we gate our content behind forms?",
      "How do we repurpose content effectively?",
    ],
    "Community": [
      `How does ${companyName} start building a community?`,
      "What platform is best for B2B communities?",
      "How do we keep community members engaged?",
      "Should we charge for community access?",
    ],
    "ABM": [
      `How many accounts should ${companyName} target?`,
      "What signals indicate buying intent?",
      "How do we personalize outreach at scale?",
      "What's a good ABM tech stack for us?",
    ],
    "Partnerships": [
      `How does ${companyName} find the right partners?`,
      "What should we offer partners?",
      "How do we structure partner agreements?",
      "What metrics should we track for partnerships?",
    ],
    "Outbound": [
      `What makes a great cold email for ${companyName}?`,
      "How many touchpoints before giving up?",
      "What's a good reply rate to aim for?",
      "How do we find prospect email addresses?",
    ],
  };
  
  return examples[channelId] || [
    `What's the best ${channelId} strategy for ${companyName}?`,
    `How do we get started with ${channelId}?`,
    `What metrics should we track for ${channelId}?`,
    `What quick wins can we achieve in ${channelId}?`,
  ];
};

export function AIChat({ userId, companyName, channelId, variant = "default" }: AIChatProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showExamples, setShowExamples] = useState(true);

  useEffect(() => {
    setQuestion("");
    setAnswer(null);
    setShowExamples(true);
  }, [channelId]);

  const examples = channelId 
    ? getChannelExamples(channelId, companyName) 
    : DASHBOARD_EXAMPLES;

  const chatMutation = useMutation({
    mutationFn: async (q: string) => {
      const response = await askAI(userId, q, channelId);
      return response.answer;
    },
    onSuccess: (data) => {
      setAnswer(data);
      setShowExamples(false);
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || chatMutation.isPending) return;
    chatMutation.mutate(question.trim());
  };

  const handleExampleClick = (example: string) => {
    setQuestion(example);
    chatMutation.mutate(example);
  };

  const handleNewQuestion = () => {
    setQuestion("");
    setAnswer(null);
    setShowExamples(true);
  };

  if (variant === "compact") {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader 
          className="cursor-pointer pb-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">Ask AI</CardTitle>
                <p className="text-xs text-muted-foreground">Get personalized advice</p>
              </div>
            </div>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="pt-0">
                <ChatContent
                  question={question}
                  setQuestion={setQuestion}
                  answer={answer}
                  examples={examples}
                  showExamples={showExamples}
                  isPending={chatMutation.isPending}
                  error={chatMutation.error}
                  onSubmit={handleSubmit}
                  onExampleClick={handleExampleClick}
                  onNewQuestion={handleNewQuestion}
                  companyName={companyName}
                  channelId={channelId}
                />
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shadow-sm">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Ask GTM Champion AI
              <Badge variant="secondary" className="text-xs">Beta</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Get personalized GTM advice for {companyName}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChatContent
          question={question}
          setQuestion={setQuestion}
          answer={answer}
          examples={examples}
          showExamples={showExamples}
          isPending={chatMutation.isPending}
          error={chatMutation.error}
          onSubmit={handleSubmit}
          onExampleClick={handleExampleClick}
          onNewQuestion={handleNewQuestion}
          companyName={companyName}
          channelId={channelId}
        />
      </CardContent>
    </Card>
  );
}

interface ChatContentProps {
  question: string;
  setQuestion: (q: string) => void;
  answer: string | null;
  examples: string[];
  showExamples: boolean;
  isPending: boolean;
  error: Error | null;
  onSubmit: (e?: React.FormEvent) => void;
  onExampleClick: (example: string) => void;
  onNewQuestion: () => void;
  companyName: string;
  channelId?: string;
}

function ChatContent({
  question,
  setQuestion,
  answer,
  examples,
  showExamples,
  isPending,
  error,
  onSubmit,
  onExampleClick,
  onNewQuestion,
  companyName,
  channelId,
}: ChatContentProps) {
  return (
    <div className="space-y-4">
      {showExamples && !answer && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {channelId ? `${channelId} Questions` : "Popular Questions"}
          </p>
          <div className="grid gap-2">
            {examples.map((example, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                onClick={() => onExampleClick(example)}
                disabled={isPending}
                data-testid={`button-example-${i}`}
              >
                <MessageSquare className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="text-sm">{example}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {answer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="bg-slate-50 rounded-lg p-3 border-l-2 border-primary/30">
            <p className="text-xs text-muted-foreground mb-1">Your question:</p>
            <p className="text-sm font-medium">{question}</p>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
            <div className="flex items-start gap-2 mb-2">
              <Bot className="h-4 w-4 text-primary mt-0.5" />
              <p className="text-xs text-primary font-medium">AI Response for {companyName}</p>
            </div>
            <div className="prose prose-sm max-w-none text-slate-700">
              {answer.split('\n').map((paragraph, i) => (
                paragraph.trim() && <p key={i} className="mb-2 last:mb-0">{paragraph}</p>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onNewQuestion}
            className="w-full"
            data-testid="button-new-question"
          >
            Ask Another Question
          </Button>
        </motion.div>
      )}

      {!answer && (
        <form onSubmit={onSubmit} className="space-y-2">
          <div className="relative">
            <Textarea
              placeholder={`Ask anything about ${channelId ? channelId + ' strategy' : 'your GTM strategy'}...`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[80px] pr-12 resize-none"
              disabled={isPending}
              data-testid="input-ai-question"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute bottom-2 right-2"
              disabled={!question.trim() || isPending}
              data-testid="button-send-question"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-500" data-testid="text-chat-error">
              {error.message}
            </p>
          )}
        </form>
      )}

      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Thinking about your question...</span>
        </div>
      )}
    </div>
  );
}
