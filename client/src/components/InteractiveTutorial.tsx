import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ChevronRight, ChevronLeft, LayoutDashboard, Zap, 
  MessageSquare, Lightbulb, PenTool, BarChart3, Sparkles, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ElementType;
  targetSelector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to GTM Champion!",
    description: "Let's take a quick tour of your personalized GTM dashboard. We'll show you where everything is and how to get the most out of your strategy.",
    icon: Sparkles,
    position: "center",
  },
  {
    title: "Channel Strategy",
    description: "Your sidebar shows all 13 marketing channels. Click any channel to see tailored strategies, key metrics, and specific action items for that channel.",
    icon: LayoutDashboard,
    targetSelector: "[data-tour='sidebar-channels']",
    position: "right",
  },
  {
    title: "High-Impact Tasks",
    description: "These are your most impactful action items. Click the circle to mark tasks as complete, or use the menu to change status. Focus on these first for maximum results.",
    icon: Zap,
    targetSelector: "[data-tour='high-impact-tasks']",
    position: "bottom",
  },
  {
    title: "AI Advisor",
    description: "Ask the AI advisor anything about your GTM strategy. It knows your company context and can help with specific marketing questions, campaign ideas, or channel advice.",
    icon: MessageSquare,
    targetSelector: "[data-tour='ai-advisor']",
    position: "bottom",
  },
  {
    title: "Weekly Content Sprints",
    description: "Fresh content ideas generated for your business each week. Each sprint includes step-by-step execution plans so you can take action immediately.",
    icon: Lightbulb,
    targetSelector: "[data-tour='content-sprints']",
    position: "top",
  },
  {
    title: "Content Tools",
    description: "Generate LinkedIn posts, email campaigns, and blog articles tailored to your company — all powered by AI. Find this in the sidebar.",
    icon: PenTool,
    targetSelector: "[data-tour='content-tools']",
    position: "right",
  },
  {
    title: "Re-analyze Anytime",
    description: "Updated your website? Click 'Re-analyze Website' to refresh your entire strategy with the latest data. Your dashboard will update with new recommendations.",
    icon: BarChart3,
    targetSelector: "[data-tour='reanalyze']",
    position: "bottom",
  },
];

const STORAGE_KEY_PREFIX = "gtm_tutorial_completed";

function getStorageKey(userId?: string) {
  return userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
}

export function InteractiveTutorial({ onComplete, userId }: { onComplete?: () => void; userId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const storageKey = getStorageKey(userId);

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const updateHighlight = useCallback(() => {
    const step = TUTORIAL_STEPS[currentStep];
    if (step.targetSelector) {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        const style = window.getComputedStyle(el);
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
        if (isVisible) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          setTimeout(() => {
            const rect = el.getBoundingClientRect();
            const maxHighlightHeight = Math.min(rect.height, window.innerHeight * 0.35);
            setHighlightRect(new DOMRect(rect.left, rect.top, rect.width, maxHighlightHeight));
          }, 400);
          return;
        }
      }
    }
    setHighlightRect(null);
  }, [currentStep]);

  useEffect(() => {
    if (isOpen) {
      updateHighlight();
      window.addEventListener("resize", updateHighlight);
      return () => window.removeEventListener("resize", updateHighlight);
    }
  }, [isOpen, currentStep, updateHighlight]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(storageKey, "true");
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.querySelector('main')?.scrollTo({ top: 0, behavior: "smooth" });
    onComplete?.();
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;
  const isCenter = step.position === "center" || !highlightRect;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  const getTooltipPosition = (): React.CSSProperties => {
    if (isCenter || !highlightRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const gap = 16;
    const tooltipWidth = 380;
    const tooltipHeight = 320;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const spaceAbove = highlightRect.top;
    const spaceBelow = viewportH - highlightRect.bottom;
    const spaceRight = viewportW - highlightRect.right;
    const spaceLeft = highlightRect.left;

    let top = 0;
    let left = 0;
    let bestPosition = step.position || "bottom";

    if (bestPosition === "bottom" && spaceBelow < tooltipHeight + gap) {
      bestPosition = spaceAbove > spaceBelow ? "top" : "right";
    }
    if (bestPosition === "top" && spaceAbove < tooltipHeight + gap) {
      bestPosition = spaceBelow > spaceAbove ? "bottom" : "right";
    }
    if (bestPosition === "right" && spaceRight < tooltipWidth + gap) {
      bestPosition = spaceLeft > spaceRight ? "left" : "bottom";
    }

    const clampedTop = Math.min(highlightRect.top, viewportH - tooltipHeight - gap);

    switch (bestPosition) {
      case "bottom":
        top = Math.min(highlightRect.bottom + gap, viewportH - tooltipHeight - gap);
        left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
        break;
      case "top":
        top = Math.max(gap, highlightRect.top - tooltipHeight - gap);
        left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
        break;
      case "right":
        top = Math.max(gap, clampedTop);
        left = highlightRect.right + gap;
        break;
      case "left":
        top = Math.max(gap, clampedTop);
        left = Math.max(gap, highlightRect.left - tooltipWidth - gap);
        break;
    }

    left = Math.max(gap, Math.min(left, viewportW - tooltipWidth - gap));
    top = Math.max(gap, Math.min(top, viewportH - tooltipHeight - gap));

    return { top, left };
  };

  return (
    <AnimatePresence>
      <div ref={overlayRef} className="fixed inset-0 z-[9999]" data-testid="tutorial-overlay">
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id="tutorial-mask">
              <rect width="100%" height="100%" fill="white" />
              {highlightRect && (
                <rect
                  x={highlightRect.left - 8}
                  y={highlightRect.top - 8}
                  width={highlightRect.width + 16}
                  height={highlightRect.height + 16}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#tutorial-mask)"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          />
        </svg>

        {highlightRect && (
          <div
            className="absolute border-2 border-primary rounded-xl pointer-events-none"
            style={{
              left: highlightRect.left - 8,
              top: highlightRect.top - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              boxShadow: "0 0 0 4px rgba(99, 102, 241, 0.2), 0 0 20px rgba(99, 102, 241, 0.15)",
            }}
          >
            <div className="absolute inset-0 rounded-xl animate-pulse border-2 border-primary/30" />
          </div>
        )}

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute z-10 w-[380px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] flex flex-col"
          style={getTooltipPosition()}
          data-testid="tutorial-tooltip"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[calc(100vh-32px)]">
            <div className="bg-gradient-to-r from-primary/10 via-violet-500/8 to-purple-500/5 px-5 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-md">
                    <StepIcon className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{step.title}</h3>
                    <span className="text-[11px] text-muted-foreground">
                      Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-white/60"
                  onClick={handleClose}
                  data-testid="button-tutorial-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
              <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
            </div>

            <div className="px-5 pb-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5">
                {TUTORIAL_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStep
                        ? "w-6 bg-primary"
                        : idx < currentStep
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-slate-200"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {currentStep === 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-slate-700"
                    onClick={handleSkip}
                    data-testid="button-tutorial-skip"
                  >
                    Skip tour
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={handlePrev}
                    data-testid="button-tutorial-prev"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Back
                  </Button>
                )}
                <Button
                  size="sm"
                  className="text-xs bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 shadow-md"
                  onClick={handleNext}
                  data-testid="button-tutorial-next"
                >
                  {isLast ? (
                    <>
                      Get Started
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function useTutorial(userId?: string) {
  const resetTutorial = useCallback(() => {
    localStorage.removeItem(getStorageKey(userId));
    localStorage.removeItem(STORAGE_KEY_PREFIX);
    window.location.reload();
  }, [userId]);

  return { resetTutorial };
}
