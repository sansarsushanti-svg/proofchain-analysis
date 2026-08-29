import { useState } from "react";
import type { ForensicFinding } from "@/lib/forensics/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from "lucide-react";

interface FindingCardProps {
  finding: ForensicFinding;
  index?: number;
  defaultExpanded?: boolean;
}

export function FindingCard({ finding, defaultExpanded = false }: FindingCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const isAnomaly = !finding.finding.toLowerCase().includes("no significant");

  const severityStyles: Record<string, string> = {
    high: "border-red-300 bg-red-50",
    medium: "border-amber-300 bg-amber-50",
    low: "border-border bg-card",
  };

  const severityBadgeStyles: Record<string, string> = {
    high: "bg-red-100 text-red-800 border-red-500",
    medium: "bg-amber-100 text-amber-800 border-amber-500",
    low: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div
      className={cn(
        "border-3 transition-all",
        isAnomaly ? severityStyles[finding.severity] : "border-emerald-300 bg-emerald-50"
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-black/[0.02] transition-colors"
      >
        {/* Severity icon */}
        <div
          className={cn(
            "w-8 h-8 flex items-center justify-center border-2 shrink-0",
            isAnomaly ? "border-current" : "border-emerald-500 bg-emerald-100"
          )}
        >
          {isAnomaly ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          )}
        </div>

        {/* Finding info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{finding.finding}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {finding.category.replace("_", " ").toUpperCase()} · {finding.confidence}% confidence
          </p>
        </div>

        {/* Severity badge */}
        <span
          className={cn(
            "nb-badge px-2 py-0.5 shrink-0",
            isAnomaly ? severityBadgeStyles[finding.severity] : "bg-emerald-100 text-emerald-800 border-emerald-500"
          )}
        >
          {finding.severity.toUpperCase()}
        </span>

        {/* Expand icon */}
        <div className="shrink-0 ml-1">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t-2 border-current/20 p-4 space-y-3">
          {/* Evidence */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Evidence
            </p>
            <p className="text-sm leading-relaxed">{finding.evidence}</p>
          </div>

          {/* Technical explanation */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Technical Explanation
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {finding.technicalExplanation}
            </p>
          </div>

          {/* User-friendly explanation */}
          <div className="bg-background/50 p-3 border-2 border-current/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              What This Means
            </p>
            <p className="text-sm leading-relaxed">{finding.userExplanation}</p>
          </div>

          {/* Region info */}
          {finding.region && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Affected Region
              </p>
              <p className="text-xs font-mono text-muted-foreground">
                x: {finding.region.x}, y: {finding.region.y}, w: {finding.region.width}, h: {finding.region.height}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
