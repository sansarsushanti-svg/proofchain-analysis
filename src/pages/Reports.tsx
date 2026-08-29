import { useNavigate } from "react-router";
import { getAllSessions, getSessionFindings } from "@/lib/sessionStore";
import { AppNav } from "@/components/shared/AppNav";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { motion } from "framer-motion";
import { FileText, Download, Plus } from "lucide-react";
import type { ForensicFinding } from "@/lib/forensics/types";
import {
  generateAiExplanation,
  type AiExplanation as AiExplanationType,
} from "@/lib/ai";
import { downloadReport } from "@/lib/reportGenerator";

export default function Reports() {
  const navigate = useNavigate();
  const allSessions = getAllSessions();
  const completedSessions = allSessions.filter((s) => s.status === "completed");

  const handleDownloadReport = (sessionId: string) => {
    const session = allSessions.find((s) => s._id === sessionId);
    if (!session) return;

    const dbFindings = getSessionFindings(sessionId);
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
      } catch {}
    }

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
        modulesRun: ["metadata", "image_forensics"],
      },
    };

    downloadReport(result, aiExplanation, session.fileData);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="pt-20 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 pb-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-[1.5px] bg-accent" />
                <span className="editorial-label">Export</span>
              </div>
              <h1 className="font-display text-3xl">Reports</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Export forensic reports from completed sessions.
              </p>
            </div>
            <button
              onClick={() => navigate("/upload")}
              className="nb-btn-primary px-5 py-2.5 bg-foreground text-background self-start"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              New Analysis
            </button>
          </motion.div>

          {completedSessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-border bg-card p-12 text-center"
            >
              <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No sessions yet. Complete an analysis to generate a report.
              </p>
              <button
                onClick={() => navigate("/upload")}
                className="nb-btn-primary px-5 py-2.5 bg-foreground text-background"
              >
                New Analysis
              </button>
            </motion.div>
          ) : (
            <div className="space-y-px bg-border border border-border">
              {completedSessions.map((session, idx) => (
                <motion.div
                  key={session._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-card p-5"
                >
                  <div className="flex items-center gap-4">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{session.fileName}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">
                          {new Date(session.createdAt).toLocaleString()}
                        </span>
                        <span className="text-border">·</span>
                        <span className="font-display">
                          Score: {session.integrityScore}/100
                        </span>
                        {session.riskLevel && (
                          <RiskBadge level={session.riskLevel} size="sm" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/results/${session._id}`)}
                        className="px-3 py-1.5 text-xs font-medium border border-border hover:bg-secondary transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadReport(session._id)}
                        className="nb-btn-primary px-3 py-1.5 bg-foreground text-background flex items-center gap-1.5"
                      >
                        <Download className="w-3 h-3" />
                        Report
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
