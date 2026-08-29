import type { ForensicFinding, IntegrityResult } from "./types";
import { analyzeMetadata } from "./metadata";
import { analyzeImageForensics } from "./imageForensics";
import { analyzePdfStructure } from "./pdfAnalysis";
import { analyzeTextAndLayout } from "./textAnalysis";
import { calculateIntegrityScore } from "./scoring";

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

  // Stage 1: File received
  update("received", "analyzing");
  update("received", "completed");

  // Stage 2: Metadata analysis
  update("metadata", "analyzing");
  try {
    const metadataFindings = analyzeMetadata({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      lastModified: Date.now(), // Use current time for demo
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

  // Stage 3: Document structure analysis
  update("structure", "analyzing");
  if (isPdf) {
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
  }
  update("structure", "completed");

  // Stage 4: Image forensics
  update("forensics", "analyzing");
  if (isImage) {
    try {
      const imageFindings = await analyzeImageForensics(file.dataUrl, file.type);
      allFindings.push(...imageFindings);
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

  // Stage 5: Text and layout analysis
  update("text", "analyzing");
  if (isImage) {
    try {
      const textFindings = analyzeTextAndLayout(file.dataUrl, file.type);
      allFindings.push(...textFindings);
      modulesRun.push("text_layout");
    } catch (error) {
      allFindings.push({
        category: "text_layout",
        finding: "Text analysis failed",
        severity: "low",
        confidence: 100,
        evidence: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
        technicalExplanation: "The text analysis module encountered an error.",
        userExplanation: "Text analysis could not be completed.",
      });
    }
  }
  update("text", "completed");

  // Stage 6: Correlate evidence
  update("correlate", "analyzing");
  // Small delay to show the correlation stage
  await new Promise(resolve => setTimeout(resolve, 500));
  update("correlate", "completed");

  // Stage 7: Calculate integrity score
  update("score", "analyzing");
  const result = calculateIntegrityScore(allFindings, {
    analysisTimestamp: new Date().toISOString(),
    fileType: file.type,
    fileName: file.name,
    fileSize: file.size,
    modulesRun,
  });
  update("score", "completed");

  // Stage 8: Prepare explanation
  update("explain", "analyzing");
  await new Promise(resolve => setTimeout(resolve, 300));
  update("explain", "completed");

  return result;
}
