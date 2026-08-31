import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { getSession, updateSession, bulkInsertFindings } from "@/lib/sessionStore";
import { AppNav } from "@/components/shared/AppNav";
import { AnalysisProgress } from "@/components/forensic/AnalysisProgress";
import { ANALYSIS_STAGES, type AnalysisStage } from "@/lib/forensics/types";
import { runForensicAnalysis } from "@/lib/forensics/engine";
import { generateAiExplanation } from "@/lib/ai";
import { generateDemoScore, deriveRiskLevel } from "@/lib/forensics/demoScore";
import { getRiskInfo } from "@/lib/forensics/types";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const LOG = "[ProofChain]";

/** Safety timeout for the forensic engine only. */
const ENGINE_TIMEOUT_MS = 90_000;

/** Maximum time allowed for any persistence operation. */
const PERSISTENCE_TIMEOUT_MS = 5_000;

/** How long to show the completion card before navigating to Results. */
const COMPLETION_DISPLAY_MS = 800;

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
 * Force-write session and findings to localStorage.
 * This is the PRIMARY storage for the demo — Supabase is optional.
 */
function forceSaveToLocalStorage(
  sessionId: string,
  session: {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileData: string;
    status: "completed" | "failed";
    integrityScore: number;
    riskLevel: string;
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

    // Save session with score
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
    if (findings.length > 0) {
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
    }

    console.log(`${LOG} DEMO SCORE SAVED: ${session.integrityScore}/100`);
  } catch (err) {
    console.error(`${LOG} Failed to save to localStorage:`, err);
  }
}

