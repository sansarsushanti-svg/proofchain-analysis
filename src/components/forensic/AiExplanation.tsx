import { useState } from "react";
import type { AiExplanation as AiExplanationType } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AiExplanationProps {
  explanation: AiExplanationType | null;
  loading?: boolean;
  error?: string;
}

export function AiExplanation({
  explanation,
  loading = false,
  error,
}: AiExplanationProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <div className="p-6 border-b border-border">
        <span className="editorial-label">AI-Assisted Interpretation</span>
        <p className="text-sm text-muted-foreground mt-2">
          Generating explanation from forensic evidence...
        </p>
        <div className="space-y-2 mt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-3 bg-muted animate-pulse"
              style={{ width: `${100 - i * 15}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border-b border-border">
        <span className="editorial-label">AI-Assisted Interpretation</span>
        <p className="text-sm text-muted-foreground mt-2">
          Forensic analysis completed. AI explanation is temporarily
          unavailable.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2 font-mono">
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
    },
    {
      title: "Evidence Significance",
      content: explanation.evidenceMatters,
    },
    {
      title: "Plain-English Interpretation",
      content: explanation.plainEnglish,
    },
    {
      title: "Recommended Next Steps",
      content: explanation.recommendedNextStep,
    },
  ];

  return (
    <div className="border-b border-border">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-secondary/20 transition-colors"
      >
        <div>
          <span className="editorial-label">AI-Assisted Interpretation</span>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Generated from forensic evidence detected by ProofChain
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-6 pb-6 space-y-5">
          {/* Disclaimer */}
          <div className="p-3 border border-border bg-secondary/20">
            <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
              Disclaimer: This AI-generated analysis is based on evidence from
              the forensic engine. It does not constitute definitive proof of
              manipulation or authenticity.
            </p>
          </div>

          {/* Sections */}
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="editorial-label mb-1.5">{section.title}</h4>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
