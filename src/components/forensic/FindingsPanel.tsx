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
    <div>
      {/* Header */}
      <div className="p-5 border-b border-border">
        <span className="editorial-label">Evidence Log</span>
        <div className="flex items-center gap-3 mt-2">
          <h3 className="text-sm font-medium">
            {findings.length} finding{findings.length !== 1 ? "s" : ""}
          </h3>
          <span className="text-[10px] font-mono text-muted-foreground">
            {anomalyCount} anomal{anomalyCount !== 1 ? "ies" : "y"}
          </span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-px bg-border border-b border-border">
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
                "flex-1 px-2 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider transition-colors",
                activeCategory === cat.id
                  ? "bg-card text-foreground"
                  : "bg-secondary/30 text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.label}
              <span className="ml-1 opacity-50">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Findings list */}
      {filteredFindings.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-xs text-muted-foreground">
            No findings in this category.
          </p>
        </div>
      ) : (
        <div>
          {filteredFindings.map((finding, idx) => (
            <FindingCard key={idx} finding={finding} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
