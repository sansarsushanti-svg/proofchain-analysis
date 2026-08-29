import type { ForensicFinding } from "./types";

function loadImageToCanvas(
  dataUrl: string
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Cannot create canvas context"));
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

function computeBlockStats(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  blockSize: number
): { mean: number; variance: number; blockX: number; blockY: number }[] {
  const blocks: { mean: number; variance: number; blockX: number; blockY: number }[] = [];

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      let sum = 0;
      let sumSq = 0;
      let count = 0;

      for (let y = by; y < Math.min(by + blockSize, height); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
          const idx = (y * width + x) * 4;
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          sum += gray;
          sumSq += gray * gray;
          count++;
        }
      }

      if (count > 0) {
        const mean = sum / count;
        const variance = sumSq / count - mean * mean;
        blocks.push({ mean, variance, blockX: bx, blockY: by });
      }
    }
  }

  return blocks;
}

/**
 * Noise map analysis — format-neutral.
 * Computes Laplacian-like noise estimate per block and flags outliers.
 * Works for both JPEG and PNG.
 */
function computeNoiseMap(canvas: HTMLCanvasElement): { suspiciousRegions: { x: number; y: number; score: number }[] } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { suspiciousRegions: [] };

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const blockSize = 32;
  const regions: { x: number; y: number; score: number }[] = [];
  const noiseValues: number[] = [];

  for (let by = 0; by < height - blockSize; by += blockSize) {
    for (let bx = 0; bx < width - blockSize; bx += blockSize) {
      let noiseSum = 0;
      let count = 0;

      for (let y = by + 1; y < Math.min(by + blockSize - 1, height - 1); y++) {
        for (let x = bx + 1; x < Math.min(bx + blockSize - 1, width - 1); x++) {
          const idx = (y * width + x) * 4;
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

          const top = ((y - 1) * width + x) * 4;
          const bot = ((y + 1) * width + x) * 4;
          const left = (y * width + (x - 1)) * 4;
          const right = (y * width + (x + 1)) * 4;

          const laplacian =
            Math.abs(
              4 * gray -
              (0.299 * data[top] + 0.587 * data[top + 1] + 0.114 * data[top + 2]) -
              (0.299 * data[bot] + 0.587 * data[bot + 1] + 0.114 * data[bot + 2]) -
              (0.299 * data[left] + 0.587 * data[left + 1] + 0.114 * data[left + 2]) -
              (0.299 * data[right] + 0.587 * data[right + 1] + 0.114 * data[right + 2])
            );

          noiseSum += laplacian;
          count++;
        }
      }

      if (count > 0) {
        const noise = noiseSum / count;
        noiseValues.push(noise);
        regions.push({ x: bx, y: by, score: noise });
      }
    }
  }

  if (noiseValues.length === 0) return { suspiciousRegions: [] };

  const meanNoise = noiseValues.reduce((a, b) => a + b, 0) / noiseValues.length;
  const stdNoise = Math.sqrt(
    noiseValues.reduce((sum, v) => sum + (v - meanNoise) ** 2, 0) / noiseValues.length
  );

  return {
    suspiciousRegions: regions.filter(r => Math.abs(r.score - meanNoise) > 2 * stdNoise && stdNoise > 0),
  };
}

/**
 * Block-level gradient analysis — format-neutral.
 * Compares each block's mean intensity with its neighbors.
 * Flags blocks that deviate significantly from local neighborhood.
 */
function computeBlockGradientAnomalies(canvas: HTMLCanvasElement): { suspiciousRegions: { x: number; y: number; score: number }[] } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { suspiciousRegions: [] };

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const blocks = computeBlockStats(imageData.data, width, height, 16);

  if (blocks.length === 0) return { suspiciousRegions: [] };

  const suspiciousRegions: { x: number; y: number; score: number }[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Compute mean difference with neighboring blocks (within 48px)
    let blockDiff = 0;
    let neighbors = 0;

    for (let j = 0; j < blocks.length; j++) {
      if (i === j) continue;
      const dist = Math.sqrt(
        Math.pow(block.blockX - blocks[j].blockX, 2) +
        Math.pow(block.blockY - blocks[j].blockY, 2)
      );
      if (dist <= 48) {
        blockDiff += Math.abs(block.mean - blocks[j].mean);
        neighbors++;
      }
    }

    if (neighbors > 0) blockDiff /= neighbors;

    // Also check variance deviation
    const globalVariance = blocks.reduce((sum, b) => sum + b.variance, 0) / blocks.length;
    const varianceDeviation = block.variance / (globalVariance || 1);
    const globalMean = blocks.reduce((sum, b) => sum + b.mean, 0) / blocks.length;
    const meanDeviation = Math.abs(block.mean - globalMean) / (globalMean || 1);

    // Flag blocks with high local gradient or high variance deviation
    const threshold = 15; // Tuned for rendered document images
    if (blockDiff > threshold || varianceDeviation > 3.0 || meanDeviation > 0.3) {
      suspiciousRegions.push({
        x: block.blockX,
        y: block.blockY,
        score: blockDiff + varianceDeviation * 5,
      });
    }
  }

  return { suspiciousRegions };
}

