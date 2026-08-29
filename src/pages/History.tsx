import { useNavigate } from "react-router";
import { getAllSessions } from "@/lib/sessionStore";
import { AppNav } from "@/components/shared/AppNav";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { motion } from "framer-motion";
import { FileText, Plus, Clock, Eye } from "lucide-react";

export default function History() {
  const navigate = useNavigate();
  const allSessions = getAllSessions();
  const completedSessions = allSessions.filter((s) => s.status === "completed");
  const inProgressSessions = allSessions.filter(
    (s) => s.status === "pending" || s.status === "analyzing"
  );

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
                <span className="editorial-label">Session History</span>
              </div>
              <h1 className="font-display text-3xl">
                Analysis History
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                All forensic sessions under your account.
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

          {/* In Progress */}
          {inProgressSessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-[1.5px] bg-border" />
                <span className="editorial-label">
                  In Progress ({inProgressSessions.length})
                </span>
              </div>
              <div className="space-y-px bg-border border border-border">
                {inProgressSessions.map((session) => (
                  <div
                    key={session._id}
                    className="bg-card p-4 flex items-center gap-4 animate-progress-pulse"
                  >
                    <div className="w-8 h-8 border border-border flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-foreground border-t-transparent animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.fileName}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono">
                        {session.status === "analyzing"
                          ? "Analyzing..."
                          : "Queued"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Completed */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-4 h-[1.5px] bg-border" />
              <span className="editorial-label">
                Completed ({completedSessions.length})
              </span>
            </div>

            {completedSessions.length === 0 ? (
              <div className="border border-border bg-card p-12 text-center">
                <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No completed sessions yet.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
                {completedSessions.map((session, idx) => (
                  <motion.div
                    key={session._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.03 }}
                    className="bg-card p-5 hover:bg-secondary/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/results/${session._id}`)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {session.fileName}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-xl font-display">
                          {session.integrityScore ?? "—"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {" "}
                          /100
                        </span>
                      </div>
                      {session.riskLevel && (
                        <RiskBadge level={session.riskLevel} size="sm" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      <Eye className="w-3 h-3" />
                      View Results
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
