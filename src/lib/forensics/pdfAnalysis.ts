import type { ForensicFinding } from "./types";

interface PdfStructure {
  version: string;
  objects: number;
  hasXref: boolean;
  hasTrailer: boolean;
  isEncrypted: boolean;
  streams: number;
  pages: number;
  embeddedImages: number;
  annotations: number;
  formFields: number;
  javascript: boolean;
  launchActions: boolean;
  suspiciousPatterns: string[];
}

function parsePdfStructure(data: Uint8Array): PdfStructure {
  const text = new TextDecoder("latin1").decode(data);
  const structure: PdfStructure = {
    version: "unknown",
    objects: 0,
    hasXref: false,
    hasTrailer: false,
    isEncrypted: false,
    streams: 0,
    pages: 0,
    embeddedImages: 0,
    annotations: 0,
    formFields: 0,
    javascript: false,
    launchActions: false,
    suspiciousPatterns: [],
  };

  // PDF version
  const versionMatch = text.match(/^%PDF-(\d+\.\d+)/);
  if (versionMatch) structure.version = versionMatch[1];

  // Count objects
  const objMatches = text.match(/\d+\s+\d+\s+obj/g);
  structure.objects = objMatches ? objMatches.length : 0;

  // Cross-reference table
  structure.hasXref = text.includes("xref") || text.includes("/XRefStm");

  // Trailer
  structure.hasTrailer = text.includes("trailer") || text.includes("/Info");

  // Encryption
  structure.isEncrypted = text.includes("/Encrypt");

  // Streams
  const streamMatches = text.match(/stream\r?\n/g);
  structure.streams = streamMatches ? streamMatches.length : 0;

  // Pages
  const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
  structure.pages = pageMatches ? pageMatches.length : 0;

  // Embedded images
  const imageMatches = text.match(/\/Subtype\s*\/Image/g);
  structure.embeddedImages = imageMatches ? imageMatches.length : 0;

  // Annotations
  const annotMatches = text.match(/\/Annots/g);
  structure.annotations = annotMatches ? annotMatches.length : 0;

  // Form fields
  const formMatches = text.match(/\/AcroForm/g);
  structure.formFields = formMatches ? formMatches.length : 0;

  // JavaScript
  structure.javascript = text.includes("/JavaScript") || text.includes("/JS ");
  if (structure.javascript) structure.suspiciousPatterns.push("Contains JavaScript");

  // Launch actions
  structure.launchActions = text.includes("/Launch") || text.includes("/Action");
  if (structure.launchActions) structure.suspiciousPatterns.push("Contains action/launch triggers");

  // Embedded files
  if (text.includes("/EmbeddedFile")) {
    structure.suspiciousPatterns.push("Contains embedded files");
  }

  // URI actions
  if (text.includes("/URI")) {
    structure.suspiciousPatterns.push("Contains URI actions");
  }

  // Check for incremental updates (modifications)
  const startxrefCount = (text.match(/startxref/g) || []).length;
  if (startxrefCount > 1) {
    structure.suspiciousPatterns.push(
      `Multiple incremental updates detected (${startxrefCount - 1} modifications)`
    );
  }

  return structure;
}

