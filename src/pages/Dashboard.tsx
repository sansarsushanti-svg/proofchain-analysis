import { useAuth } from "@/hooks/use-auth";
import { AppNav } from "@/components/shared/AppNav";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Plus,
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
} from "lucide-react";

// Demo sessions for display purposes
const DEMO_SESSIONS: Array<{
  _id: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  integrityScore: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  findingsCount: number;
}> = [
  {
    _id: "demo-1",
    fileName: "invoice_sample_clean.pdf",
    fileType: "application/pdf",
    createdAt: new Date().toISOString(),
    integrityScore: 92,
    riskLevel: "low",
    findingsCount: 1,
  },
  {
    _id: "demo-2",
    fileName: "invoice_manipulated.jpg",
    fileType: "image/jpeg",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    integrityScore: 31,
    riskLevel: "high",
    findingsCount: 4,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Use demo sessions for now (Convex queries will be reconnected when Supabase data layer is set up)
  const recentSessions = DEMO_SESSIONS;

  const totalAnalyses = recentSessions.length;
  const highRisk = recentSessions.filter(
    (s) => s.riskLevel === "high" || s.riskLevel === "critical",
  ).length;
  const moderateRisk = recentSessions.filter(
    (s) => s.riskLevel === "moderate",
  ).length;
  const lowRisk = recentSessions.filter((s) => s.riskLevel === "low").length;

  const stats = [
    {
      label: "Total Analyses",
      value: totalAnalyses,
      icon: FileText,
      color: "bg-foreground text-background",
    },
    {
      label: "High Risk",
      value: highRisk,
      icon: AlertTriangle,
      color: "bg-red-100 text-red-800",
    },
    {
      label: "Moderate",
      value: moderateRisk,
      icon: TrendingUp,
      color: "bg-amber-100 text-amber-800",
    },
    {
      label: "Low Risk",
      value: lowRisk,
      icon: CheckCircle,
      color: "bg-emerald-100 text-emerald-800",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-10 max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Dashboard
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of your forensic analysis sessions.
            </p>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="nb-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 flex items-center justify-center border-2 border-border ${stat.color}`}
                  >
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-3xl font-black">{stat.value}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Quick action */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <button
              onClick={() => navigate("/upload")}
              className="nb-btn-primary w-full sm:w-auto px-8 py-4 bg-foreground text-background flex items-center justify-center gap-3"
            >
              <Plus className="w-5 h-5" />
              Analyze New File
            </button>
          </motion.div>

          {/* Recent analyses */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-black uppercase tracking-wider mb-4">
              Recent Analyses
            </h2>

            {recentSessions.length === 0 ? (
              <div className="nb-card p-12 text-center">
                <div className="w-16 h-16 bg-muted border-3 border-border flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-black uppercase tracking-wider mb-2">
                  No sessions yet
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Run your first forensic analysis to get started.
                </p>
                <button
                  onClick={() => navigate("/upload")}
                  className="nb-btn-primary px-6 py-3 bg-foreground text-background text-sm"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  New Analysis
                </button>
              </div>
            ) : (
              <div className="nb-card overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted">
                      <th className="p-4 text-xs font-black uppercase tracking-wider">
                        File
                      </th>
                      <th className="p-4 text-xs font-black uppercase tracking-wider hidden sm:table-cell">
                        Date
                      </th>
                      <th className="p-4 text-xs font-black uppercase tracking-wider">
                        Score
                      </th>
                      <th className="p-4 text-xs font-black uppercase tracking-wider hidden sm:table-cell">
                        Risk
                      </th>
                      <th className="p-4 text-xs font-black uppercase tracking-wider text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSessions.map((session) => (
                      <tr
                        key={session._id}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-muted border-2 border-border flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate max-w-[160px]">
                                {session.fileName}
                              </p>
                              <p className="text-[10px] text-muted-foreground uppercase">
                                {session.fileType.split("/")[1]?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-4">
                          <span className="text-lg font-black">
                            {session.integrityScore ?? "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            /100
                          </span>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          {session.riskLevel && (
                            <RiskBadge level={session.riskLevel} size="sm" />
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() =>
                              navigate(`/results/${session._id}`)
                            }
                            className="text-xs font-bold uppercase tracking-wider border-2 border-border px-3 py-1.5 hover:bg-muted transition-colors"
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
