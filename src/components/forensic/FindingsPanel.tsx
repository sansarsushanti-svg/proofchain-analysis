import { useState } from "react";
import type { ForensicFinding } from "@/lib/forensics/types";
import { FindingCard } from "./FindingCard";
import { cn } from "@/lib/utils";

interface FindingsPanelProps {
  findings: ForensicFinding[];
}

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "metadata", label: "Metadata" },
  { id: "image_forensics", label: "Image" },
  { id: "text_layout", label: "Text" },
  { id: "pdf_structure", label: "PDF" },
];

export function FindingsPanel({ findings }: FindingsPanelProps) {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredFindings =
    activeCategory === "all"
      ? findings
      : findings.filter((f) => f.category === activeCategory);

  const anomalyCount = findings.filter(
    (f) => !f.finding.toLowerCase().includes("no significant")
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black uppercase tracking-wider">
          Findings
          <span className="ml-2 text-sm text-muted-foreground">
            ({findings.length})
          </span>
        </h3>
        <span className="text-xs font-bold text-muted-foreground">
          {anomalyCount} anomal{anomalyCount !== 1 ? "ies" : "y"}
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map((cat) => {
          const count =
            cat.id === "all"
              ? findings.length
              : findings.filter((f) => f.category === cat.id).length;

          if (count === 0 && cat.id !== "all") return null;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 transition-colors",
                activeCategory === cat.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground border-border hover:bg-muted"
              )}
            >
              {cat.label}
              <span className="ml-1 text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Findings list */}
      <div className="space-y-2">
        {filteredFindings.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-border text-center">
            <p className="text-sm text-muted-foreground">
              No findings in this category.
            </p>
          </div>
        ) : (
          filteredFindings.map((finding, idx) => (
            <FindingCard key={idx} finding={finding} />
          ))
        )}
      </div>
    </div>
  );
}