export function analyzePdfStructure(
  dataUrl: string,
  fileName: string
): ForensicFinding[] {
  const findings: ForensicFinding[] = [];

  try {
    const base64 = dataUrl.split(",")[1] || "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Verify it's actually a PDF
    const header = new TextDecoder("latin1").decode(bytes.slice(0, 8));
    if (!header.startsWith("%PDF-")) {
      findings.push({
        category: "pdf_structure",
        finding: "File does not appear to be a valid PDF",
        severity: "high",
        confidence: 90,
        evidence: `File header: "${header}". Expected "%PDF-".`,
        technicalExplanation: `The file does not start with a valid PDF header. The first bytes are "${header}", which does not match the expected "%PDF-" signature. The file may have a wrong extension or be corrupted.`,
        userExplanation: "This file doesn't appear to be a properly formatted PDF file, which could mean it has been modified or corrupted.",
      });
      return findings;
    }

    const structure = parsePdfStructure(bytes);

    // Suspicious patterns
    for (const pattern of structure.suspiciousPatterns) {
      if (pattern.includes("JavaScript")) {
        findings.push({
          category: "pdf_structure",
          finding: "PDF contains JavaScript",
          severity: "high",
          confidence: 88,
          evidence: "The PDF contains /JavaScript or /JS elements.",
          technicalExplanation: "This PDF contains embedded JavaScript code. JavaScript in PDFs is commonly used in phishing and malware delivery. While some legitimate PDFs use JavaScript for interactive forms, this is a significant security concern.",
          userExplanation: "This PDF contains executable JavaScript code, which is unusual for standard documents and can be used maliciously.",
        });
      } else if (pattern.includes("launch") || pattern.includes("action")) {
        findings.push({
          category: "pdf_structure",
          finding: "PDF contains action or launch triggers",
          severity: "medium",
          confidence: 72,
          evidence: `Detected: ${pattern}.`,
          technicalExplanation: "The PDF contains action or launch triggers that could execute when opened. This is a potential security concern.",
          userExplanation: "This PDF contains triggers that could execute actions when the file is opened.",
        });
      } else if (pattern.includes("embedded")) {
        findings.push({
          category: "pdf_structure",
          finding: "PDF contains embedded files",
          severity: "medium",
          confidence: 68,
          evidence: "The PDF contains /EmbeddedFile objects.",
          technicalExplanation: "This PDF contains embedded files within it. While some legitimate documents use this feature, it can also be used to hide malicious payloads.",
          userExplanation: "This PDF contains other files embedded within it, which is unusual for standard documents.",
        });
      } else if (pattern.includes("URI")) {
        findings.push({
          category: "pdf_structure",
          finding: "PDF contains URI references",
          severity: "low",
          confidence: 50,
          evidence: "The PDF contains /URI elements that reference external resources.",
          technicalExplanation: "This PDF contains URI references to external resources. When opened, these may attempt to connect to external servers.",
          userExplanation: "This PDF contains links to external resources.",
        });
      } else if (pattern.includes("incremental")) {
        findings.push({
          category: "pdf_structure",
          finding: "Multiple incremental updates detected",
          severity: "medium",
          confidence: 75,
          evidence: pattern,
          technicalExplanation: "The PDF has been modified multiple times (incremental updates). Each update appends new data to the PDF without removing the old, which means the history of changes is partially preserved in the file.",
          userExplanation: "This PDF has been modified multiple times. The modification history is partially preserved in the file structure.",
        });
      }
    }

    // Encryption check
    if (structure.isEncrypted) {
      findings.push({
        category: "pdf_structure",
        finding: "PDF is encrypted",
        severity: "low",
        confidence: 40,
        evidence: "The PDF contains an /Encrypt dictionary.",
        technicalExplanation: "The PDF uses encryption/password protection. This limits what analysis can be performed on the file.",
        userExplanation: "This PDF is password-protected, which limits what analysis can be done.",
      });
    }

    // Structure health
    if (!structure.hasXref && structure.version !== "unknown") {
      findings.push({
        category: "pdf_structure",
        finding: "Missing cross-reference table",
        severity: "medium",
        confidence: 65,
        evidence: "The PDF lacks a standard xref table or stream.",
        technicalExplanation: "The PDF does not contain a standard cross-reference table, which is required for valid PDF structure. The file may be truncated or modified.",
        userExplanation: "This PDF appears to be missing standard structural components, which may indicate corruption or modification.",
      });
    }

    // Too few objects
    if (structure.objects < 3 && structure.pages > 0) {
      findings.push({
        category: "pdf_structure",
        finding: "Unusually few PDF objects",
        severity: "low",
        confidence: 45,
        evidence: `Only ${structure.objects} objects found for ${structure.pages} page(s).`,
        technicalExplanation: `The PDF contains only ${structure.objects} objects for ${structure.pages} pages, which is unusually few. Standard PDFs typically have significantly more objects per page.`,
        userExplanation: "This PDF has fewer internal components than expected for a document of this type.",
      });
    }

    // If no issues found
    if (findings.length === 0) {
      findings.push({
        category: "pdf_structure",
        finding: "No significant PDF structural anomaly detected",
        severity: "low",
        confidence: 75,
        evidence: "Standard PDF structure with no suspicious patterns detected.",
        technicalExplanation: "The PDF structure follows standard conventions. No JavaScript, launch actions, embedded files, or significant structural anomalies were detected.",
        userExplanation: "This PDF appears to have a standard file structure with no obvious red flags.",
      });
    }

  } catch (error) {
    findings.push({
      category: "pdf_structure",
      finding: "PDF analysis could not be completed",
      severity: "low",
      confidence: 100,
      evidence: `PDF analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      technicalExplanation: `The PDF structure analysis encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. The file may be corrupted or too large to parse.`,
      userExplanation: "Some structural checks could not be completed on this PDF file.",
    });
  }

  return findings;
}
