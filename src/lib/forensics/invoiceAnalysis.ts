/**
 * Invoice Analysis — extracts currency amounts from OCR results
 * and performs arithmetic consistency checks.
 */

import type { OcrWord } from "./ocr";

export interface CurrencyAmount {
  value: number;
  originalText: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  role: "line_item" | "subtotal" | "tax" | "total" | "unknown";
}

export interface ArithmeticCheck {
  description: string;
  passed: boolean;
  evidence: string;
  confidence: number;
}

export interface InvoiceAnalysisResult {
  amounts: CurrencyAmount[];
  arithmeticChecks: ArithmeticCheck[];
  hasEnoughData: boolean;
}

// Regex for Indian currency formats: Rs.8,500 / Rs. 8,500 / ₹8,500 / 8,500 / Rs.1,06,790 etc.
const CURRENCY_REGEX = /(?:Rs\.?\s?|₹\s?)\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?/g;

// Words that suggest a role
const SUBTOTAL_KEYWORDS = ["subtotal", "sub total", "sub-total", "amount"];
const TAX_KEYWORDS = ["tax", "gst", "vat", "service tax"];
const TOTAL_KEYWORDS = ["total", "grand total", "amount due", "balance due", "net amount"];

/**
 * Parse an Indian-format currency string to a number.
 * Handles: ₹8,500 / ₹ 8,500 / 8,500 / ₹1,06,790
 */
function parseIndianCurrency(text: string): number | null {
  // Remove currency symbol/prefix and whitespace
  const cleaned = text.replace(/(?:Rs\.?\s?|₹\s?)/g, "").trim();
  if (!cleaned) return null;

  // Remove commas
  const withoutCommas = cleaned.replace(/,/g, "");
  const num = parseFloat(withoutCommas);

  if (isNaN(num) || num <= 0) return null;
  return num;
}

/**
 * Determine the semantic role of an amount based on nearby text.
 */
function inferRole(
  amount: CurrencyAmount,
  allWords: OcrWord[],
): CurrencyAmount["role"] {
  const { bbox } = amount;

  // Find words near this amount (within vertical proximity)
  const nearbyWords = allWords.filter((w) => {
    const verticalOverlap =
      w.bbox.y0 <= bbox.y1 + 10 && w.bbox.y1 >= bbox.y0 - 10;
    const horizontalNear = Math.abs(w.bbox.x0 - bbox.x0) < 300;
    return verticalOverlap && horizontalNear;
  });

  const nearbyText = nearbyWords
    .map((w) => w.text.toLowerCase())
    .join(" ");

  if (TOTAL_KEYWORDS.some((k) => nearbyText.includes(k))) return "total";
  if (TAX_KEYWORDS.some((k) => nearbyText.includes(k))) return "tax";
  if (SUBTOTAL_KEYWORDS.some((k) => nearbyText.includes(k))) return "subtotal";

  return "unknown";
}

/**
 * Extract all currency amounts from OCR words.
 */
