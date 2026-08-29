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
 * Run OCR on an image data URL.
 * Returns structured results with word-level bounding boxes.
 * Returns a structured failure if OCR cannot initialize or fails.
 */
export async function runOcr(imageDataUrl: string): Promise<OcrResult> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    worker = await createWorker("eng");

    const { data } = await worker.recognize(imageDataUrl);

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

    return {
      text: data.text,
      words,
      confidence: data.confidence,
      success: true,
    };
  } catch (error) {
    return {
      text: "",
      words: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "OCR failed",
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}
