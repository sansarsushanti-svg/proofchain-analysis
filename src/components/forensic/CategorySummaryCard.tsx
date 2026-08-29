import { cn } from "@/lib/utils";
import { FileText, Scan, Type, File } from "lucide-react";

interface CategorySummaryCardProps {
  id: string;
  label: string;
  anomalyCount: number;
  totalFindings: number;
  avgConfidence: number;
  hasAnomalies: boolean;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  metadata: FileText,
  image_forensics: Scan,
  text_layout: Type,
  pdf_structure: File,
};

export function CategorySummaryCard({
  id,
  label,
  anomalyCount,
  totalFindings,
  avgConfidence,
  hasAnomalies,
}: CategorySummaryCardProps) {
  const Icon = ICONS[id] || FileText;

  return (
    <div className="p-4 bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="editorial-label">{label}</span>
        </div>
        {hasAnomalies ? (
          <span
            className="nb-badge px-1.5 py-0.5"
            style={{
              backgroundColor: "#A85D4515",
              color: "#A85D45",
              borderColor: "#A85D4540",
            }}
          >
            {anomalyCount} ISSUE{anomalyCount !== 1 ? "S" : ""}
          </span>
        ) : (
          <span className="nb-badge px-1.5 py-0.5 bg-secondary text-muted-foreground border-border">
            CLEAR
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground font-mono">
        {totalFindings} finding{totalFindings !== 1 ? "s" : ""} ·{" "}
        {avgConfidence}% avg confidence
      </p>
    </div>
  );
}
