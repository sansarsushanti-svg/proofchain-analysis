import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  level: "low" | "moderate" | "high" | "critical";
  size?: "sm" | "md" | "lg";
}

export function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  const styles: Record<string, string> = {
    low: "bg-secondary text-foreground/70 border-border",
    moderate: "bg-amber-50 text-amber-800 border-amber-300",
    high: "bg-accent/10 text-accent border-accent/30",
    critical: "bg-accent/15 text-accent border-accent/40",
  };

  const sizeStyles: Record<string, string> = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-[10px] px-2.5 py-0.5",
    lg: "text-xs px-3 py-1",
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
        "nb-badge inline-flex items-center",
        styles[level],
        sizeStyles[size]
      )}
    >
      {labels[level]}
    </span>
  );
}
