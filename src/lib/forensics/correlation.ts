/**
 * Evidence Correlation — cross-references image forensics suspicious regions
 * with OCR-detected text and invoice values to produce correlated findings.
 */

import type { ForensicFinding } from "./types";
import type { CurrencyAmount } from "./invoiceAnalysis";
import type { OcrWord } from "./ocr";

interface SuspiciousRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Check if two bounding boxes overlap or are within a threshold distance.
 */
function regionsOverlap(
  r1: { x0: number; y0: number; x1: number; y1: number },
  r2: SuspiciousRegion,
  threshold: number = 20,
): boolean {
  return !(
    r1.x1 + threshold < r2.x ||
    r1.x0 - threshold > r2.x + r2.width ||
    r1.y1 + threshold < r2.y ||
    r1.y0 - threshold > r2.y + r2.height
  );
}

/**
 * Check if a point is inside a region.
 */
function pointInRegion(
  px: number,
  py: number,
  region: SuspiciousRegion,
  threshold: number = 15,
): boolean {
  return (
    px >= region.x - threshold &&
    px <= region.x + region.width + threshold &&
    py >= region.y - threshold &&
    py <= region.y + region.height + threshold
  );
}

/**
 * Correlate image forensics suspicious regions with OCR words
 * and invoice amounts to produce correlated findings.
 */
export function correlateEvidence(
  imageForensicsFindings: ForensicFinding[],
  ocrWords: OcrWord[],
  invoiceAmounts: CurrencyAmount[],
): ForensicFinding[] {
  const correlatedFindings: ForensicFinding[] = [];

  // Extract suspicious regions from image forensics findings
  const suspiciousRegions: SuspiciousRegion[] = imageForensicsFindings
    .filter((f) => f.region)
    .map((f) => f.region!);

  if (suspiciousRegions.length === 0) {
    return correlatedFindings;
  }

  // 1. Check if any OCR words overlap with suspicious regions
  const overlappingWords: Array<{
    word: OcrWord;
    region: SuspiciousRegion;
    finding: ForensicFinding;
  }> = [];

  for (const finding of imageForensicsFindings) {
    if (!finding.region) continue;

    for (const word of ocrWords) {
      if (regionsOverlap(word.bbox, finding.region)) {
        overlappingWords.push({ word, region: finding.region, finding });
      }
    }
  }

  // 2. Check if any currency amounts overlap with suspicious regions
  for (const amount of invoiceAmounts) {
    for (const finding of imageForensicsFindings) {
      if (!finding.region) continue;

      if (regionsOverlap(amount.bbox, finding.region)) {
        // This is the critical correlation: a currency amount inside an anomalous region
        correlatedFindings.push({
          category: "text_image_correlation",
          finding: `Currency amount ${amount.originalText} located within an image-anomalous region`,
          severity: "critical",
          confidence: Math.min(95, Math.round((amount.confidence + finding.confidence) / 2)),
          evidence: `Image-level statistical anomaly (${finding.finding}) overlaps the OCR-detected amount "${amount.originalText}" at coordinates (${Math.round(amount.bbox.x0)}, ${Math.round(amount.bbox.y0)}). The amount was identified with ${amount.confidence.toFixed(0)}% OCR confidence.`,
          technicalExplanation: `Cross-referencing image forensics and OCR revealed that the currency amount ${amount.originalText} (OCR confidence: ${amount.confidence.toFixed(0)}%) is located within a region flagged by image analysis as exhibiting anomalous characteristics (${finding.technicalExplanation}). This spatial correlation indicates the region containing this financial value may have been modified.`,
          userExplanation: `The amount ${amount.originalText} is located in a part of the image that shows signs of possible alteration. This is a significant indicator that warrants verification of this specific value against the original document.`,
          region: amount.bbox
            ? {
                x: amount.bbox.x0,
                y: amount.bbox.y0,
                width: amount.bbox.x1 - amount.bbox.x0,
                height: amount.bbox.y1 - amount.bbox.y0,
              }
            : undefined,
        });
      }
    }
  }

  // 3. Check if any non-currency OCR text overlaps with suspicious regions
  const currencyTexts = new Set(invoiceAmounts.map((a) => a.originalText));
  const overlappingNonCurrencyWords = overlappingWords.filter(
    (w) => !currencyTexts.has(w.word.text)
  );

  if (overlappingNonCurrencyWords.length > 0 && correlatedFindings.length === 0) {
    // Only add if no currency overlap was found (to avoid redundant findings)
    const words = overlappingNonCurrencyWords.slice(0, 3);
    correlatedFindings.push({
      category: "text_image_correlation",
      finding: "Text content detected within image-anomalous region",
      severity: "medium",
      confidence: 65,
      evidence: `OCR detected text content (${words.map((w) => `"${w.word.text}"`).join(", ")}) overlapping with image-anomalous regions. ${overlappingNonCurrencyWords.length} text elements are co-located with statistical anomalies.`,
      technicalExplanation: `Image forensic analysis flagged regions with statistical anomalies, and OCR detected text content in overlapping areas. While this does not prove manipulation, the co-location of text and image anomalies is noteworthy.`,
      userExplanation: `Some text in the document is located in areas that show unusual image characteristics. This could indicate the text was added or modified after the original document was created.`,
    });
  }

  // 4. Aggregate suspicious regions into a summary finding
  if (suspiciousRegions.length > 0 && correlatedFindings.length === 0) {
    // Image forensics found anomalies but no text correlation
    const finding = imageForensicsFindings[0];
    correlatedFindings.push({
      category: "text_image_correlation",
      finding: "Image anomalies detected but no text overlap confirmed",
      severity: "low",
      confidence: 50,
      evidence: `${suspiciousRegions.length} image-anomalous region(s) detected, but no OCR text was found overlapping with these regions. Evidence is limited to image-level analysis.`,
      technicalExplanation: `Image forensics identified anomalous regions, but OCR did not detect text content overlapping with these specific areas. This could mean the anomalies are in non-text regions, or OCR was unable to read the content.`,
      userExplanation: `The analysis found unusual patterns in parts of the image, but could not confirm whether text content is affected. Additional manual review may be needed.`,
    });
  }

  return correlatedFindings;
}
