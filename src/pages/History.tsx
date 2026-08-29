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
                Analysis History
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                All forensic sessions under your account.
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

          {/* In Progress */}
          {inProgressSessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-4">
                In Progress ({inProgressSessions.length})
              </h2>
              <div className="space-y-2">
                {inProgressSessions.map((session) => (
                  <div
                    key={session._id}
                    className="nb-card p-4 flex items-center gap-4 animate-progress-pulse"
                  >
                    <div className="w-10 h-10 bg-muted border-2 border-border flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-foreground border-t-transparent animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{session.fileName}</p>
                      <p className="text-xs text-muted-foreground uppercase">
                        {session.status === "analyzing" ? "Analyzing..." : "Queued"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Completed */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-4">
              Completed ({completedSessions.length})
            </h2>

            {completedSessions.length === 0 ? (
              <div className="nb-card p-12 text-center">
                <div className="w-16 h-16 bg-muted border-3 border-border flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-black uppercase tracking-wider mb-2">
                  No completed sessions
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Completed analyses will appear here.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedSessions.map((session, idx) => (
                  <motion.div
                    key={session._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    className="nb-card p-5 hover:translate-y-[-2px] transition-transform cursor-pointer"
                    onClick={() => navigate(`/results/${session._id}`)}
                  >
                    {/* File icon */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-muted border-2 border-border flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{session.fileName}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Score and risk */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-2xl font-black">
                          {session.integrityScore ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground"> /100</span>
                      </div>
                      {session.riskLevel && (
                        <RiskBadge level={session.riskLevel} size="sm" />
                      )}
                    </div>

                    {/* View button */}
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Eye className="w-3.5 h-3.5" />
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
