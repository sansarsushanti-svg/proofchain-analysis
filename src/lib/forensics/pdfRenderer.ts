/**
 * PDF Renderer — renders PDF pages to canvas for downstream analysis.
 * Uses pdfjs-dist for browser-compatible PDF rendering.
 */

import * as pdfjsLib from "pdfjs-dist";

// Configure worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface RenderedPdfPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dataUrl: string;
  pageNum: number;
  totalPages: number;
}

/**
 * Convert a base64 data URL to a Uint8Array.
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Render the first page of a PDF to a canvas.
 * Returns the canvas, dimensions, data URL, and page info.
 * Returns null if rendering fails.
 */
export async function renderPdfPage(
  dataUrl: string,
  scale: number = 2.0
): Promise<RenderedPdfPage | null> {
  try {
    const bytes = dataUrlToBytes(dataUrl);

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdfDoc = await loadingTask.promise;

    const totalPages = pdfDoc.numPages;
    const page = await pdfDoc.getPage(1);

    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render using canvas parameter (new pdfjs-dist API)
    await page.render({
      canvas,
      viewport,
    }).promise;

    const dataUrlOut = canvas.toDataURL("image/png");

    return {
      canvas,
      width: viewport.width,
      height: viewport.height,
      dataUrl: dataUrlOut,
      pageNum: 1,
      totalPages,
    };
  } catch (error) {
    console.error("PDF rendering failed:", error);
    return null;
  }
}