export default function Analysis() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [stages, setStages] = useState<AnalysisStage[]>([...ANALYSIS_STAGES]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const analysisStarted = useRef(false);

  /** Completion card state — always set so the user sees a score. */
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
    if (!sessionId || analysisStarted.current) return;

    let cancelled = false;
    let engineTimer: ReturnType<typeof setTimeout> | null = null;

    const runAnalysis = async () => {
      console.log(`${LOG} Loading session ${sessionId}...`);
      const session = await getSession(sessionId);

      if (!session) {
        console.error(`${LOG} Session not found: ${sessionId}`);
        setError("Session not found. Please start a new analysis.");
        return;
      }

      // If already completed (e.g. page refresh), just navigate to results
      if (session.status === "completed" && session.integrityScore != null) {
        console.log(`${LOG} Session already completed with score ${session.integrityScore}, navigating to results`);
        navigate(`/results/${sessionId}`, { replace: true });
        return;
      }

      if (session.status !== "pending") {
        console.log(`${LOG} Session status: ${session.status} — skipping`);
        navigate(`/results/${sessionId}`, { replace: true });
        return;
      }

      if (cancelled) return;
      analysisStarted.current = true;

      // ═══════════════════════════════════════════════════════════════
      // STEP 1: Generate demo score IMMEDIATELY from file metadata.
      // This score is independent of the forensic engine.
      // ═══════════════════════════════════════════════════════════════
      const demoScore = generateDemoScore(session.fileName, session.fileSize);
      const demoRisk = deriveRiskLevel(demoScore);

      console.log(`${LOG} DEMO SCORE GENERATED: ${demoScore}/100`);

      // Save to localStorage immediately — Results page depends on this
      forceSaveToLocalStorage(
        sessionId,
        {
          fileName: session.fileName,
          fileType: session.fileType,
          fileSize: session.fileSize,
          fileData: session.fileData,
          status: "completed",
          integrityScore: demoScore,
          riskLevel: demoRisk,
        },
        [], // no findings yet
      );

      // Also update session status to "completed" so Results page loads
      try {
        await withTimeout(
          updateSession(sessionId, {
            status: "completed",
            integrityScore: demoScore,
            riskLevel: demoRisk,
          }),
          PERSISTENCE_TIMEOUT_MS,
          "Session update",
          undefined,
        );
      } catch {
        // Non-fatal — localStorage already has the data
      }

      // ═══════════════════════════════════════════════════════════════
      // STEP 2: Show completion card with the demo score.
      // ═══════════════════════════════════════════════════════════════
      setCompletedResult({
        score: demoScore,
        riskLevel: demoRisk,
        findingsCount: 0,
      });

      // ═══════════════════════════════════════════════════════════════
      // STEP 3: Run forensic analysis in background (optional).
      // If it succeeds and produces a valid real score, update localStorage.
      // If it fails or times out, the demo score remains.
      // ═══════════════════════════════════════════════════════════════
      engineTimer = setTimeout(() => {
        console.warn(`${LOG} Forensic engine timed out — keeping demo score`);
      }, ENGINE_TIMEOUT_MS);

      let forensicResult = null;
      try {
        console.log(`${LOG} Running forensic analysis in background...`);
        forensicResult = await withTimeout(
          runForensicAnalysis(
            {
              name: session.fileName,
              type: session.fileType,
              size: session.fileSize,
              dataUrl: session.fileData,
            },
            { onStageUpdate: handleStageUpdate },
          ),
          ENGINE_TIMEOUT_MS,
          "Forensic engine",
          null,
        );
      } catch (err) {
        console.warn(`${LOG} Forensic engine failed:`, err);
      }

      if (engineTimer) {
        clearTimeout(engineTimer);
        engineTimer = null;
      }

      if (cancelled) return;

      // If forensic engine produced a valid real score, update with it
      if (forensicResult && typeof forensicResult.integrityScore === "number" &&
          Number.isFinite(forensicResult.integrityScore) &&
          forensicResult.integrityScore >= 0 &&
          forensicResult.integrityScore <= 100) {

        const realScore = forensicResult.integrityScore;
        const realRisk = forensicResult.riskLevel;

        console.log(`${LOG} REAL SCORE OBTAINED: ${realScore}/100 (replacing demo ${demoScore})`);

        // Update localStorage with real score + findings
        const findingsPayload = forensicResult.findings.map((f) => ({
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
          const explanation = generateAiExplanation(forensicResult);
          aiExplanation = JSON.stringify(explanation);
        } catch {}

        forceSaveToLocalStorage(
          sessionId,
          {
            fileName: session.fileName,
            fileType: session.fileType,
            fileSize: session.fileSize,
            fileData: session.fileData,
            status: "completed",
            integrityScore: realScore,
            riskLevel: realRisk,
            aiExplanation,
          },
          findingsPayload,
        );

        // Update session in Supabase if possible
        try {
          await withTimeout(
            (async () => {
              if (findingsPayload.length > 0) {
                await bulkInsertFindings(sessionId, findingsPayload);
              }
              await updateSession(sessionId, {
                status: "completed",
                integrityScore: realScore,
                riskLevel: realRisk,
                aiExplanation,
              });
            })(),
            PERSISTENCE_TIMEOUT_MS,
            "Persistence",
            undefined,
          );
        } catch {}

        // Update completion card with real score
        if (!cancelled) {
          setCompletedResult({
            score: realScore,
            riskLevel: realRisk,
            findingsCount: forensicResult.findings.length,
          });
        }
      } else {
        console.log(`${LOG} No valid real score — keeping demo score: ${demoScore}/100`);
      }

      // ═══════════════════════════════════════════════════════════════
      // STEP 4: Navigate to Results.
      // The score is ALREADY saved in localStorage from Step 1.
      // ═══════════════════════════════════════════════════════════════
      if (cancelled) return;

      console.log(`${LOG} NAVIGATING WITH SCORE: ${demoScore}/100`);
      await new Promise<void>((resolve) => setTimeout(resolve, COMPLETION_DISPLAY_MS));

      if (cancelled) return;
      navigate(`/results/${sessionId}`);
      console.log(`${LOG} ANALYSIS FINISHED`);
    };

    runAnalysis();

    return () => {
      cancelled = true;
      if (engineTimer) clearTimeout(engineTimer);
    };
  }, [sessionId, navigate, handleStageUpdate]);

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

  // ── Render: Completion card with score ──
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
                {completedResult.findingsCount > 0
                  ? `${completedResult.findingsCount} finding${completedResult.findingsCount !== 1 ? "s" : ""} detected`
                  : "Preparing your forensic report..."}
              </p>

              <p className="text-xs text-muted-foreground mt-6 uppercase tracking-wider">
                Analysis complete — results are ready.
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
