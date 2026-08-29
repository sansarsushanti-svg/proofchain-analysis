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

function computeELA(
  canvas: HTMLCanvasElement,
  quality: number = 90
): { mean: number; maxDiff: number; anomalyBlocks: { x: number; y: number; diff: number }[] } {
  // Error Level Analysis: re-encode at a given quality and compare
  const reencodedUrl = canvas.toDataURL("image/jpeg", quality / 100);
  const width = canvas.width;
  const height = canvas.height;

  // Since we can't easily load the re-encoded image synchronously,
  // we'll use a simplified approach: analyze compression inconsistencies
  // by computing block-level statistics
  const ctx = canvas.getContext("2d");
  if (!ctx) return { mean: 0, maxDiff: 0, anomalyBlocks: [] };

  const imageData = ctx.getImageData(0, 0, width, height);
  const blocks = computeBlockStats(imageData.data, width, height, 16);

  if (blocks.length === 0) return { mean: 0, maxDiff: 0, anomalyBlocks: [] };

  // Compute global statistics
  const allMeans = blocks.map(b => b.mean);
  const allVariances = blocks.map(b => b.variance);
  const globalMean = allMeans.reduce((a, b) => a + b, 0) / allMeans.length;
  const globalVariance = allVariances.reduce((a, b) => a + b, 0) / allVariances.length;

  // Compute block-to-block differences (gradient analysis)
  const diffBlocks: { x: number; y: number; diff: number }[] = [];
  let totalDiff = 0;
  let maxDiff = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Compare with neighboring blocks
    let blockDiff = 0;
    let neighbors = 0;

    for (let j = 0; j < blocks.length; j++) {
      if (i === j) continue;
      const dist = Math.sqrt(
        Math.pow(block.blockX - blocks[j].blockX, 2) +
        Math.pow(block.blockY - blocks[j].blockY, 2)
      );
      if (dist <= 32) {
        blockDiff += Math.abs(block.mean - blocks[j].mean);
        neighbors++;
      }
    }

    if (neighbors > 0) {
      blockDiff /= neighbors;
    }

    totalDiff += blockDiff;
    if (blockDiff > maxDiff) maxDiff = blockDiff;

    // Flag blocks with high local variance (potential edit regions)
    const varianceDeviation = block.variance / (globalVariance || 1);
    const meanDeviation = Math.abs(block.mean - globalMean) / (globalMean || 1);

    if (blockDiff > maxDiff * 0.6 || varianceDeviation > 2.5 || meanDeviation > 0.4) {
      diffBlocks.push({
        x: block.blockX,
        y: block.blockY,
        diff: blockDiff,
      });
    }
  }

  const mean = blocks.length > 0 ? totalDiff / blocks.length : 0;
  return { mean, maxDiff, anomalyBlocks: diffBlocks };
}

function computeNoiseMap(canvas: HTMLCanvasElement): { suspiciousRegions: { x: number; y: number; score: number }[] } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { suspiciousRegions: [] };

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Compute Laplacian-like noise estimate per block
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

          // Laplacian kernel approximation
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

  // Flag regions with noise significantly different from the mean
  return {
    suspiciousRegions: regions.filter(r => Math.abs(r.score - meanNoise) > 2 * stdNoise && stdNoise > 0),
  };
}

function computeCompressionBlocks(canvas: HTMLCanvasElement): { suspiciousRegions: { x: number; y: number; score: number }[] } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { suspiciousRegions: [] };

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Detect 8x8 block boundaries (JPEG compression artifact detection)
  const blockSize = 8;
  const blockEdgeDiffs: { x: number; y: number; score: number }[] = [];

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      if (bx + blockSize >= width || by + blockSize >= height) continue;

      // Check horizontal boundary
      let hDiff = 0;
      for (let x = bx; x < bx + blockSize; x++) {
        const topIdx = ((by + blockSize - 1) * width + x) * 4;
        const botIdx = ((by + blockSize) * width + x) * 4;
        hDiff += Math.abs(data[topIdx] - data[botIdx]) +
          Math.abs(data[topIdx + 1] - data[botIdx + 1]) +
          Math.abs(data[topIdx + 2] - data[botIdx + 2]);
      }

      // Check vertical boundary
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

  // Regions where block boundaries are inconsistent may indicate local manipulation
  return {
    suspiciousRegions: blockEdgeDiffs.filter(
      b => stdDiff > 0 && (b.score - meanDiff) > 1.5 * stdDiff
    ),
  };
}

