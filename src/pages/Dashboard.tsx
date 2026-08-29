import { useAuth } from "@/hooks/use-auth";
import { AppNav } from "@/components/shared/AppNav";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { getAllSessions } from "@/lib/sessionStore";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Plus, AlertTriangle, CheckCircle, FileText, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();

  const recentSessions = getAllSessions().sort((a, b) => b.createdAt - a.createdAt);

  const totalAnalyses = recentSessions.length;
  const highRisk = recentSessions.filter(
    (s) => s.riskLevel === "high" || s.riskLevel === "critical"
  ).length;
  const moderateRisk = recentSessions.filter((s) => s.riskLevel === "moderate").length;
  const lowRisk = recentSessions.filter((s) => s.riskLevel === "low").length;

  const stats = [
    { label: "Total Analyses", value: totalAnalyses, icon: FileText },
    { label: "High Risk", value: highRisk, icon: AlertTriangle },
    { label: "Moderate", value: moderateRisk, icon: TrendingUp },
    { label: "Low Risk", value: lowRisk, icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="pt-20 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 pb-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-[1.5px] bg-accent" />
              <span className="editorial-label">Forensic Workspace</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl sm:text-4xl">
                  Welcome{user?.email ? `, ${user.email.split("@")[0]}` : isGuest ? ", Guest" : ""}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Overview of your forensic analysis sessions.
                  {isGuest ? " You are browsing as a guest — data will not be saved." : ""}
                </p>
              </div>
              <button
                onClick={() => navigate("/upload")}
                className="nb-btn-primary px-5 py-2.5 bg-foreground text-background self-start"
              >
                <Plus className="w-4 h-4 mr-2 inline" />
                New Analysis
              </button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border mb-10"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="editorial-label">{stat.label}</span>
                </div>
                <p className="text-3xl font-display">{stat.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Recent Analyses */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-4 h-[1.5px] bg-border" />
              <span className="editorial-label">Recent Analyses</span>
            </div>

            {recentSessions.length === 0 ? (
              <div className="border border-border bg-card p-12 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  No sessions yet. Run your first forensic analysis to get started.
                </p>
                <button
                  onClick={() => navigate("/upload")}
                  className="nb-btn-primary px-5 py-2.5 bg-foreground text-background"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  New Analysis
                </button>
              </div>
            ) : (
              <div className="border border-border bg-card overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-5 py-3">File</th>
                      <th className="px-5 py-3 hidden sm:table-cell">Date</th>
                      <th className="px-5 py-3">Integrity</th>
                      <th className="px-5 py-3 hidden sm:table-cell">Risk</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSessions.map((session) => (
                      <tr
                        key={session._id}
                        className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[180px]">
                                {session.fileName}
                              </p>
                              <p className="text-[10px] text-muted-foreground uppercase font-mono">
                                {session.fileType.split("/")[1]?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground font-mono">
                            {new Date(session.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-lg font-display">
                            {session.integrityScore ?? "—"}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono"> /100</span>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          {session.riskLevel && (
                            <RiskBadge level={session.riskLevel} size="sm" />
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => navigate(`/results/${session._id}`)}
                            className="text-xs font-medium border border-border px-3 py-1.5 hover:bg-secondary transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
