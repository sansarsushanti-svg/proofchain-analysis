import type { ForensicFinding, IntegrityResult } from "./types";

// ── Category weights ──────────────────────────────────────────────
const CATEGORY_WEIGHTS: Record<string, number> = {
  metadata: 1.0,
  pdf_structure: 1.2,
  image_forensics: 1.5,
  text_layout: 1.0,
  ocr: 1.0,
  invoice_analysis: 1.5,
  text_image_correlation: 1.8,
  general: 1.0,
};

// ── Severity deduction points ─────────────────────────────────────
const SEVERITY_DEDUCTIONS: Record<string, number> = {
  low: 5,
  medium: 12,
  high: 25,
  critical: 40,
};

const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_WEIGHTS));

/**
 * Calculate integrity score from forensic findings.
 *
 * Starts at 100 and deducts points based on finding severity and category.
 * Returns a valid IntegrityResult that is NEVER undefined, null, or NaN.
 *
 * @param findings - Array of forensic findings from the analysis pipeline
 * @param metadata - Analysis metadata (timestamp, file info, modules run)
 * @returns IntegrityResult with integrityScore (0-100), riskLevel, findings, and metadata
 */
export function calculateIntegrityScore(
  findings: ForensicFinding[],
  metadata: IntegrityResult["metadata"],
): IntegrityResult {
  // ── Defensive: handle null/undefined/non-array ──
  const validFindings = Array.isArray(findings) ? findings : [];

  console.log(`[ProofChain SCORE] Findings: ${validFindings.length}`);

  // ── Zero findings: perfect score ──
  if (validFindings.length === 0) {
    console.log("[ProofChain SCORE] Total deduction: 0");
    console.log("[ProofChain SCORE] Final integrity score: 100");
    console.log("[ProofChain SCORE] Risk level: low");
    return {
      integrityScore: 100,
      riskLevel: "low",
      findings: [],
      metadata,
    };
  }

  // ── Calculate deductions ──
  let totalDeduction = 0;

  for (const finding of validFindings) {
    // Defensive: skip malformed findings
    if (!finding || typeof finding !== "object") continue;

    // Normalize category (default to "general" if missing/invalid)
    const category = VALID_CATEGORIES.has(finding.category)
      ? finding.category
      : "general";

    // Normalize severity (skip if invalid — don't silently ignore)
    const severity = VALID_SEVERITIES.has(finding.severity)
      ? finding.severity
      : null;
    if (!severity) continue;

    const categoryWeight = CATEGORY_WEIGHTS[category] ?? 1.0;
    const severityPoints = SEVERITY_DEDUCTIONS[severity] ?? 5;
    const deduction = severityPoints * categoryWeight;

    // Defensive: ensure deduction is numeric
    if (Number.isFinite(deduction) && deduction > 0) {
      totalDeduction += deduction;
    }

    console.log(
      `[ProofChain SCORE]   ${category} / ${severity} → weight=${categoryWeight} × points=${severityPoints} = deduction=${deduction.toFixed(1)}`,
    );
  }

  // Defensive: ensure totalDeduction is numeric
  if (!Number.isFinite(totalDeduction)) totalDeduction = 0;

  // ── Calculate score ──
  const score = 100 - totalDeduction;
  const integrityScore = Math.max(0, Math.min(100, Math.round(score)));

  // ── Determine risk level ──
  let riskLevel: "low" | "medium" | "high";
  if (integrityScore >= 80) {
    riskLevel = "low";
  } else if (integrityScore >= 50) {
    riskLevel = "medium";
  } else {
    riskLevel = "high";
  }

  console.log(`[ProofChain SCORE] Total deduction: ${totalDeduction.toFixed(1)}`);
  console.log(`[ProofChain SCORE] Final integrity score: ${integrityScore}`);
  console.log(`[ProofChain SCORE] Risk level: ${riskLevel}`);

  return {
    integrityScore,
    riskLevel,
    findings: validFindings,
    metadata,
  };
}

// ── Findings summary helper ───────────────────────────────────────

export function getFindingsSummary(findings: ForensicFinding[]) {
  const categories = [
    { id: "metadata", label: "Metadata", icon: "file-text" },
    { id: "pdf_structure", label: "PDF Structure", icon: "file" },
    { id: "invoice_analysis", label: "Invoice Analysis", icon: "calculator" },
    { id: "image_forensics", label: "Image Forensics", icon: "scan" },
    { id: "text_image_correlation", label: "Text / Image Correlation", icon: "link" },
    { id: "text_layout", label: "Text / Layout", icon: "type" },
  ];

  return categories.map((cat) => {
    const catFindings = findings.filter((f) => f.category === cat.id);
    const anomalies = catFindings.filter(
      (f) =>
        !f.finding.toLowerCase().includes("no significant") &&
        !f.finding.toLowerCase().includes("could not be completed"),
    );
    const avgConfidence =
      catFindings.length > 0
        ? Math.round(
            catFindings.reduce((sum, f) => sum + f.confidence, 0) /
              catFindings.length,
          )
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