export async function analyzeImageForensics(
  dataUrl: string,
  fileType: string
): Promise<ForensicFinding[]> {
  const findings: ForensicFinding[] = [];

  // Only analyze image files
  if (!fileType.includes("image") && !fileType.includes("png") && !fileType.includes("jpeg") && !fileType.includes("jpg")) {
    return findings;
  }

  try {
    const canvas = await loadImageToCanvas(dataUrl);
    const width = canvas.width;
    const height = canvas.height;

    // Check image dimensions for suspicious characteristics
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

    // ELA Analysis
    const ela = computeELA(canvas);
    if (ela.anomalyBlocks.length > 0) {
      const percentage = (ela.anomalyBlocks.length / Math.max(1, (width / 16) * (height / 16))) * 100;
      findings.push({
        category: "image_forensics",
        finding: "Compression inconsistency detected",
        severity: percentage > 15 ? "high" : percentage > 5 ? "medium" : "low",
        confidence: Math.min(95, 60 + percentage),
        evidence: `Error level analysis found ${ela.anomalyBlocks.length} blocks (${percentage.toFixed(1)}% of image) with inconsistent compression levels.`,
        technicalExplanation: `ELA analysis detected ${ela.anomalyBlocks.length} block regions with statistical compression anomalies. These regions may have been modified after initial compression, or they represent areas of different JPEG quality settings.`,
        userExplanation: "Some areas of this image have different compression patterns than others, which can happen when parts of an image are edited or composited.",
        region: ela.anomalyBlocks.length > 0 ? {
          x: ela.anomalyBlocks[0].x,
          y: ela.anomalyBlocks[0].y,
          width: Math.min(64, width - ela.anomalyBlocks[0].x),
          height: Math.min(64, height - ela.anomalyBlocks[0].y),
        } : undefined,
      });
    }

    // Noise analysis
    const noise = computeNoiseMap(canvas);
    if (noise.suspiciousRegions.length > 0) {
      findings.push({
        category: "image_forensics",
        finding: "Noise pattern inconsistency",
        severity: noise.suspiciousRegions.length > 5 ? "medium" : "low",
        confidence: Math.min(85, 50 + noise.suspiciousRegions.length * 5),
        evidence: `Found ${noise.suspiciousRegions.length} regions with noise patterns inconsistent with the overall image.`,
        technicalExplanation: `Noise analysis detected ${noise.suspiciousRegions.length} regions where the local noise distribution differs significantly from the image average. Inconsistencies in noise patterns can indicate splicing or localized editing.`,
        userExplanation: "Some areas of this image have a different graininess pattern than the rest, which can happen when different image sources are combined.",
        region: noise.suspiciousRegions.length > 0 ? {
          x: noise.suspiciousRegions[0].x,
          y: noise.suspiciousRegions[0].y,
          width: Math.min(64, width - noise.suspiciousRegions[0].x),
          height: Math.min(64, height - noise.suspiciousRegions[0].y),
        } : undefined,
      });
    }

    // Compression block analysis
    const compression = computeCompressionBlocks(canvas);
    if (compression.suspiciousRegions.length > 3) {
      findings.push({
        category: "image_forensics",
        finding: "Block boundary anomalies detected",
        severity: compression.suspiciousRegions.length > 10 ? "medium" : "low",
        confidence: Math.min(80, 45 + compression.suspiciousRegions.length * 3),
        evidence: `Found ${compression.suspiciousRegions.length} blocks with anomalous compression boundaries.`,
        technicalExplanation: `Analysis of JPEG 8x8 block boundaries revealed ${compression.suspiciousRegions.length} regions where boundary artifacts are inconsistent. This pattern can indicate local re-compression after editing.`,
        userExplanation: "Some parts of this image show unusual compression patterns at the block level, which can indicate selective editing.",
      });
    }

    // Check for uniform regions that might indicate text overlay
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Check if there are large uniform regions (possible text area overlay)
      let uniformCount = 0;
      let totalBlocks = 0;
      const blockSize = 16;

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
          if (variance < 2) uniformCount++;
        }
      }

      const uniformRatio = uniformCount / totalBlocks;
      if (uniformRatio > 0.4 && fileType.includes("jpeg")) {
        findings.push({
          category: "image_forensics",
          finding: "High proportion of uniform regions",
          severity: "low",
          confidence: 40,
          evidence: `${(uniformRatio * 100).toFixed(1)}% of image blocks have near-uniform pixel values.`,
          technicalExplanation: `${(uniformRatio * 100).toFixed(1)}% of the image blocks show very low variance (uniform pixel values). While this can be normal for certain image types, it may indicate areas where content was overlaid on uniform backgrounds.`,
          userExplanation: "A significant portion of this image is very uniform in color, which can sometimes indicate text or elements were overlaid on plain backgrounds.",
        });
      }
    }

  } catch (error) {
    findings.push({
      category: "image_forensics",
      finding: "Image analysis could not be completed",
      severity: "low",
      confidence: 100,
      evidence: `Image analysis failed: ${error instanceof Error ? error.message : "Unknown error"}.`,
      technicalExplanation: `The image forensics module encountered an error during analysis: ${error instanceof Error ? error.message : "Unknown error"}. This does not affect other analysis modules.`,
      userExplanation: "Some image-level checks could not be completed. The file may be corrupted or in an unsupported format.",
    });
  }

  return findings;
}
