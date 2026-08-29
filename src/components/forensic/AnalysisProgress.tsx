import type { AnalysisStage } from "@/lib/forensics/types";
import { cn } from "@/lib/utils";
import { Check, Loader2, Circle } from "lucide-react";

interface AnalysisProgressProps {
  stages: AnalysisStage[];
  currentStageIndex: number;
}

export function AnalysisProgress({
  stages,
  currentStageIndex,
}: AnalysisProgressProps) {
  return (
    <div className="w-full border border-border bg-card">
      {/* Stages */}
      <div className="divide-y divide-border">
        {stages.map((stage, index) => {
          const isActive = index === currentStageIndex;
          const isCompleted = index < currentStageIndex;
          const isPending = index > currentStageIndex;

          return (
            <div
              key={stage.id}
              className={cn(
                "flex items-center gap-4 px-5 py-3.5 transition-all",
                isActive && "bg-secondary/40 animate-progress-pulse",
                isCompleted && "bg-secondary/20",
                isPending && "opacity-40"
              )}
            >
              {/* Status icon */}
              <div
                className={cn(
                  "w-6 h-6 flex items-center justify-center border shrink-0",
                  isActive && "bg-foreground text-background border-foreground",
                  isCompleted && "bg-accent text-background border-accent",
                  isPending && "bg-transparent text-muted-foreground border-border"
                )}
              >
                {isCompleted && <Check className="w-3.5 h-3.5" />}
                {isActive && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isPending && <Circle className="w-2.5 h-2.5" />}
              </div>

              {/* Stage label */}
              <div className="flex-1">
                <p
                  className={cn(
                    "text-xs font-medium uppercase tracking-wider",
                    isActive && "text-foreground",
                    isCompleted && "text-foreground/70",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </p>
              </div>

              {/* Status text */}
              <div className="text-[10px] font-mono font-medium uppercase tracking-wider">
                {isCompleted && (
                  <span className="text-accent">Done</span>
                )}
                {isActive && (
                  <span className="text-foreground">Running</span>
                )}
                {isPending && (
                  <span className="text-muted-foreground">Pending</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border overflow-hidden">
        <div
          className="h-full bg-foreground transition-all duration-500 ease-out"
          style={{
            width: `${((currentStageIndex + 1) / stages.length) * 100}%`,
          }}
        />
      </div>

      <div className="px-5 py-2.5 border-t border-border">
        <p className="text-[10px] font-mono text-muted-foreground">
          Stage {Math.min(currentStageIndex + 1, stages.length)} of{" "}
          {stages.length}
        </p>
      </div>
    </div>
  );
}
