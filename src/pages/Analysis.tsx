import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { getSession, updateSession, bulkInsertFindings } from "@/lib/sessionStore";
import { AppNav } from "@/components/shared/AppNav";
import { AnalysisProgress } from "@/components/forensic/AnalysisProgress";
import { ANALYSIS_STAGES, type AnalysisStage } from "@/lib/forensics/types";
import { runForensicAnalysis } from "@/lib/forensics/engine";
import { generateAiExplanation } from "@/lib/ai";
import { getRiskInfo } from "@/lib/forensics/types";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const LOG = "[ProofChain]";

/** Safety timeout: if analysis takes longer than this, show an error. */
const SAFETY_TIMEOUT_MS = 120_000; // 2 minutes

/** Maximum time allowed for any persistence operation. */
const PERSISTENCE_TIMEOUT_MS = 5_000; // 5 seconds

/** How long to show the completion card before navigating to Results. */
const COMPLETION_DISPLAY_MS = 500;

/** Wrap any promise with a deadline. Resolves with fallback on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.warn(`${LOG} ${label} timed out after ${ms / 1000}s`);
        resolve(fallback);
      }, ms)
    ),
  ]);
}

/**
 * Force-write session and findings to localStorage as a safety net.
 * This ensures the Results page can always load data, even if
 * Supabase persistence fails or times out.
 */
function forceSaveToLocalStorage(
  sessionId: string,
  session: {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileData: string;
    status: "completed" | "failed";
    integrityScore?: number;
    riskLevel?: string;
    aiExplanation?: string;
  },
  findings: Array<{
    category: string;
    finding: string;
    severity: string;
    confidence: number;
    evidence: string;
    technicalExplanation: string;
    userExplanation: string;
    region?: { x: number; y: number; width: number; height: number };
  }>,
) {
  try {
    const STORAGE_KEY = "proofchain_sessions";
    const FINDINGS_KEY = "proofchain_findings";
    const FILE_DATA_KEY = "proofchain_file_data";

    // Save session
    const rawSessions = localStorage.getItem(STORAGE_KEY);
    const sessions = rawSessions ? JSON.parse(rawSessions) : {};
    sessions[sessionId] = {
      _id: sessionId,
      ...session,
      createdAt: sessions[sessionId]?.createdAt ?? Date.now(),
      completedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));

    // Save file data if not already stored
    if (session.fileData) {
      const rawFiles = localStorage.getItem(FILE_DATA_KEY);
      const files = rawFiles ? JSON.parse(rawFiles) : {};
      if (!files[sessionId]) {
        files[sessionId] = session.fileData;
        localStorage.setItem(FILE_DATA_KEY, JSON.stringify(files));
      }
    }

    // Save findings
    const rawFindings = localStorage.getItem(FINDINGS_KEY);
    const allFindings = rawFindings ? JSON.parse(rawFindings) : {};
    if (!allFindings[sessionId]) {
      allFindings[sessionId] = findings.map((f) => ({
        ...f,
        _id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        sessionId,
        createdAt: Date.now(),
      }));
      localStorage.setItem(FINDINGS_KEY, JSON.stringify(allFindings));
    }

    console.log(`${LOG} Force-saved session + findings to localStorage`);
  } catch (err) {
    console.error(`${LOG} Failed to force-save to localStorage:`, err);
  }
}

