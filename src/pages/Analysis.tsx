import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { getSession, updateSession, bulkInsertFindings } from "@/lib/sessionStore";
import { AppNav } from "@/components/shared/AppNav";
import { AnalysisProgress } from "@/components/forensic/AnalysisProgress";
import { ANALYSIS_STAGES, type AnalysisStage } from "@/lib/forensics/types";
import { runForensicAnalysis } from "@/lib/forensics/engine";
import { generateAiExplanation } from "@/lib/ai";
import { motion } from "framer-motion";

/** Safety timeout: if analysis takes longer than this, show an error. */
const SAFETY_TIMEOUT_MS = 120_000; // 2 minutes

export default function Analysis() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [stages, setStages] = useState<AnalysisStage[]>([...ANALYSIS_STAGES]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analysisStarted = useRef(false);

  const handleStageUpdate = useCallback(
    (stageId: string, status: "analyzing" | "completed") => {
      setStages((prev) => {
        const newStages = prev.map((s) => {
          if (s.id === stageId) return { ...s, status };
          return s;
        });
        return newStages;
      });

      setCurrentStageIndex((prev) => {
        // Use ANALYSIS_STAGES (static) to avoid stale closure
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
      const session = await getSession(sessionId);
      if (!session || session.status !== "pending") return;
      if (cancelled) return;

      analysisStarted.current = true;

      // Safety timeout: if analysis takes too long, show error
      safetyTimer = setTimeout(() => {
        if (!cancelled) {
          console.error("[ProofChain] Safety timeout reached");
          setError("Analysis timed out. The document may be too large or a required service is unavailable. Please try again.");
          setIsRunning(false);
        }
      }, SAFETY_TIMEOUT_MS);

      try {
        setIsRunning(true);
        await updateSession(sessionId, { status: "analyzing" });

        const result = await runForensicAnalysis(
          {
            name: session.fileName,
            type: session.fileType,
            size: session.fileSize,
            dataUrl: session.fileData,
          },
          { onStageUpdate: handleStageUpdate },
        );

        if (cancelled) return;

        if (result.findings.length > 0) {
          await bulkInsertFindings(
            sessionId,
            result.findings.map((f) => ({
              category: f.category,
              finding: f.finding,
              severity: f.severity,
              confidence: f.confidence,
              evidence: f.evidence,
              technicalExplanation: f.technicalExplanation,
              userExplanation: f.userExplanation,
              region: f.region,
            })),
          );
        }

        let aiExplanation = "";
        try {
          const explanation = generateAiExplanation(result);
          aiExplanation = JSON.stringify(explanation);
        } catch {
          // continue without AI
        }

        if (cancelled) return;

        await updateSession(sessionId, {
          status: "completed",
          integrityScore: result.integrityScore,
          riskLevel: result.riskLevel,
          aiExplanation,
        });

        navigate(`/results/${sessionId}`);
      } catch (err) {
        console.error("[ProofChain] Analysis failed:", err);
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Analysis failed. Please try again.",
        );
        try {
          await updateSession(sessionId, { status: "failed" });
        } catch {}
        setIsRunning(false);
      } finally {
        if (safetyTimer) clearTimeout(safetyTimer);
      }
    };

    runAnalysis();

    return () => {
      cancelled = true;
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, [sessionId, isRunning, handleStageUpdate, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-10 max-w-4xl mx-auto">
          {error ? (
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
          ) : (
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
          )}
        </div>
      </main>
    </div>
  );
}
