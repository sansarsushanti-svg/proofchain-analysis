export interface ForensicFinding {
  category: "metadata" | "image_forensics" | "text_layout" | "pdf_structure" | "invoice_analysis" | "text_image_correlation";
  finding: string;
  severity: "low" | "medium" | "high";
  confidence: number; // 0-100
  evidence: string;
  technicalExplanation: string;
  userExplanation: string;
  region?: { x: number; y: number; width: number; height: number };
}

export interface IntegrityResult {
  integrityScore: number; // 0-100
  riskLevel: "low" | "moderate" | "high" | "critical";
  findings: ForensicFinding[];
  metadata: {
    analysisTimestamp: string;
    fileType: string;
    fileName: string;
    fileSize: number;
    modulesRun: string[];
  };
}

export interface AnalysisStage {
  id: string;
  label: string;
  status: "pending" | "analyzing" | "completed";
}

export const ANALYSIS_STAGES: AnalysisStage[] = [
  { id: "received", label: "File received", status: "pending" },
  { id: "metadata", label: "Extracting metadata", status: "pending" },
  { id: "render", label: "Rendering document", status: "pending" },
  { id: "structure", label: "Inspecting document structure", status: "pending" },
  { id: "ocr", label: "Running optical character recognition", status: "pending" },
  { id: "invoice", label: "Analyzing invoice values", status: "pending" },
  { id: "forensics", label: "Running image forensics", status: "pending" },
  { id: "correlate", label: "Correlating evidence", status: "pending" },
  { id: "score", label: "Calculating integrity score", status: "pending" },
  { id: "explain", label: "Preparing explanation", status: "pending" },
];

export interface RiskInfo {
  level: "low" | "moderate" | "high" | "critical";
  label: string;
  color: string;
  bgColor: string;
}

export function getRiskInfo(level: string): RiskInfo {
  switch (level) {
    case "low":
      return {
        level: "low",
        label: "LOW RISK",
        color: "text-emerald-700",
        bgColor: "bg-emerald-100",
      };
    case "moderate":
      return {
        level: "moderate",
        label: "MODERATE RISK",
        color: "text-amber-700",
        bgColor: "bg-amber-100",
      };
    case "high":
      return {
        level: "high",
        label: "HIGH RISK",
        color: "text-red-700",
        bgColor: "bg-red-100",
      };
    case "critical":
      return {
        level: "critical",
        label: "CRITICAL",
        color: "text-red-900",
        bgColor: "bg-red-200",
      };
    default:
      return {
        level: "low",
        label: "UNKNOWN",
        color: "text-gray-700",
        bgColor: "bg-gray-100",
      };
  }
}
