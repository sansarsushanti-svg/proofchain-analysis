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
    <div
      className={cn(
        "border-3 p-4 transition-all",
        hasAnomalies
          ? "border-foreground bg-card"
          : "border-emerald-300 bg-emerald-50/50"
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            "w-10 h-10 flex items-center justify-center border-2",
            hasAnomalies
              ? "bg-foreground text-background border-foreground"
              : "bg-emerald-100 text-emerald-700 border-emerald-300"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-wider">{label}</p>
          <p className="text-[10px] text-muted-foreground">
            {totalFindings} finding{totalFindings !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span
            className={cn(
              "nb-badge px-2 py-0.5",
              hasAnomalies
                ? "bg-amber-100 text-amber-800 border-amber-500"
                : "bg-emerald-100 text-emerald-700 border-emerald-500"
            )}
          >
            {hasAnomalies ? `${anomalyCount} ISSUE${anomalyCount !== 1 ? "S" : ""}` : "CLEAR"}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Confidence</p>
          <p className="text-sm font-bold">{avgConfidence}%</p>
        </div>
      </div>
    </div>
  );
}
