import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppNav } from "@/components/shared/AppNav";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { motion } from "framer-motion";
import { FileText, Download, Plus } from "lucide-react";
import type { ForensicFinding } from "@/lib/forensics/types";
import { generateAiExplanation, type AiExplanation as AiExplanationType } from "@/lib/ai";
import { downloadReport } from "@/lib/reportGenerator";

export default function Reports() {
  const sessions = useQuery(api.analysisSessions.getSessionsByUser);
  const allFindings = sessions
    ?.filter((s) => s.status === "completed")
    .map(() => []) || [];
  const navigate = useNavigate();

  const completedSessions = sessions?.filter((s) => s.status === "completed") || [];

  const handleDownloadReport = (session: typeof completedSessions[0]) => {
    // Reconstruct minimal findings for report
    const findings: ForensicFinding[] = [];

    let aiExplanation: AiExplanationType | null = null;
    if (session.aiExplanation) {
      try {
        aiExplanation = JSON.parse(session.aiExplanation);
      } catch {
        // ignore
      }
    }

    const result = {
      integrityScore: session.integrityScore || 0,
      riskLevel: (session.riskLevel || "low") as "low" | "moderate" | "high" | "critical",
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

      <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-10 max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">
                Reports
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Download forensic analysis reports for your records.
              </p>
            </div>
            <button
              onClick={() => navigate("/upload")}
              className="nb-btn-primary px-6 py-3 bg-foreground text-background flex items-center gap-2 self-start text-sm"
            >
              <Plus className="w-4 h-4" />
              New Analysis
            </button>
          </motion.div>

          {/* Reports list */}
          {sessions === undefined ? (
            <div className="nb-card p-8 text-center">
              <div className="w-8 h-8 border-3 border-foreground border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading reports...</p>
            </div>
          ) : completedSessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="nb-card p-12 text-center"
            >
              <div className="w-16 h-16 bg-muted border-3 border-border flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-black uppercase tracking-wider mb-2">
                No reports yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                Complete a forensic analysis to generate your first report.
              </p>
              <button
                onClick={() => navigate("/upload")}
                className="nb-btn-primary px-6 py-3 bg-foreground text-background text-sm"
              >
                Start Analysis
              </button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {completedSessions.map((session, idx) => (
                <motion.div
                  key={session._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="nb-card p-5"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-muted border-2 border-border flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{session.fileName}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>
                          {new Date(session.createdAt).toLocaleString()}
                        </span>
                        <span>·</span>
                        <span className="font-bold text-foreground">
                          Score: {session.integrityScore}/100
                        </span>
                        {session.riskLevel && (
                          <RiskBadge level={session.riskLevel} size="sm" />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/results/${session._id}`)}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-border hover:bg-muted transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadReport(session)}
                        className="nb-btn-primary px-4 py-2 bg-foreground text-background text-xs flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
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
