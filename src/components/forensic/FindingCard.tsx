import { useState } from "react";
import type { ForensicFinding } from "@/lib/forensics/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FindingCardProps {
  finding: ForensicFinding;
  index?: number;
  defaultExpanded?: boolean;
}

export function FindingCard({
  finding,
  index = 0,
  defaultExpanded = false,
}: FindingCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const isAnomaly = !finding.finding
    .toLowerCase()
    .includes("no significant");

  const severityColor = isAnomaly
    ? finding.severity === "high"
      ? "#A85D45"
      : finding.severity === "medium"
        ? "#8A8175"
        : "#6F7658"
    : "#6F7658";

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-secondary/20 transition-colors"
      >
        {/* Number */}
        <span className="evidence-num text-lg mt-0.5 shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{finding.finding}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="editorial-label">
              {finding.category.replace("_", " ")}
            </span>
            <span className="text-[10px] text-border">·</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {finding.confidence}% confidence
            </span>
          </div>
        </div>

        {/* Severity + expand */}
        <div className="flex items-center gap-2 shrink-0">
          {isAnomaly && (
            <span
              className="nb-badge px-1.5 py-0.5"
              style={{
                backgroundColor: `${severityColor}15`,
                color: severityColor,
                borderColor: `${severityColor}40`,
              }}
            >
              {finding.severity.toUpperCase()}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 pl-[4.5rem] space-y-4">
          <div>
            <span className="editorial-label">Evidence</span>
            <p className="text-sm leading-relaxed mt-1">{finding.evidence}</p>
          </div>

          <div>
            <span className="editorial-label">Technical interpretation</span>
            <p className="text-sm leading-relaxed text-muted-foreground mt-1">
              {finding.technicalExplanation}
            </p>
          </div>

          <div>
            <span className="editorial-label">Human interpretation</span>
            <p className="text-sm leading-relaxed mt-1">
              {finding.userExplanation}
            </p>
          </div>

          {finding.region && (
            <div>
              <span className="editorial-label">Affected region</span>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                x: {finding.region.x}, y: {finding.region.y}, w:{" "}
                {finding.region.width}, h: {finding.region.height}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