/**
 * JPEG-specific compression block analysis.
 * Only meaningful for JPEG images. NOT for PNG or rendered PDF.
 */
function computeJpegCompressionBlocks(canvas: HTMLCanvasElement): { suspiciousRegions: { x: number; y: number; score: number }[] } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { suspiciousRegions: [] };

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const blockSize = 8;
  const blockEdgeDiffs: { x: number; y: number; score: number }[] = [];

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      if (bx + blockSize >= width || by + blockSize >= height) continue;

      let hDiff = 0;
      for (let x = bx; x < bx + blockSize; x++) {
        const topIdx = ((by + blockSize - 1) * width + x) * 4;
        const botIdx = ((by + blockSize) * width + x) * 4;
        hDiff += Math.abs(data[topIdx] - data[botIdx]) +
          Math.abs(data[topIdx + 1] - data[botIdx + 1]) +
          Math.abs(data[topIdx + 2] - data[botIdx + 2]);
      }

      let vDiff = 0;
      for (let y = by; y < by + blockSize; y++) {
        const leftIdx = (y * width + (bx + blockSize - 1)) * 4;
        const rightIdx = (y * width + (bx + blockSize)) * 4;
        vDiff += Math.abs(data[leftIdx] - data[rightIdx]) +
          Math.abs(data[leftIdx + 1] - data[rightIdx + 1]) +
          Math.abs(data[leftIdx + 2] - data[rightIdx + 2]);
      }

      const totalDiff = (hDiff + vDiff) / (blockSize * 3 * 2);
      blockEdgeDiffs.push({ x: bx, y: by, score: totalDiff });
    }
  }

  if (blockEdgeDiffs.length === 0) return { suspiciousRegions: [] };

  const meanDiff = blockEdgeDiffs.reduce((a, b) => a + b.score, 0) / blockEdgeDiffs.length;
  const stdDiff = Math.sqrt(
    blockEdgeDiffs.reduce((sum, b) => sum + (b.score - meanDiff) ** 2, 0) / blockEdgeDiffs.length
  );

  return {
    suspiciousRegions: blockEdgeDiffs.filter(
      b => stdDiff > 0 && (b.score - meanDiff) > 1.5 * stdDiff
    ),
  };
}

/**
 * Detect uniform regions that might indicate text overlay or fill.
 * Format-neutral.
 */
function detectUniformRegions(
  canvas: HTMLCanvasElement,
  fileType: string
): { suspiciousRegions: { x: number; y: number; score: number }[] } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { suspiciousRegions: [] };

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let uniformCount = 0;
  let totalBlocks = 0;
  const blockSize = 16;
  const suspiciousRegions: { x: number; y: number; score: number }[] = [];

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      if (bx + blockSize > width || by + blockSize > height) continue;
      totalBlocks++;

      let variance = 0;
      let sum = 0;
      for (let y = by; y < by + blockSize; y++) {
        for (let x = bx; x < bx + blockSize; x++) {
          const idx = (y * width + x) * 4;
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          sum += gray;
        }
      }
      const mean = sum / (blockSize * blockSize);
      for (let y = by; y < by + blockSize; y++) {
        for (let x = bx; x < bx + blockSize; x++) {
          const idx = (y * width + x) * 4;
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          variance += (gray - mean) ** 2;
        }
      }
      variance /= blockSize * blockSize;
      if (variance < 2) {
        uniformCount++;
        suspiciousRegions.push({ x: bx, y: by, score: 1 / (variance + 0.1) });
      }
    }
  }

  const uniformRatio = totalBlocks > 0 ? uniformCount / totalBlocks : 0;

  // Only flag if an unusual proportion of the image is uniform
  // (more relevant for JPEG where uniform fill after editing is suspicious)
  if (uniformRatio > 0.5) {
    return { suspiciousRegions: suspiciousRegions.slice(0, 10) }; // cap at 10
  }

  return { suspiciousRegions: [] };
}

