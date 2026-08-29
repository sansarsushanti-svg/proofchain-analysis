import { getRiskInfo } from "@/lib/forensics/types";
import { cn } from "@/lib/utils";

interface IntegrityScoreProps {
  score: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  size?: "md" | "lg";
}

export function IntegrityScore({
  score,
  riskLevel,
  size = "lg",
}: IntegrityScoreProps) {
  const risk = getRiskInfo(riskLevel);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 80) return "#6F7658";
    if (s >= 55) return "#8A8175";
    if (s >= 25) return "#A85D45";
    return "#B8433A";
  };

  const color = getScoreColor(score);
  const isLarge = size === "lg";

  return (
    <div
      className={cn(
        "flex flex-col items-center",
        isLarge ? "gap-4" : "gap-2"
      )}
    >
      {/* Score circle */}
      <div className="relative">
        <svg
          className={cn(isLarge ? "w-48 h-48" : "w-28 h-28")}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth="5"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="5"
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
              "font-display leading-none",
              isLarge ? "text-5xl" : "text-3xl"
            )}
          >
            {score}
          </span>
          {isLarge && (
            <span className="text-[10px] font-mono text-muted-foreground mt-1">
              / 100
            </span>
          )}
        </div>
      </div>

      {/* Risk badge */}
      <span
        className="nb-badge px-3 py-1"
        style={{
          backgroundColor: `${color}15`,
          color,
          borderColor: `${color}40`,
        }}
      >
        {risk.label}
      </span>

      {isLarge && (
        <p className="text-xs text-muted-foreground text-center max-w-[240px] leading-relaxed">
          {riskLevel === "low" &&
            "No significant anomalies detected in the analysis."}
          {riskLevel === "moderate" &&
            "Some indicators suggest possible modification. Review findings for details."}
          {riskLevel === "high" &&
            "Multiple indicators consistent with possible manipulation detected."}
          {riskLevel === "critical" &&
            "Strong evidence of multiple anomalies. Manual review strongly recommended."}
        </p>
      )}
    </div>
  );
}
