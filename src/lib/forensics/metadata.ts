import type { ForensicFinding } from "./types";

interface FileMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  lastModified: number;
  dataUrl: string;
}

function extractExifFromDataUrl(dataUrl: string): Record<string, string> {
  const metadata: Record<string, string> = {};

  try {
    const base64 = dataUrl.split(",")[1] || "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Check for JPEG EXIF
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      metadata.format = "JPEG";

      // Look for EXIF marker
      let offset = 2;
      while (offset < bytes.length - 1) {
        if (bytes[offset] === 0xff && bytes[offset + 1] === 0xe1) {
          metadata.exifPresent = "Yes";

          // Try to extract basic EXIF info
          const exifLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
          const exifData = binary.substring(offset + 4, offset + 2 + exifLen);

          // Check for common EXIF tags (simplified)
          if (exifData.includes("Adobe")) {
            metadata.software = "Adobe";
          } else if (exifData.includes("Photoshop")) {
            metadata.software = "Adobe Photoshop";
          } else if (exifData.includes("GIMP")) {
            metadata.software = "GIMP";
          }
          break;
        }
        if (bytes[offset] === 0xff && bytes[offset + 1] === 0xda) break;
        if (bytes[offset] === 0xff && bytes[offset + 1] === 0xd9) break;
        offset += 2 + ((bytes[offset + 2] << 8) | bytes[offset + 3]);
      }
    }

    // Check for PNG
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      metadata.format = "PNG";
      // Check for tEXt chunks
      let pos = 8; // Skip PNG signature
      while (pos < bytes.length - 8) {
        const chunkLen = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
        const chunkType = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);

        if (chunkType === "tEXt" || chunkType === "iTXt") {
          let text = "";
          for (let i = 8; i < Math.min(8 + chunkLen, bytes.length); i++) {
            text += String.fromCharCode(bytes[i]);
          }
          const nullIdx = text.indexOf("\0");
          if (nullIdx >= 0) {
            const key = text.substring(0, nullIdx);
            const value = text.substring(nullIdx + 1);
            if (key.toLowerCase() === "software") metadata.software = value;
            if (key.toLowerCase() === "author") metadata.author = value;
            if (key.toLowerCase() === "description") metadata.description = value;
            if (key.toLowerCase().includes("creation")) metadata.creationTime = value;
          }
        }

        if (chunkType === "IEND") break;
        pos += 12 + chunkLen;
      }
    }
  } catch {
    // Metadata extraction failed silently
  }

  return metadata;
}

export function analyzeMetadata(
  file: FileMetadata
): ForensicFinding[] {
  const findings: ForensicFinding[] = [];

  // Analyze file metadata
  const exifData = extractExifFromDataUrl(file.dataUrl);
  const fileDate = new Date(file.lastModified);
  const now = new Date();

  // Check for future modification date
  if (fileDate > now) {
    findings.push({
      category: "metadata",
      finding: "Future-dated file modification timestamp",
      severity: "high",
      confidence: 85,
      evidence: `File modification date (${fileDate.toISOString()}) is in the future relative to current time.`,
      technicalExplanation: `The file's last modified timestamp is set to ${fileDate.toISOString()}, which is after the current date. This is a common indicator of metadata manipulation.`,
      userExplanation: "This file's date was set to a time in the future, which is unusual and may indicate the file metadata was modified.",
    });
  }

  // Check for very old dates on modern file types
  if (fileDate.getFullYear() < 2000 && file.fileType.includes("image")) {
    findings.push({
      category: "metadata",
      finding: "Unusually old timestamp for image file",
      severity: "medium",
      confidence: 70,
      evidence: `Image file timestamp is ${fileDate.getFullYear()}, before year 2000.`,
      technicalExplanation: `The file timestamp indicates year ${fileDate.getFullYear()}. While not conclusive, this is unusual for a modern image file and may suggest metadata manipulation.`,
      userExplanation: "The file date seems very old for this type of document. This could be legitimate but is worth noting.",
    });
  }

  // Check for software indicators
  if (exifData.software) {
    const editingSoftware = ["adobe photoshop", "gimp", "paint.net", "pixlr"];
    const isEditingSoftware = editingSoftware.some(s =>
      exifData.software?.toLowerCase().includes(s)
    );

    if (isEditingSoftware) {
      findings.push({
        category: "metadata",
        finding: `File was processed with editing software: ${exifData.software}`,
        severity: "medium",
        confidence: 75,
        evidence: `EXIF metadata indicates the file was processed by "${exifData.software}".`,
        technicalExplanation: `The file contains metadata indicating it was created or modified using ${exifData.software}. This does not prove manipulation but indicates the file was opened in an editing application.`,
        userExplanation: `This file was created or edited using ${exifData.software}. While this doesn't prove manipulation, it means the file has been through editing software.`,
      });
    }
  }

  // Check for metadata inconsistency: EXIF present but suspicious
  if (exifData.exifPresent === "Yes" && !exifData.software) {
    findings.push({
      category: "metadata",
      finding: "EXIF data present but incomplete",
      severity: "low",
      confidence: 55,
      evidence: "EXIF data block detected but key fields (software, author) are missing or stripped.",
      technicalExplanation: "The file contains an EXIF data block, but several standard fields appear to be missing. Partial metadata stripping can occur during editing workflows.",
      userExplanation: "The file has some technical data (EXIF) but key information has been removed. This sometimes happens when files are edited or processed.",
    });
  }

  // File size analysis
  const sizeKb = file.fileSize / 1024;
  if (file.fileType.includes("image") && sizeKb < 5) {
    findings.push({
      category: "metadata",
      finding: "Unusually small image file",
      severity: "low",
      confidence: 40,
      evidence: `Image file size is only ${sizeKb.toFixed(1)} KB.`,
      technicalExplanation: `The image is very small (${sizeKb.toFixed(1)} KB). This could indicate heavy compression or cropping, which might be related to manipulation.`,
      userExplanation: "This image file is very small, which could mean it has been heavily compressed or cropped.",
    });
  }

  return findings;
}
