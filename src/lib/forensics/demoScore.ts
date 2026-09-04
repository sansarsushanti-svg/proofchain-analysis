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
 * Distribution is balanced to cover all three risk levels:
 *   80–100 → LOW RISK   (~33%)
 *   50–79  → MEDIUM RISK (~33%)
 *   0–49   → HIGH RISK   (~33%)
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

  // Use the last two digits of hash for bucket selection (0-99)
  // and the third digit for intra-range position
  const bucket = hash % 100;
  const position = (Math.floor(hash / 100)) % 100; // 0-99 for position within range

  let score: number;

  if (bucket < 33) {
    // LOW risk: 80–100
    score = 80 + Math.floor((position / 99) * 21);
  } else if (bucket < 66) {
    // MEDIUM risk: 50–79
    score = 50 + Math.floor((position / 99) * 30);
  } else {
    // HIGH risk: 0–49
    score = Math.floor((position / 99) * 50);
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
