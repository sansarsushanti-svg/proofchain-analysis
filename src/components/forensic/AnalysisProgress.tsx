import type { AnalysisStage } from "@/lib/forensics/types";
import { cn } from "@/lib/utils";
import { Check, Loader2, Circle } from "lucide-react";

interface AnalysisProgressProps {
  stages: AnalysisStage[];
  currentStageIndex: number;
}

export function AnalysisProgress({ stages, currentStageIndex }: AnalysisProgressProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="border-3 border-border bg-card p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-foreground flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-background animate-spin" />
            </div>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-wider">
            Forensic Analysis in Progress
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Running multi-module integrity analysis...
          </p>
        </div>

        {/* Stages */}
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex;
            const isPending = index > currentStageIndex;

            return (
              <div
                key={stage.id}
                className={cn(
                  "flex items-center gap-4 p-4 border-2 transition-all",
                  isActive && "border-foreground bg-muted animate-progress-pulse",
                  isCompleted && "border-emerald-500 bg-emerald-50",
                  isPending && "border-border bg-card opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 flex items-center justify-center border-2 shrink-0",
                    isActive && "bg-foreground text-background border-foreground",
                    isCompleted && "bg-emerald-500 text-white border-emerald-500",
                    isPending && "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {isCompleted && <Check className="w-4 h-4" />}
                  {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isPending && <Circle className="w-3 h-3" />}
                </div>

                <div className="flex-1">
                  <p
                    className={cn(
                      "text-sm font-bold uppercase tracking-wider",
                      isActive && "text-foreground",
                      isCompleted && "text-emerald-700",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {stage.label}
                  </p>
                </div>

                <div className="text-xs font-bold uppercase tracking-wider">
                  {isCompleted && <span className="text-emerald-600">Done</span>}
                  {isActive && <span className="text-foreground">Running</span>}
                  {isPending && <span className="text-muted-foreground">Pending</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-3 border-2 border-border bg-muted overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-500 ease-out"
            style={{
              width: `${((currentStageIndex + 1) / stages.length) * 100}%`,
            }}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3 uppercase tracking-wider">
          Stage {Math.min(currentStageIndex + 1, stages.length)} of {stages.length}
        </p>
      </div>
    </div>
  );
}
