import type { ForensicFinding, IntegrityResult } from "./types";

// Weight multipliers for each category
const CATEGORY_WEIGHTS: Record<string, number> = {
  metadata: 1.0,
  image_forensics: 1.3,
  text_layout: 0.8,
  pdf_structure: 1.2,
};

// Severity weights
const SEVERITY_WEIGHTS: Record<string, number> = {
  low: 1.0,
  medium: 2.0,
  high: 3.5,
};

export function calculateIntegrityScore(
  findings: ForensicFinding[],
  metadata: IntegrityResult["metadata"]
): IntegrityResult {
  if (findings.length === 0) {
    return {
      integrityScore: 100,
      riskLevel: "low",
      findings,
      metadata,
    };
  }

  // Calculate weighted penalty from findings
  let totalPenalty = 0;
  let maxPossiblePenalty = 0;

  for (const finding of findings) {
    const categoryWeight = CATEGORY_WEIGHTS[finding.category] || 1.0;
    const severityWeight = SEVERITY_WEIGHTS[finding.severity] || 1.0;
    const confidenceFactor = finding.confidence / 100;

    // Skip "no anomaly" findings in scoring
    if (finding.finding.toLowerCase().includes("no significant") ||
        finding.finding.toLowerCase().includes("could not be completed")) {
      continue;
    }

    const penalty = categoryWeight * severityWeight * confidenceFactor * 10;
    totalPenalty += penalty;
    maxPossiblePenalty += categoryWeight * 3.5 * 10; // max severity * max confidence
  }

  // Score: 100 = no anomalies, 0 = maximum anomalies
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

  // Determine risk level
  let riskLevel: "low" | "moderate" | "high" | "critical";
  if (score >= 80) riskLevel = "low";
  else if (score >= 55) riskLevel = "moderate";
  else if (score >= 25) riskLevel = "high";
  else riskLevel = "critical";

  // Count findings by category
  const categorySummary = {
    metadata: findings.filter(f => f.category === "metadata").length,
    image_forensics: findings.filter(f => f.category === "image_forensics").length,
    text_layout: findings.filter(f => f.category === "text_layout").length,
    pdf_structure: findings.filter(f => f.category === "pdf_structure").length,
  };

  return {
    integrityScore: score,
    riskLevel,
    findings,
    metadata,
  };
}

export function getFindingsSummary(findings: ForensicFinding[]) {
  const categories = [
    { id: "metadata", label: "Metadata", icon: "file-text" },
    { id: "image_forensics", label: "Image Forensics", icon: "scan" },
    { id: "text_layout", label: "Text / Layout", icon: "type" },
    { id: "pdf_structure", label: "PDF Structure", icon: "file" },
  ];

  return categories.map(cat => {
    const catFindings = findings.filter(f => f.category === cat.id);
    const anomalies = catFindings.filter(
      f => !f.finding.toLowerCase().includes("no significant") &&
           !f.finding.toLowerCase().includes("could not be completed")
    );
    const avgConfidence = catFindings.length > 0
      ? Math.round(catFindings.reduce((sum, f) => sum + f.confidence, 0) / catFindings.length)
      : 0;

    return {
      ...cat,
      totalFindings: catFindings.length,
      anomalyCount: anomalies.length,
      avgConfidence,
      hasAnomalies: anomalies.length > 0,
    };
  });
}
