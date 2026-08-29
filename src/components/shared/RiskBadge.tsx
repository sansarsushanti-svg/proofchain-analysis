import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  level: "low" | "moderate" | "high" | "critical";
  size?: "sm" | "md" | "lg";
}

export function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  const styles: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-800 border-emerald-500",
    moderate: "bg-amber-100 text-amber-800 border-amber-500",
    high: "bg-red-100 text-red-800 border-red-500",
    critical: "bg-red-200 text-red-900 border-red-700",
  };

  const sizeStyles: Record<string, string> = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-3 py-1",
    lg: "text-sm px-4 py-1.5",
  };

  const labels: Record<string, string> = {
    low: "LOW RISK",
    moderate: "MODERATE",
    high: "HIGH RISK",
    critical: "CRITICAL",
  };

  return (
    <span
      className={cn(
        "nb-badge inline-flex items-center font-black",
        styles[level],
        sizeStyles[size]
      )}
    >
      {labels[level]}
    </span>
  );
}
