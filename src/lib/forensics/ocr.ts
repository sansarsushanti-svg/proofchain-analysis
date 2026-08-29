/**
 * OCR Module — extracts text and bounding boxes from rendered images
 * using tesseract.js.
 */

import { createWorker } from "tesseract.js";

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OcrResult {
  text: string;
  words: OcrWord[];
  confidence: number;
  success: boolean;
  error?: string;
}

/**
 * Race a promise against a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

/**
 * Run OCR on an image data URL.
 * Returns structured results with word-level bounding boxes.
 * Returns a structured failure if OCR cannot initialize or fails.
 */
export async function runOcr(imageDataUrl: string): Promise<OcrResult> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    // createWorker downloads language data from CDN — can hang if unreachable
    console.log("[ProofChain] OCR: creating worker (timeout: 30s)...");
    worker = await withTimeout(
      createWorker("eng"),
      30_000,
      "OCR worker creation"
    );
    console.log("[ProofChain] OCR: worker created, starting recognition (timeout: 30s)...");

    const { data } = await withTimeout(
      worker.recognize(imageDataUrl),
      30_000,
      "OCR recognition"
    );

    const words: OcrWord[] = [];

    // Traverse: blocks → paragraphs → lines → words
    if (data.blocks) {
      for (const block of data.blocks) {
        for (const paragraph of block.paragraphs) {
          for (const line of paragraph.lines) {
            for (const word of line.words) {
              words.push({
                text: word.text,
                confidence: word.confidence,
                bbox: {
                  x0: word.bbox.x0,
                  y0: word.bbox.y0,
                  x1: word.bbox.x1,
                  y1: word.bbox.y1,
                },
              });
            }
          }
        }
      }
    }

    console.log(`[ProofChain] OCR: done — ${words.length} word(s), confidence=${data.confidence.toFixed(1)}%`);
    return {
      text: data.text,
      words,
      confidence: data.confidence,
      success: true,
    };
  } catch (error) {
    console.error("[ProofChain] OCR failed:", error);
    return {
      text: "",
      words: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "OCR failed",
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore termination errors
      }
    }
  }
}