export async function analyzeImageForensics(
  dataUrl: string,
  fileType: string
): Promise<ForensicFinding[]> {
  const findings: ForensicFinding[] = [];

  const isJpeg = fileType.includes("jpeg") || fileType.includes("jpg");
  const isPng = fileType.includes("png");
  const isImage = fileType.includes("image") || isJpeg || isPng;

  if (!isImage) {
    return findings;
  }

  try {
    const canvas = await loadImageToCanvas(dataUrl);
    const width = canvas.width;
    const height = canvas.height;

    // Check image dimensions
    if (width > 10000 || height > 10000) {
      findings.push({
        category: "image_forensics",
        finding: "Unusually large image dimensions",
        severity: "low",
        confidence: 45,
        evidence: `Image dimensions: ${width}x${height}.`,
        technicalExplanation: `The image is ${width}x${height} pixels, which is unusually large and may indicate a stitched or composite image.`,
        userExplanation: "This image is unusually large, which could indicate it was stitched together from multiple sources.",
      });
    }

    // Noise analysis — works for all image formats
    const noise = computeNoiseMap(canvas);
    if (noise.suspiciousRegions.length > 0) {
      findings.push({
        category: "image_forensics",
        finding: "Noise pattern inconsistency detected",
        severity: noise.suspiciousRegions.length > 5 ? "medium" : "low",
        confidence: Math.min(85, 50 + noise.suspiciousRegions.length * 5),
        evidence: `Found ${noise.suspiciousRegions.length} region(s) with noise patterns statistically different from the image average.`,
        technicalExplanation: `Laplacian noise analysis detected ${noise.suspiciousRegions.length} region(s) where the local noise distribution differs significantly (>2σ) from the image mean. Inconsistencies in noise patterns can indicate splicing or localized editing.`,
        userExplanation: "Some areas of this image have a different graininess pattern than the rest, which can happen when different image sources are combined or regions are edited.",
        region: noise.suspiciousRegions.length > 0 ? {
          x: noise.suspiciousRegions[0].x,
          y: noise.suspiciousRegions[0].y,
          width: Math.min(64, width - noise.suspiciousRegions[0].x),
          height: Math.min(64, height - noise.suspiciousRegions[0].y),
        } : undefined,
      });
    }

    // Block gradient analysis — format-neutral
    const gradient = computeBlockGradientAnomalies(canvas);
    if (gradient.suspiciousRegions.length > 3) {
      findings.push({
        category: "image_forensics",
        finding: "Block-level intensity anomalies detected",
        severity: gradient.suspiciousRegions.length > 8 ? "medium" : "low",
        confidence: Math.min(80, 45 + gradient.suspiciousRegions.length * 3),
        evidence: `Found ${gradient.suspiciousRegions.length} blocks with anomalous intensity gradients compared to local neighborhoods.`,
        technicalExplanation: `Block-level analysis detected ${gradient.suspiciousRegions.length} regions where the mean intensity deviates significantly from neighboring blocks. This can indicate localized editing where a region was modified independently of its surroundings.`,
        userExplanation: "Some parts of this image show unusual brightness/color patterns compared to surrounding areas, which can indicate selective editing.",
        region: gradient.suspiciousRegions.length > 0 ? {
          x: gradient.suspiciousRegions[0].x,
          y: gradient.suspiciousRegions[0].y,
          width: Math.min(64, width - gradient.suspiciousRegions[0].x),
          height: Math.min(64, height - gradient.suspiciousRegions[0].y),
        } : undefined,
      });
    }

    // JPEG-specific: compression block analysis
    if (isJpeg) {
      const compression = computeJpegCompressionBlocks(canvas);
      if (compression.suspiciousRegions.length > 3) {
        findings.push({
          category: "image_forensics",
          finding: "JPEG compression block boundary anomalies detected",
          severity: compression.suspiciousRegions.length > 10 ? "medium" : "low",
          confidence: Math.min(80, 45 + compression.suspiciousRegions.length * 3),
          evidence: `Found ${compression.suspiciousRegions.length} JPEG 8×8 blocks with anomalous compression boundaries.`,
          technicalExplanation: `Analysis of JPEG 8×8 block boundaries revealed ${compression.suspiciousRegions.length} regions where boundary artifacts are inconsistent. This pattern can indicate local re-compression after editing.`,
          userExplanation: "Some parts of this image show unusual compression patterns at the block level, which can indicate selective editing.",
        });
      }
    } else {
      // PNG / rendered PDF: skip JPEG-specific analysis, note format
      // No misleading "compression inconsistency" finding for non-JPEG
    }

    // Uniform region detection — format-neutral
    const uniform = detectUniformRegions(canvas, fileType);
    if (uniform.suspiciousRegions.length > 0) {
      findings.push({
        category: "image_forensics",
        finding: "High proportion of uniform regions detected",
        severity: "low",
        confidence: 40,
        evidence: `${uniform.suspiciousRegions.length} block(s) with near-uniform pixel values detected.`,
        technicalExplanation: `Several image blocks show very low variance in pixel values. While this can be normal for document backgrounds, an unusual concentration may indicate areas where content was overlaid on uniform fills.`,
        userExplanation: "Some areas of this image are very uniform in color, which can sometimes indicate content was overlaid on plain backgrounds.",
      });
    }

  } catch (error) {
    findings.push({
      category: "image_forensics",
      finding: "Image analysis could not be completed",
      severity: "low",
      confidence: 100,
      evidence: `Image analysis failed: ${error instanceof Error ? error.message : "Unknown error"}.`,
      technicalExplanation: `The image forensics module encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. This does not affect other analysis modules.`,
      userExplanation: "Some image-level checks could not be completed. The file may be corrupted or in an unsupported format.",
    });
  }

  return findings;
}
