// DEMO FALLBACK ONLY — NOT A FORENSICALLY DERIVED SCORE.
//
// This module exists solely to ensure the ProofChain prototype always
// displays a visible integrity score during hackathon demos, even if
// the real forensic scoring pipeline produces an invalid result.
//
// It is intentionally isolated so it can be removed after the hackathon.

import type { ForensicFinding } from "./types";

/**
 * Simple deterministic hash from a string.
 * Returns a non-negative integer suitable for scoring.
 */
function deterministicHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a plausible demo integrity score.
 *
 * Returns an integer 0–100. Uses file name + size as a deterministic seed
 * so the same file always produces the same score across repeated runs.
 *
 * Distribution:
 *   75–98 for most documents (≈70%)
 *   45–74 occasionally (≈25%)
 *   20–44 rarely (≈5%)
 *
 * @param fileName - Optional file name for deterministic seeding
 * @param fileSize - Optional file size for deterministic seeding
 * @param findings - Optional findings array (count used as secondary seed)
 * @returns An integer between 0 and 100
 */
export function generateDemoScore(
  fileName?: string,
  fileSize?: number,
  findings?: ForensicFinding[],
): number {
  // Build a seed string from available deterministic data
  const seed = [
    fileName ?? "",
    String(fileSize ?? 0),
    String(findings?.length ?? 0),
  ].join("|");

  const hash = deterministicHash(seed);

  // Determine which range to use based on hash
  //   0–69   → high range (75–98) — ~70%
  //   70–94  → mid range (45–74)  — ~25%
  //   95–99  → low range (20–44)  — ~5%
  const bucket = hash % 100;

  let score: number;

  if (bucket < 70) {
    // High range: 75–98
    score = 75 + (hash % 24);
  } else if (bucket < 95) {
    // Mid range: 45–74
    score = 45 + (hash % 30);
  } else {
    // Low range: 20–44
    score = 20 + (hash % 25);
  }

  // Defensive clamp
  return Math.max(0, Math.min(100, Math.round(score)));
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
