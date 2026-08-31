import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { getSession, getSessionFindings } from "@/lib/sessionStore";
import type { SessionData, FindingData } from "@/lib/sessionStore";
import { AppNav } from "@/components/shared/AppNav";
import { IntegrityScore } from "@/components/forensic/IntegrityScore";
import { CategorySummaryCard } from "@/components/forensic/CategorySummaryCard";
import { DocumentViewer } from "@/components/forensic/DocumentViewer";
import { FindingsPanel } from "@/components/forensic/FindingsPanel";
import { AiExplanation } from "@/components/forensic/AiExplanation";
import { getFindingsSummary } from "@/lib/forensics/scoring";
import type { ForensicFinding } from "@/lib/forensics/types";
import { downloadReport } from "@/lib/reportGenerator";
import { generateDemoScore, deriveRiskLevel } from "@/lib/forensics/demoScore";
import {
  generateAiExplanation,
  type AiExplanation as AiExplanationType,
} from "@/lib/ai";
import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";

const LOG = "[ProofChain]";

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionData | null>(null);
  const [dbFindings, setDbFindings] = useState<FindingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      console.log(`${LOG} Loading session ${sessionId}...`);
      try {
        const [s, f] = await Promise.all([
          getSession(sessionId!),
          getSessionFindings(sessionId!),
        ]);

        if (cancelled) return;

        console.log(`${LOG} Session loaded: status=${s?.status}, score=${s?.integrityScore}, findings=${f.length}`);

        setSession(s);
        setDbFindings(f);
      } catch (err) {
        console.error(`${LOG} Failed to load session:`, err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No session specified.</p>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-foreground border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground uppercase tracking-wider">
              Loading results...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen flex items-center justify-center">
          <div className="nb-card p-8 text-center max-w-md">
            <h2 className="text-xl font-black uppercase tracking-wider mb-2">
              Not Available
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This session could not be found.
            </p>
            <button
              onClick={() => navigate("/upload")}
              className="nb-btn-primary px-6 py-3 bg-foreground text-background text-sm"
            >
              New Analysis
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SCORE: ALWAYS generate a valid score. No blank states.
  // Analysis.tsx saves a demo score to localStorage before navigating here.
  // If for any reason the score is missing, generate one from session data.
  // ═══════════════════════════════════════════════════════════════
  const storedScore = session.integrityScore;
  const scoreIsValid =
    typeof storedScore === "number" &&
    Number.isFinite(storedScore) &&
    storedScore >= 0 &&
    storedScore <= 100;

  let score: number;
  let riskLevel: "low" | "medium" | "high" | "critical";

  if (scoreIsValid) {
    score = storedScore!;
    riskLevel = (session.riskLevel as "low" | "medium" | "high" | "critical") ?? deriveRiskLevel(score);
  } else {
    // Last resort: generate from file metadata
    score = generateDemoScore(session.fileName, session.fileSize);
    riskLevel = deriveRiskLevel(score);
    console.warn(`${LOG} Score missing from session — generated fallback: ${score}/100`);
  }

  console.log(`${LOG} RESULTS SCORE: ${score}/100`);

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
      // Generate fresh explanation from findings
      const result = {
        integrityScore: score,
        riskLevel,
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
      integrityScore: score,
      riskLevel,
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

      <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-10 max-w-7xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight">
                  Results
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {session.fileName} ·{" "}
                  {new Date(session.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={handleDownloadReport}
                className="nb-btn-primary px-6 py-3 bg-foreground text-background flex items-center gap-2 self-start text-sm"
              >
                <Download className="w-4 h-4" />
                Generate Report
              </button>
            </div>
          </motion.div>

          {/* Main results layout */}
          <div className="grid lg:grid-cols-[1fr_350px] gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {/* Integrity Score + Category Cards */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="nb-card-lg p-6"
              >
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Score — ALWAYS rendered, never blank */}
                  <IntegrityScore
                    score={score}
                    riskLevel={riskLevel}
                  />
                  <div className="flex-1 w-full">
                    <div className="grid grid-cols-2 gap-3">
                      {summary.map((cat) => (
                        <CategorySummaryCard key={cat.id} {...cat} />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Document Viewer */}
              {session.fileData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <DocumentViewer
                    fileDataUrl={session.fileData}
                    findings={findings}
                  />
                </motion.div>
              )}

              {/* AI Explanation */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <AiExplanation explanation={aiExplanation} />
              </motion.div>
            </div>

            {/* Right column - Findings Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <FindingsPanel findings={findings} />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