export function extractCurrencyAmounts(
  words: OcrWord[],
): CurrencyAmount[] {
  const amounts: CurrencyAmount[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    const matches = word.text.match(CURRENCY_REGEX);
    if (!matches) continue;

    for (const match of matches) {
      const value = parseIndianCurrency(match);
      if (value === null) continue;

      // Deduplicate by value + approximate position
      const key = `${value}_${Math.round(word.bbox.x0)}_${Math.round(word.bbox.y0)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      amounts.push({
        value,
        originalText: match.trim(),
        confidence: word.confidence,
        bbox: word.bbox,
        role: "unknown",
      });
    }
  }

  // Infer roles based on context
  for (const amount of amounts) {
    amount.role = inferRole(amount, words);
  }

  return amounts;
}

/**
 * Perform arithmetic consistency checks on extracted amounts.
 */
export function checkArithmetic(amounts: CurrencyAmount[]): ArithmeticCheck[] {
  const checks: ArithmeticCheck[] = [];

  const lineItems = amounts.filter((a) => a.role === "line_item" || a.role === "unknown");
  const subtotal = amounts.find((a) => a.role === "subtotal");
  const taxAmounts = amounts.filter((a) => a.role === "tax");
  const total = amounts.find((a) => a.role === "total");

  // Check: line items sum to subtotal
  if (lineItems.length >= 2 && subtotal) {
    const sum = lineItems.reduce((acc, a) => acc + a.value, 0);
    const diff = Math.abs(sum - subtotal.value);
    const tolerance = Math.max(subtotal.value * 0.01, 1); // 1% tolerance

    checks.push({
      description: "Line items sum vs. subtotal",
      passed: diff <= tolerance,
      evidence: diff <= tolerance
        ? `Line items sum to ₹${sum.toLocaleString("en-IN")}, matching the stated subtotal of ₹${subtotal.value.toLocaleString("en-IN")}.`
        : `Line items sum to ₹${sum.toLocaleString("en-IN")} but the stated subtotal is ₹${subtotal.value.toLocaleString("en-IN")} (difference: ₹${diff.toLocaleString("en-IN")}).`,
      confidence: diff <= tolerance ? 85 : 90,
    });
  }

  // Check: subtotal + tax = total
  if (subtotal && taxAmounts.length > 0 && total) {
    const taxSum = taxAmounts.reduce((acc, a) => acc + a.value, 0);
    const expected = subtotal.value + taxSum;
    const diff = Math.abs(expected - total.value);
    const tolerance = Math.max(total.value * 0.01, 1);

    checks.push({
      description: "Subtotal + tax vs. total",
      passed: diff <= tolerance,
      evidence: diff <= tolerance
        ? `Subtotal (₹${subtotal.value.toLocaleString("en-IN")}) + tax (₹${taxSum.toLocaleString("en-IN")}) = ₹${expected.toLocaleString("en-IN")}, matching the stated total of ₹${total.value.toLocaleString("en-IN")}.`
        : `Subtotal (₹${subtotal.value.toLocaleString("en-IN")}) + tax (₹${taxSum.toLocaleString("en-IN")}) = ₹${expected.toLocaleString("en-IN")}, but the stated total is ₹${total.value.toLocaleString("en-IN")} (difference: ₹${diff.toLocaleString("en-IN")}).`,
      confidence: diff <= tolerance ? 85 : 92,
    });
  }

  // Check: tax rate sanity (typically 5%, 12%, 18%, 28% for GST)
  if (subtotal && taxAmounts.length > 0) {
    const taxSum = taxAmounts.reduce((acc, a) => acc + a.value, 0);
    const taxRate = (taxSum / subtotal.value) * 100;
    const knownRates = [5, 12, 18, 28];
    const closestRate = knownRates.reduce((prev, curr) =>
      Math.abs(curr - taxRate) < Math.abs(prev - taxRate) ? curr : prev
    );
    const rateDeviation = Math.abs(taxRate - closestRate);

    if (rateDeviation > 2) {
      checks.push({
        description: "Tax rate anomaly",
        passed: false,
        evidence: `Calculated effective tax rate is ${taxRate.toFixed(1)}%, which does not match any standard GST rate (5%, 12%, 18%, 28%). Closest standard rate: ${closestRate}% (deviation: ${rateDeviation.toFixed(1)}%).`,
        confidence: 70,
      });
    }
  }

  return checks;
}

/**
 * Full invoice analysis: extract amounts and check arithmetic.
 */
export function analyzeInvoice(
  words: OcrWord[],
): InvoiceAnalysisResult {
  const amounts = extractCurrencyAmounts(words);
  const arithmeticChecks = checkArithmetic(amounts);
  const hasEnoughData = amounts.length >= 2;

  return {
    amounts,
    arithmeticChecks,
    hasEnoughData,
  };
}
