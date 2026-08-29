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
    onStageUpdate?.(stage, status);
  };

  const fileType = file.type.toLowerCase();
  const isImage = fileType.includes("image") || fileType.includes("png") || fileType.includes("jpeg") || fileType.includes("jpg");
  const isPdf = fileType.includes("pdf");

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
  } catch (error) {
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
      const rendered = await renderPdfPage(file.dataUrl);
      if (rendered) {
        renderedPdfDataUrl = rendered.dataUrl;
        modulesRun.push("pdf_render");
      }
    } catch (error) {
      console.error("PDF rendering failed:", error);
    }
    update("render", "completed");

    // ── Stage 4: PDF structure analysis ──
    update("structure", "analyzing");
    try {
      const pdfFindings = analyzePdfStructure(file.dataUrl, file.name);
      allFindings.push(...pdfFindings);
      modulesRun.push("pdf_structure");
    } catch (error) {
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
        const ocrResult = await runOcr(renderedPdfDataUrl);
        if (ocrResult.success) {
          ocrWords = ocrResult.words;
          modulesRun.push("ocr");
        }
      } catch (error) {
        console.error("OCR failed:", error);
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
            allFindings.push({
              category: "invoice_analysis",
              finding: `Detected ${invoiceResult.amounts.length} currency amount(s) in document`,
              severity: "low",
              confidence: 80,
              evidence: `OCR identified currency amounts: ${amountsDesc}.`,
              technicalExplanation: `Extracted ${invoiceResult.amounts.length} currency amounts from OCR data: ${amountsDesc}.`,
              userExplanation: `Found ${invoiceResult.amounts.length} monetary values in the document.`,
            });
          }

          // Add arithmetic check findings
          for (const check of invoiceResult.arithmeticChecks) {
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
          console.error("Invoice analysis failed:", error);
        }
        update("invoice", "completed");
      } else {
        update("invoice", "analyzing");
        update("invoice", "completed");
      }
    } else {
      // PDF didn't render — skip OCR and invoice analysis
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
      imageForensicsFindings = await analyzeImageForensics(
        imageForForensics,
        isPdf ? "image/png" : file.type // Rendered PDF is always PNG
      );
      allFindings.push(...imageForensicsFindings);
      modulesRun.push("image_forensics");
    } catch (error) {
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
  }
  update("forensics", "completed");

  // ── Stage 7b: Text/layout analysis (for images) ──
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
    }
  } catch (error) {
    console.error("Correlation failed:", error);
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
  update("score", "completed");

  // ── Stage 10: Prepare explanation ──
  update("explain", "analyzing");
  // Explanation is generated synchronously from findings (in ai.ts)
  update("explain", "completed");

  return result;
}
