import type { ForensicFinding, IntegrityResult } from "./forensics/types";

export interface AiExplanation {
  executiveSummary: string;
  detailedExplanation: string;
  evidenceMatters: string;
  plainEnglish: string;
  recommendedNextStep: string;
}

/**
 * Generate AI explanation of forensic findings.
 *
 * In production, this would call the Grok API server-side.
 * For MVP, we generate structured explanations from the forensic evidence.
 *
 * IMPORTANT: The AI must NEVER independently claim that a document is fake.
 * It must always use hedging language like "indicators consistent with
 * possible manipulation" rather than "this file is definitely fake."
 */
export function generateAiExplanation(
  result: IntegrityResult
): AiExplanation {
  const findings = result.findings.filter(
    f => !f.finding.toLowerCase().includes("no significant") &&
         !f.finding.toLowerCase().includes("could not be completed")
  );

  const highSeverityFindings = findings.filter(f => f.severity === "high");
  const mediumSeverityFindings = findings.filter(f => f.severity === "medium");
  const lowSeverityFindings = findings.filter(f => f.severity === "low");

  // Build executive summary
  let executiveSummary = "";
  if (highSeverityFindings.length > 0) {
    executiveSummary = `The analysis identified ${highSeverityFindings.length} high-confidence anomaly indicators that are consistent with possible document manipulation. `;
    if (mediumSeverityFindings.length > 0) {
      executiveSummary += `An additional ${mediumSeverityFindings.length} moderate indicators were detected. `;
    }
    executiveSummary += `These findings warrant further investigation by qualified personnel.`;
  } else if (mediumSeverityFindings.length > 0) {
    executiveSummary = `The analysis detected ${mediumSeverityFindings.length} moderate-confidence indicators that may suggest document modification. `;
    executiveSummary += `While not conclusive evidence of manipulation, these anomalies should be reviewed.`;
  } else {
    executiveSummary = `The forensic analysis did not detect significant indicators of manipulation. `;
    executiveSummary += `However, automated analysis has limitations and cannot guarantee file authenticity.`;
  }

  // Build detailed explanation
  const detailedParts: string[] = [];
  for (const finding of findings.slice(0, 5)) {
    detailedParts.push(
      `[${finding.category.toUpperCase()}] ${finding.finding} (Confidence: ${finding.confidence}%) — ${finding.evidence}`
    );
  }
  const detailedExplanation = detailedParts.join("\n\n");

  // Build evidence matters section
  const evidenceParts: string[] = [];
  if (highSeverityFindings.length > 0) {
    evidenceParts.push(
      `The ${highSeverityFindings.length} high-severity finding(s) represent the strongest indicators. These findings have high confidence scores and are based on deterministic analysis rather than probabilistic inference.`
    );
  }
  if (findings.some(f => f.category === "image_forensics")) {
    evidenceParts.push(
      "Image forensics results indicate statistical inconsistencies in compression patterns and noise distribution. These inconsistencies can occur when different regions of an image originate from different sources or have been edited independently."
    );
  }
  if (findings.some(f => f.category === "metadata")) {
    evidenceParts.push(
      "Metadata analysis revealed anomalies in file properties. Metadata manipulation is one of the most common methods of document falsification and should be considered alongside other evidence."
    );
  }
  if (evidenceParts.length === 0) {
    evidenceParts.push(
      "No strong individual indicators were found across the analysis modules."
    );
  }
  const evidenceMatters = evidenceParts.join("\n\n");

  // Build plain English explanation
  let plainEnglish = "";
  if (result.riskLevel === "high" || result.riskLevel === "critical") {
    plainEnglish = "Based on the forensic evidence collected, this document shows multiple indicators that are commonly associated with altered or manipulated files. The analysis detected inconsistencies across different parts of the file that may suggest it was modified after its original creation. This does not constitute proof of fraud, but it does indicate that the file should be verified through other means.";
  } else if (result.riskLevel === "medium") {
    plainEnglish = "The analysis found some indicators that could suggest the document was modified. While none of these indicators alone would be considered conclusive evidence, their combination warrants a closer look. We recommend verifying the document against its original version or obtaining additional verification.";
  } else {
    plainEnglish = "The document appears to have consistent characteristics across all forensic checks. No significant anomalies were detected. However, automated analysis has inherent limitations and should be supplemented with other verification methods for high-stakes decisions.";
  }

  // Build recommended next step
  let recommendedNextStep = "";
  if (result.riskLevel === "high" || result.riskLevel === "critical") {
    recommendedNextStep = "We recommend: (1) Obtaining the original document for comparison, (2) Verifying the document through the issuing organization directly, (3) Consulting with a digital forensics professional for a detailed manual examination, (4) Considering this document as potentially unreliable until further verification is complete.";
  } else if (result.riskLevel === "medium") {
    recommendedNextStep = "We recommend: (1) Verifying the document with the issuing party, (2) Comparing against known authentic versions if available, (3) For high-value transactions, requesting additional verification documents.";
  } else {
    recommendedNextStep = "The automated analysis suggests this document is consistent with its expected format. For important decisions, we still recommend: (1) Verifying key details with the issuing party, (2) Keeping this analysis report for your records.";
  }

  return {
    executiveSummary,
    detailedExplanation,
    evidenceMatters,
    plainEnglish,
    recommendedNextStep,
  };
}

/**
 * Format AI explanation for report output
 */
export function formatExplanationForReport(explanation: AiExplanation): string {
  return `
EXPLANATIVE ANALYSIS
━━━━━━━━━━━━━━━━━━━

Executive Summary
${explanation.executiveSummary}

Evidence Significance
${explanation.evidenceMatters}

Plain-English Interpretation
${explanation.plainEnglish}

Recommended Next Steps
${explanation.recommendedNextStep}
`.trim();
}
