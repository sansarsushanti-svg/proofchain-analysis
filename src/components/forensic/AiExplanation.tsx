import { useState } from "react";
import type { AiExplanation as AiExplanationType } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { Brain, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface AiExplanationProps {
  explanation: AiExplanationType | null;
  loading?: boolean;
  error?: string;
}

export function AiExplanation({ explanation, loading = false, error }: AiExplanationProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <div className="border-3 border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-muted border-2 border-border flex items-center justify-center">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-wider text-sm">
              AI-Assisted Analysis
            </h3>
            <p className="text-xs text-muted-foreground">
              Generating explanation from forensic evidence...
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-muted animate-pulse w-full" style={{ width: `${100 - i * 15}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-3 border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-wider text-sm">
              AI Explanation Unavailable
            </h3>
            <p className="text-xs text-muted-foreground">
              Forensic analysis completed. AI explanation is temporarily unavailable.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground border-2 border-dashed border-border p-4">
          {error}
        </p>
      </div>
    );
  }

  if (!explanation) return null;

  const sections = [
    {
      title: "Executive Summary",
      content: explanation.executiveSummary,
      color: "border-l-4 border-foreground",
    },
    {
      title: "Evidence Significance",
      content: explanation.evidenceMatters,
      color: "border-l-4 border-muted-foreground",
    },
    {
      title: "Plain-English Interpretation",
      content: explanation.plainEnglish,
      color: "border-l-4 border-accent",
    },
    {
      title: "Recommended Next Steps",
      content: explanation.recommendedNextStep,
      color: "border-l-4 border-emerald-500",
    },
  ];

  return (
    <div className="border-3 border-border bg-card">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-6 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="w-10 h-10 bg-foreground text-background border-2 border-foreground flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-black uppercase tracking-wider text-sm">
            AI-Assisted Analysis
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generated from forensic evidence — not independent detection
          </p>
        </div>
        <div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t-2 border-border p-6 space-y-6">
          {/* Disclaimer */}
          <div className="p-3 bg-muted border-2 border-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Disclaimer: This AI-generated analysis is based on evidence from the forensic engine. It does not constitute definitive proof of manipulation or authenticity.
            </p>
          </div>

          {/* Sections */}
          {sections.map((section) => (
            <div key={section.title} className={cn("pl-4", section.color)}>
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
                {section.title}
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
