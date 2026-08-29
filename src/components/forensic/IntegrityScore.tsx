import { getRiskInfo } from "@/lib/forensics/types";
import { cn } from "@/lib/utils";

interface IntegrityScoreProps {
  score: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  size?: "md" | "lg";
}

export function IntegrityScore({ score, riskLevel, size = "lg" }: IntegrityScoreProps) {
  const risk = getRiskInfo(riskLevel);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 80) return "#22c55e";
    if (s >= 55) return "#f59e0b";
    if (s >= 25) return "#ef4444";
    return "#dc2626";
  };

  const color = getScoreColor(score);
  const isLarge = size === "lg";

  return (
    <div className={cn("flex flex-col items-center", isLarge ? "gap-4" : "gap-2")}>
      <div className="relative">
        <svg
          className={cn(isLarge ? "w-52 h-52" : "w-28 h-28")}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            className="text-muted border-current"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="butt"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-black leading-none",
              isLarge ? "text-6xl" : "text-3xl"
            )}
            style={{ color }}
          >
            {score}
          </span>
          {isLarge && (
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              / 100
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "nb-badge px-4 py-2 border-3 font-black",
          risk.bgColor,
          risk.color,
          `border-current`
        )}
        style={{ borderColor: color }}
      >
        {risk.label}
      </div>

      {isLarge && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {riskLevel === "low" && "No significant anomalies detected in the analysis."}
          {riskLevel === "moderate" && "Some indicators suggest possible modification. Review findings for details."}
          {riskLevel === "high" && "Multiple indicators consistent with possible manipulation detected."}
          {riskLevel === "critical" && "Strong evidence of multiple anomalies. Manual review strongly recommended."}
        </p>
      )}
    </div>
  );
}
