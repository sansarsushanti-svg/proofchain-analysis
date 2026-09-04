// DEMO FALLBACK ONLY — NOT A FORENSICALLY DERIVED SCORE.
//
// This module exists solely to ensure the ProofChain prototype always
// displays a visible integrity score during hackathon demos, even if
// the real forensic scoring pipeline produces an invalid result.
//
// It is intentionally isolated so it can be removed after the hackathon.

/**
 * Generate a random demo integrity score.
 *
 * Chooses a risk band first (each ~33.33%), then generates a score within it:
 *   LOW:    80–100
 *   MEDIUM: 50–79
 *   HIGH:   0–49
 *
 * @returns An integer between 0 and 100
 */
export function generateDemoScore(): number {
  const riskBand = Math.floor(Math.random() * 3);

  if (riskBand === 0) {
    // LOW: 80–100
    return Math.floor(Math.random() * 21) + 80;
  }

  if (riskBand === 1) {
    // MEDIUM: 50–79
    return Math.floor(Math.random() * 30) + 50;
  }

  // HIGH: 0–49
  return Math.floor(Math.random() * 50);
}

/**
 * Derive a risk level from a numeric score.
 * Mirrors the scoring.ts logic for consistency.
 */
export function deriveRiskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 80) return "low";
  if (score >= 50) return "medium";
  return "high";
}
