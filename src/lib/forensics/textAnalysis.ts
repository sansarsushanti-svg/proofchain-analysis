import type { ForensicFinding } from "./types";

interface TextBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelCount: number;
  darkPixelRatio: number;
  avgColor: number;
}

function extractTextRegionsFromImage(
  data: Uint8ClampedArray,
  width: number,
  height: number
): TextBlock[] {
  const blocks: TextBlock[] = [];
  const blockSize = 24;

  // Binarize the image
  const binary = new Uint8Array(width * height);
  let totalDark = 0;
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    // Adaptive threshold
    if (gray < 128) {
      binary[i] = 1;
      totalDark++;
    }
  }

  const darkRatio = totalDark / (width * height);
  const threshold = darkRatio > 0.5 ? 128 : 128; // Simple threshold for MVP

  // Find connected regions of dark pixels (text-like blocks)
  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      let darkCount = 0;
      let pixelCount = 0;
      let colorSum = 0;

      for (let y = by; y < Math.min(by + blockSize, height); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
          const idx = y * width + x;
          if (binary[idx]) {
            darkCount++;
          }
          const cidx = idx * 4;
          colorSum += data[cidx] + data[cidx + 1] + data[cidx + 2];
          pixelCount++;
        }
      }

      const darkPixelRatio = pixelCount > 0 ? darkCount / pixelCount : 0;

      // Text blocks typically have 5-50% dark pixels
      if (darkPixelRatio > 0.05 && darkPixelRatio < 0.5) {
        blocks.push({
          x: bx,
          y: by,
          width: Math.min(blockSize, width - bx),
          height: Math.min(blockSize, height - by),
          pixelCount,
          darkPixelRatio,
          avgColor: pixelCount > 0 ? colorSum / (pixelCount * 3) : 128,
        });
      }
    }
  }

  return blocks;
}

function analyzeLayoutConsistency(
  textBlocks: TextBlock[],
  imageWidth: number,
  imageHeight: number
): { inconsistencies: number; details: string } {
  if (textBlocks.length < 3) {
    return { inconsistencies: 0, details: "Too few text blocks for layout analysis." };
  }

  let inconsistencies = 0;
  const details: string[] = [];

  // Check for misaligned text blocks
  // Group blocks by approximate y-position
  const yBuckets: Map<number, TextBlock[]> = new Map();
  for (const block of textBlocks) {
    const yKey = Math.round(block.y / 24) * 24;
    if (!yBuckets.has(yKey)) yBuckets.set(yKey, []);
    yBuckets.get(yKey)!.push(block);
  }

  // Check alignment within rows
  for (const [, blocks] of yBuckets) {
    if (blocks.length < 2) continue;
    const avgColor = blocks.reduce((sum, b) => sum + b.avgColor, 0) / blocks.length;
    const colorVariance = Math.sqrt(
      blocks.reduce((sum, b) => sum + (b.avgColor - avgColor) ** 2, 0) / blocks.length
    );

    if (colorVariance > 40) {
      inconsistencies++;
      details.push(`Text block color inconsistency (variance: ${colorVariance.toFixed(1)})`);
    }
  }

  // Check for size inconsistencies within text regions
  if (textBlocks.length > 5) {
    const sizes = textBlocks.map(b => b.darkPixelRatio);
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const sizeStd = Math.sqrt(sizes.reduce((sum, s) => sum + (s - avgSize) ** 2, 0) / sizes.length);

    if (sizeStd > avgSize * 0.5) {
      inconsistencies++;
      details.push(`Text size inconsistency detected (std dev: ${sizeStd.toFixed(3)})`);
    }
  }

  return {
    inconsistencies,
    details: details.join("; ") || "No significant layout inconsistencies.",
  };
}

export function analyzeTextAndLayout(
  dataUrl: string,
  fileType: string
): ForensicFinding[] {
  const findings: ForensicFinding[] = [];

  // Only analyze image files (for text-on-image detection)
  if (!fileType.includes("image") && !fileType.includes("png") && !fileType.includes("jpeg") && !fileType.includes("jpg")) {
    return findings;
  }

  try {
    const img = new Image();
    // We'll return a promise-like analysis but since this is a sync module,
    // we'll analyze what we can from the data URL
    const base64 = dataUrl.split(",")[1] || "";
    const binary = atob(base64);

    // For images, we can check for text overlay patterns
    // by analyzing the file's binary data for embedded text
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Check for common text-editing artifacts in image binary
    // Font embedding in images is unusual
    const text = new TextDecoder("latin1").decode(bytes);

    // Check for Adobe text layers (PSD-like features in images)
    if (text.includes("8BIM") || text.includes("Adobe Photoshop")) {
      findings.push({
        category: "text_layout",
        finding: "Image contains Photoshop metadata layers",
        severity: "medium",
        confidence: 70,
        evidence: "Detected 8BIM (Adobe Photoshop) markers in image binary data.",
        technicalExplanation: "The image contains Adobe Photoshop metadata markers (8BIM), indicating it was saved from or processed by Photoshop. This suggests the image has been through an editing pipeline.",
        userExplanation: "This image was processed by Adobe Photoshop, indicating it has been through editing software.",
      });
    }

    // Check for ICC color profiles that might indicate re-processing
    if (text.includes("ICC_PROFILE")) {
      findings.push({
        category: "text_layout",
        finding: "Embedded ICC color profile detected",
        severity: "low",
        confidence: 35,
        evidence: "The image contains an embedded ICC color profile.",
        technicalExplanation: "The image has an embedded ICC color profile. While this is common in professional photography, it can also indicate the image was processed through multiple applications.",
        userExplanation: "This image contains color profile data, suggesting it has been processed by design or photography software.",
      });
    }

    // For image files, try to detect if there's a mismatch between
    // the image dimensions and what you'd expect
    if (fileType.includes("png")) {
      // PNG chunk analysis
      let pos = 8;
      let textChunks = 0;
      let iccChunks = 0;

      while (pos < bytes.length - 8) {
        const chunkLen = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
        const chunkType = String.fromCharCode(
          bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]
        );

        if (chunkType === "tEXt" || chunkType === "iTXt" || chunkType === "zTXt") textChunks++;
        if (chunkType === "iCCP" || chunkType === "sRGB") iccChunks++;
        if (chunkType === "IEND") break;

        pos += 12 + chunkLen;
      }

      if (textChunks > 3) {
        findings.push({
          category: "text_layout",
          finding: "PNG contains many text metadata chunks",
          severity: "low",
          confidence: 40,
          evidence: `Found ${textChunks} text metadata chunks in the PNG file.`,
          technicalExplanation: `The PNG file contains ${textChunks} text metadata chunks. While common, an unusually high number can indicate extensive editing history.`,
          userExplanation: "This PNG file contains a lot of text metadata, which sometimes indicates extensive editing.",
        });
      }
    }

  } catch {
    // Silently continue
  }

  return findings;
}