export default function Analysis() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [stages, setStages] = useState<AnalysisStage[]>([...ANALYSIS_STAGES]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analysisStarted = useRef(false);

  /** Set when the engine completes successfully — shows completion card. */
  const [completedResult, setCompletedResult] = useState<{
    score: number;
    riskLevel: string;
    findingsCount: number;
  } | null>(null);

  const handleStageUpdate = useCallback(
    (stageId: string, status: "analyzing" | "completed") => {
      setStages((prev) =>
        prev.map((s) => (s.id === stageId ? { ...s, status } : s)),
      );

      setCurrentStageIndex((prev) => {
        const idx = ANALYSIS_STAGES.findIndex((s) => s.id === stageId);
        if (status === "completed") return Math.max(prev, idx + 1);
        return Math.max(prev, idx);
      });
    },
    [],
  );

  useEffect(() => {
    if (!sessionId || isRunning || analysisStarted.current) return;

    let cancelled = false;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    const runAnalysis = async () => {
      console.log(`${LOG} Loading session ${sessionId}...`);
      const session = await getSession(sessionId);
      if (!session) {
        console.error(`${LOG} Session not found: ${sessionId}`);
        setError("Session not found. Please start a new analysis.");
        return;
      }
      if (session.status !== "pending") {
        console.log(`${LOG} Session already ${session.status}, skipping`);
        return;
      }
      if (cancelled) return;

      analysisStarted.current = true;

      // Safety timeout
      safetyTimer = setTimeout(() => {
        if (!cancelled) {
          console.error(`${LOG} Safety timeout reached`);
          setError("Analysis timed out. The document may be too large or a required service is unavailable. Please try again.");
          setIsRunning(false);
        }
      }, SAFETY_TIMEOUT_MS);

      try {
        setIsRunning(true);
        console.log(`${LOG} Setting session status to analyzing...`);
        await updateSession(sessionId, { status: "analyzing" });
        console.log(`${LOG} Session status updated to analyzing`);

        console.log(`${LOG} Starting forensic analysis...`);
        const result = await runForensicAnalysis(
          {
            name: session.fileName,
            type: session.fileType,
            size: session.fileSize,
            dataUrl: session.fileData,
          },
          { onStageUpdate: handleStageUpdate },
        );

        console.log(`${LOG} ENGINE COMPLETE`);
        console.log(`${LOG} SCORE: ${result.integrityScore}`);
        console.log(`${LOG} FINDINGS: ${result.findings.length}`);
        console.log(`${LOG} FINAL RESULT score=${result.integrityScore} risk=${result.riskLevel} findings=${result.findings.length}`);

        if (cancelled) {
          console.log(`${LOG} Cancelled after engine resolve, not saving`);
          return;
        }

        // ── Show completion card IMMEDIATELY ──
        // This proves the score was calculated and gives visual feedback.
        setCompletedResult({
          score: result.integrityScore,
          riskLevel: result.riskLevel,
          findingsCount: result.findings.length,
        });
        setIsRunning(false);

        // ── Step 1: Force-save to localStorage immediately ──
        const findingsPayload = result.findings.map((f) => ({
          category: f.category,
          finding: f.finding,
          severity: f.severity,
          confidence: f.confidence,
          evidence: f.evidence,
          technicalExplanation: f.technicalExplanation,
          userExplanation: f.userExplanation,
          region: f.region,
        }));

        let aiExplanation = "";
        try {
          const explanation = generateAiExplanation(result);
          aiExplanation = JSON.stringify(explanation);
          console.log(`${LOG} AI explanation generated`);
        } catch (aiErr) {
          console.error(`${LOG} AI explanation failed:`, aiErr);
        }

        forceSaveToLocalStorage(
          sessionId,
          {
            fileName: session.fileName,
            fileType: session.fileType,
            fileSize: session.fileSize,
            fileData: session.fileData,
            status: "completed",
            integrityScore: result.integrityScore,
            riskLevel: result.riskLevel,
            aiExplanation,
          },
          findingsPayload,
        );

        // ── Step 2: Attempt async persistence (non-blocking, with timeout) ──
        console.log(`${LOG} Persisting to database (with ${PERSISTENCE_TIMEOUT_MS / 1000}s timeout)...`);
        try {
          const persistResult = await withTimeout(
            (async () => {
              if (findingsPayload.length > 0) {
                await bulkInsertFindings(sessionId, findingsPayload);
              }
              await updateSession(sessionId, {
                status: "completed",
                integrityScore: result.integrityScore,
                riskLevel: result.riskLevel,
                aiExplanation,
              });
              return true as const;
            })(),
            PERSISTENCE_TIMEOUT_MS,
            "Persistence",
            false,
          );

          if (persistResult) {
            console.log(`${LOG} PERSISTENCE COMPLETE`);
          } else {
            console.warn(`${LOG} PERSISTENCE TIMED OUT — using localStorage fallback`);
          }
        } catch (persistErr) {
          console.error(`${LOG} PERSISTENCE FAILED:`, persistErr);
        }

        // ── Step 3: Wait for completion card to be visible, then navigate ──
        if (cancelled) return;

        console.log(`${LOG} Waiting ${COMPLETION_DISPLAY_MS}ms for completion display...`);
        await new Promise<void>((resolve) => setTimeout(resolve, COMPLETION_DISPLAY_MS));

        if (cancelled) return;

        const resultsUrl = `/results/${sessionId}`;
        console.log(`${LOG} NAVIGATING TO ${resultsUrl}`);
        navigate(resultsUrl);
        console.log(`${LOG} ANALYSIS FINISHED`);
      } catch (err) {
        console.error(`${LOG} Analysis pipeline failed:`, err);
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Analysis failed. Please try again.";
        setError(msg);
        try {
          await withTimeout(
            updateSession(sessionId, { status: "failed" }),
            PERSISTENCE_TIMEOUT_MS,
            "Failed-status update",
            undefined,
          );
        } catch {}
        setIsRunning(false);
      } finally {
        if (safetyTimer) {
          clearTimeout(safetyTimer);
          safetyTimer = null;
        }
        if (!cancelled) {
          setIsRunning(false);
        }
      }
    };

    runAnalysis();

    return () => {
      cancelled = true;
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, [sessionId, isRunning, handleStageUpdate, navigate]);

  // ── Render: Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen">
          <div className="p-6 lg:p-10 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="nb-card p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 border-3 border-red-300 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠</span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider mb-2">
                Analysis Failed
              </h2>
              <p className="text-sm text-muted-foreground mb-6">{error}</p>
              <button
                onClick={() => navigate("/upload")}
                className="nb-btn-primary px-6 py-3 bg-foreground text-background text-sm"
              >
                Try Again
              </button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // ── Render: Completion card (shown for COMPLETION_DISPLAY_MS before navigating) ──
  if (completedResult) {
    const risk = getRiskInfo(completedResult.riskLevel);
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen">
          <div className="p-6 lg:p-10 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="nb-card-lg p-10 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 border-3 border-emerald-300 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>

              <h2 className="text-2xl font-black uppercase tracking-wider mb-2">
                Analysis Complete
              </h2>

              <div className="mt-6 mb-6">
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-3">
                  Integrity Score
                </p>
                <p
                  className="text-7xl font-black leading-none"
                  style={{
                    color:
                      completedResult.score >= 80 ? "#22c55e" :
                      completedResult.score >= 55 ? "#f59e0b" :
                      completedResult.score >= 25 ? "#ef4444" : "#dc2626",
                  }}
                >
                  {completedResult.score}
                </p>
                <p className="text-lg text-muted-foreground mt-1">/ 100</p>
              </div>

              <div
                className={`inline-block px-4 py-2 border-3 font-black text-sm ${risk.bgColor} ${risk.color}`}
              >
                {risk.label}
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                {completedResult.findingsCount} finding{completedResult.findingsCount !== 1 ? "s" : ""} detected
              </p>

              <p className="text-xs text-muted-foreground mt-6 uppercase tracking-wider">
                Loading detailed results...
              </p>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // ── Render: Analysis in progress ──
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AnalysisProgress
              stages={stages}
              currentStageIndex={currentStageIndex}
            />
            <div className="mt-8 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Please do not close this page during analysis
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
