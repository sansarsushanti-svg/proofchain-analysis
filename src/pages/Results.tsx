import { useParams, useNavigate } from "react-router";
import { getSession, getSessionFindings } from "@/lib/sessionStore";
import { AppNav } from "@/components/shared/AppNav";
import { IntegrityScore } from "@/components/forensic/IntegrityScore";
import { CategorySummaryCard } from "@/components/forensic/CategorySummaryCard";
import { DocumentViewer } from "@/components/forensic/DocumentViewer";
import { FindingsPanel } from "@/components/forensic/FindingsPanel";
import { AiExplanation } from "@/components/forensic/AiExplanation";
import { getFindingsSummary } from "@/lib/forensics/scoring";
import type { ForensicFinding } from "@/lib/forensics/types";
import { downloadReport } from "@/lib/reportGenerator";
import {
  generateAiExplanation,
  type AiExplanation as AiExplanationType,
} from "@/lib/ai";
import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="pt-20 min-h-screen flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No session specified.</p>
        </main>
      </div>
    );
  }

  const session = getSession(sessionId);
  const dbFindings = getSessionFindings(sessionId);

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="pt-20 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              This session could not be found.
            </p>
            <button
              onClick={() => navigate("/upload")}
              className="nb-btn-primary px-5 py-2.5 bg-foreground text-background"
            >
              New Analysis
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (session.status !== "completed") {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="pt-20 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {session.status === "failed"
                ? "This analysis failed to complete."
                : "This session is still in progress or has not completed."}
            </p>
            <button
              onClick={() => navigate("/upload")}
              className="nb-btn-primary px-5 py-2.5 bg-foreground text-background"
            >
              New Analysis
            </button>
          </div>
        </main>
      </div>
    );
  }

  const findings: ForensicFinding[] = dbFindings.map((f) => ({
    category: f.category as ForensicFinding["category"],
    finding: f.finding,
    severity: f.severity as ForensicFinding["severity"],
    confidence: f.confidence,
    evidence: f.evidence,
    technicalExplanation: f.technicalExplanation,
    userExplanation: f.userExplanation,
    region: f.region,
  }));

  let aiExplanation: AiExplanationType | null = null;
  if (session.aiExplanation) {
    try {
      aiExplanation = JSON.parse(session.aiExplanation);
    } catch {
      const result = {
        integrityScore: session.integrityScore || 0,
        riskLevel: session.riskLevel || "low",
        findings,
        metadata: {
          analysisTimestamp: new Date(session.createdAt).toISOString(),
          fileType: session.fileType,
          fileName: session.fileName,
          fileSize: session.fileSize,
          modulesRun: ["metadata", "image_forensics", "text_layout"],
        },
      };
      aiExplanation = generateAiExplanation(result);
    }
  }

  const summary = getFindingsSummary(findings);

  const handleDownloadReport = () => {
    const result = {
      integrityScore: session.integrityScore || 0,
      riskLevel: (session.riskLevel || "low") as
        | "low"
        | "moderate"
        | "high"
        | "critical",
      findings,
      metadata: {
        analysisTimestamp: new Date(session.createdAt).toISOString(),
        fileType: session.fileType,
        fileName: session.fileName,
        fileSize: session.fileSize,
        modulesRun: ["metadata", "image_forensics", "text_layout"],
      },
    };
    downloadReport(result, aiExplanation, session.fileData);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="pt-20 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 pb-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              ← Back to Dashboard
            </button>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-[1.5px] bg-accent" />
                  <span className="editorial-label">Integrity Assessment</span>
                </div>
                <h1 className="font-display text-3xl">Results</h1>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {session.fileName} ·{" "}
                  {new Date(session.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={handleDownloadReport}
                className="nb-btn-primary px-5 py-2.5 bg-foreground text-background flex items-center gap-2 self-start"
              >
                <Download className="w-4 h-4" />
                Generate Forensic Report →
              </button>
            </div>
          </motion.div>

          {/* Main content */}
          <div className="grid lg:grid-cols-[1fr_320px] gap-px bg-border border border-border">
            {/* Left column */}
            <div className="bg-card">
              {/* Score section */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 border-b border-border"
              >
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <IntegrityScore
                    score={session.integrityScore || 0}
                    riskLevel={session.riskLevel || "low"}
                  />
                  <div className="flex-1 w-full">
                    <div className="grid grid-cols-2 gap-px bg-border border border-border">
                      {summary.map((cat) => (
                        <CategorySummaryCard key={cat.id} {...cat} />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Document viewer */}
              {session.fileData && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="border-b border-border"
                >
                  <DocumentViewer
                    fileDataUrl={session.fileData}
                    findings={findings}
                  />
                </motion.div>
              )}

              {/* AI Explanation */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <AiExplanation explanation={aiExplanation} />
              </motion.div>
            </div>

            {/* Right column — Findings */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card"
            >
              <FindingsPanel findings={findings} />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
