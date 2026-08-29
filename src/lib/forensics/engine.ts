import type { ForensicFinding, IntegrityResult } from "./types";
import { analyzeMetadata } from "./metadata";
import { analyzeImageForensics } from "./imageForensics";
import { analyzePdfStructure } from "./pdfAnalysis";
import { analyzeTextAndLayout } from "./textAnalysis";
import { calculateIntegrityScore } from "./scoring";
import { renderPdfPage } from "./pdfRenderer";
import { runOcr } from "./ocr";
import { analyzeInvoice } from "./invoiceAnalysis";
import { correlateEvidence } from "./correlation";

const LOG_PREFIX = "[ProofChain]";

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${msg}`);
}

function logError(msg: string, err?: unknown) {
  console.error(`${LOG_PREFIX} ${msg}`, err ?? "");
}

/**
 * Race a promise against a timeout.
 * Returns the promise result or throws a timeout error.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

export type AnalysisCallback = (stage: string, status: "analyzing" | "completed") => void;

export interface EngineOptions {
  onStageUpdate?: AnalysisCallback;
}

export async function runForensicAnalysis(
  file: {
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  },
  options: EngineOptions = {}
): Promise<IntegrityResult> {
  const { onStageUpdate } = options;
  const allFindings: ForensicFinding[] = [];
  const modulesRun: string[] = [];

  const update = (stage: string, status: "analyzing" | "completed") => {
    log(`Stage: ${stage} [${status}]`);
    onStageUpdate?.(stage, status);
  };

  const fileType = file.type.toLowerCase();
  const isImage = fileType.includes("image") || fileType.includes("png") || fileType.includes("jpeg") || fileType.includes("jpg");
  const isPdf = fileType.includes("pdf");

  log(`File: ${file.name} (${file.type}), isPdf=${isPdf}, isImage=${isImage}`);

  // Track rendered PDF image for downstream analysis
  let renderedPdfDataUrl: string | null = null;

  // ── Stage 1: File received ──
  update("received", "analyzing");
  update("received", "completed");

  // ── Stage 2: Metadata analysis ──
  update("metadata", "analyzing");
  try {
    const metadataFindings = analyzeMetadata({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      lastModified: Date.now(),
      dataUrl: file.dataUrl,
    });
    allFindings.push(...metadataFindings);
    modulesRun.push("metadata");
    log(`Metadata: ${metadataFindings.length} finding(s)`);
  } catch (error) {
    logError("Metadata analysis failed:", error);
    allFindings.push({
      category: "metadata",
      finding: "Metadata analysis failed",
      severity: "low",
      confidence: 100,
      evidence: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
      technicalExplanation: "The metadata analysis module encountered an error.",
      userExplanation: "Metadata analysis could not be completed for this file.",
    });
  }
  update("metadata", "completed");

  // ── Stage 3: PDF rendering (for PDFs) ──
  let ocrWords: { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }[] = [];

  if (isPdf) {
    update("render", "analyzing");
    try {
      log("Starting PDF render (timeout: 30s)...");
      const rendered = await withTimeout(
        renderPdfPage(file.dataUrl),
        30_000,
        "PDF rendering"
      );
      if (rendered) {
        renderedPdfDataUrl = rendered.dataUrl;
        modulesRun.push("pdf_render");
        log(`PDF rendered: ${rendered.width}x${rendered.height}, ${rendered.totalPages} page(s)`);
      } else {
        log("PDF render returned null");
      }
    } catch (error) {
      logError("PDF rendering failed:", error);
    }
    update("render", "completed");

    // ── Stage 4: PDF structure analysis ──
    update("structure", "analyzing");
    try {
      const pdfFindings = analyzePdfStructure(file.dataUrl, file.name);
      allFindings.push(...pdfFindings);
      modulesRun.push("pdf_structure");
      log(`PDF structure: ${pdfFindings.length} finding(s)`);
    } catch (error) {
      logError("PDF structure analysis failed:", error);
      allFindings.push({
        category: "pdf_structure",
        finding: "PDF analysis failed",
        severity: "low",
        confidence: 100,
        evidence: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
        technicalExplanation: "The PDF analysis module encountered an error.",
        userExplanation: "PDF structure analysis could not be completed.",
      });
    }
    update("structure", "completed");

    // ── Stage 5: OCR (on rendered PDF image) ──
    if (renderedPdfDataUrl) {
      update("ocr", "analyzing");
      try {
        log("Starting OCR (timeout: 60s)...");
        const ocrResult = await withTimeout(
          runOcr(renderedPdfDataUrl),
          60_000,
          "OCR"
        );
        if (ocrResult.success) {
          ocrWords = ocrResult.words;
          modulesRun.push("ocr");
          log(`OCR: ${ocrWords.length} word(s), confidence=${ocrResult.confidence.toFixed(1)}%`);
        } else {
          logError("OCR returned failure:", ocrResult.error);
        }
      } catch (error) {
        logError("OCR failed:", error);
      }
      update("ocr", "completed");

      // ── Stage 6: Invoice/value analysis ──
      if (ocrWords.length > 0) {
        update("invoice", "analyzing");
        try {
          const invoiceResult = analyzeInvoice(ocrWords);

          // Add invoice findings
          if (invoiceResult.amounts.length > 0) {
            const amountsDesc = invoiceResult.amounts
              .map((a) => `${a.originalText} (${a.role})`)
              .join(", ");
            log(`Invoice: ${invoiceResult.amounts.length} amount(s): ${amountsDesc}`);
            allFindings.push({
              category: "invoice_analysis",
              finding: `Detected ${invoiceResult.amounts.length} currency amount(s) in document`,
              severity: "low",
              confidence: 80,
              evidence: `OCR identified currency amounts: ${amountsDesc}.`,
              technicalExplanation: `Extracted ${invoiceResult.amounts.length} currency amounts from OCR data: ${amountsDesc}.`,
              userExplanation: `Found ${invoiceResult.amounts.length} monetary values in the document.`,
            });
          } else {
            log("Invoice: no currency amounts detected");
          }

          // Add arithmetic check findings
          for (const check of invoiceResult.arithmeticChecks) {
            log(`Arithmetic check: ${check.description} -> ${check.passed ? "PASS" : "FAIL"}`);
            if (!check.passed) {
              allFindings.push({
                category: "invoice_analysis",
                finding: `Arithmetic inconsistency: ${check.description}`,
                severity: "high",
                confidence: check.confidence,
                evidence: check.evidence,
                technicalExplanation: `Arithmetic verification failed: ${check.description}. ${check.evidence}`,
                userExplanation: `The mathematical relationships between numbers in this document are inconsistent. This may indicate values were altered.`,
              });
            }
          }

          modulesRun.push("invoice_analysis");
        } catch (error) {
          logError("Invoice analysis failed:", error);
        }
        update("invoice", "completed");
      } else {
        log("Skipping invoice analysis (no OCR words)");
        update("invoice", "analyzing");
        update("invoice", "completed");
      }
    } else {
      log("Skipping OCR and invoice analysis (PDF did not render)");
      update("ocr", "analyzing");
      update("ocr", "completed");
      update("invoice", "analyzing");
      update("invoice", "completed");
    }
  } else {
    // Not a PDF — skip PDF-specific stages
    update("render", "analyzing");
    update("render", "completed");
    update("structure", "analyzing");
    update("structure", "completed");
    update("ocr", "analyzing");
    update("ocr", "completed");
    update("invoice", "analyzing");
    update("invoice", "completed");
  }

  // ── Stage 7: Image forensics ──
  update("forensics", "analyzing");
  let imageForensicsFindings: ForensicFinding[] = [];

  // Run image forensics on the original image OR the rendered PDF
  const imageForForensics = isImage ? file.dataUrl : renderedPdfDataUrl;

  if (imageForForensics) {
    try {
      log("Starting image forensics (timeout: 30s)...");
      imageForensicsFindings = await withTimeout(
        analyzeImageForensics(
          imageForForensics,
          isPdf ? "image/png" : file.type // Rendered PDF is always PNG
        ),
        30_000,
        "Image forensics"
      );
      allFindings.push(...imageForensicsFindings);
      modulesRun.push("image_forensics");
      log(`Image forensics: ${imageForensicsFindings.length} finding(s)`);
    } catch (error) {
      logError("Image forensics failed:", error);
      allFindings.push({
        category: "image_forensics",
        finding: "Image forensics failed",
        severity: "low",
        confidence: 100,
        evidence: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
        technicalExplanation: "The image forensics module encountered an error.",
        userExplanation: "Image analysis could not be completed.",
      });
    }
  } else {
    log("Skipping image forensics (no image available)");
  }
  update("forensics", "completed");

  // ── Stage 7b: Text/layout analysis (for images only) ──
  if (isImage) {
    try {
      const textFindings = analyzeTextAndLayout(file.dataUrl, file.type);
      allFindings.push(...textFindings);
      modulesRun.push("text_layout");
    } catch (error) {
      // non-critical
    }
  }

  // ── Stage 8: Evidence correlation ──
  update("correlate", "analyzing");
  try {
    const invoiceAmounts = ocrWords.length > 0 ? analyzeInvoice(ocrWords).amounts : [];
    const correlationFindings = correlateEvidence(
      imageForensicsFindings,
      ocrWords,
      invoiceAmounts
    );
    allFindings.push(...correlationFindings);
    if (correlationFindings.length > 0) {
      modulesRun.push("correlation");
      log(`Correlation: ${correlationFindings.length} finding(s)`);
    } else {
      log("Correlation: no overlapping regions found");
    }
  } catch (error) {
    logError("Correlation failed:", error);
  }
  update("correlate", "completed");

  // ── Stage 9: Calculate integrity score ──
  update("score", "analyzing");
  const result = calculateIntegrityScore(allFindings, {
    analysisTimestamp: new Date().toISOString(),
    fileType: file.type,
    fileName: file.name,
    fileSize: file.size,
    modulesRun,
  });
  log(`Score: ${result.integrityScore}/100 (${result.riskLevel}), ${result.findings.length} total finding(s), modules: [${modulesRun.join(", ")}]`);
  update("score", "completed");

  // ── Stage 10: Prepare explanation ──
  update("explain", "analyzing");
  // Explanation is generated synchronously from findings (in ai.ts)
  update("explain", "completed");

  log("Complete");
  return result;
}
