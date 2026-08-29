import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { getSession, updateSession, bulkInsertFindings } from "@/lib/sessionStore";
import { AppNav } from "@/components/shared/AppNav";
import { AnalysisProgress } from "@/components/forensic/AnalysisProgress";
import { ANALYSIS_STAGES, type AnalysisStage } from "@/lib/forensics/types";
import { runForensicAnalysis } from "@/lib/forensics/engine";
import { generateAiExplanation } from "@/lib/ai";
import { motion } from "framer-motion";

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
        const idx = stages.findIndex((s) => s.id === stageId);
        if (status === "completed") return idx + 1;
        return idx;
      });
    },
    [stages]
  );

  useEffect(() => {
    if (!sessionId || isRunning || analysisStarted.current) return;

    const session = getSession(sessionId);
    if (!session || session.status !== "pending") return;

    analysisStarted.current = true;

    const runAnalysis = async () => {
      try {
        setIsRunning(true);
        updateSession(sessionId, { status: "analyzing" });

        const result = await runForensicAnalysis(
          {
            name: session.fileName,
            type: session.fileType,
            size: session.fileSize,
            dataUrl: session.fileData,
          },
          { onStageUpdate: handleStageUpdate }
        );

        if (result.findings.length > 0) {
          bulkInsertFindings(
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
            }))
          );
        }

        let aiExplanation = "";
        try {
          const explanation = generateAiExplanation(result);
          aiExplanation = JSON.stringify(explanation);
        } catch {
          // continue without AI
        }

        updateSession(sessionId, {
          status: "completed",
          integrityScore: result.integrityScore,
          riskLevel: result.riskLevel,
          aiExplanation,
        });

        navigate(`/results/${sessionId}`);
      } catch (err) {
        console.error("Analysis failed:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Analysis failed. Please try again."
        );
        try {
          updateSession(sessionId, { status: "failed" });
        } catch {}
        setIsRunning(false);
      }
    };

    runAnalysis();
  }, [sessionId, isRunning, handleStageUpdate, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="pt-20 min-h-screen">
        <div className="max-w-2xl mx-auto px-6 pb-16">
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-border bg-card p-10 text-center mt-16"
            >
              <p className="text-sm text-destructive font-medium mb-2">
                Analysis Failed
              </p>
              <p className="text-sm text-muted-foreground mb-6">{error}</p>
              <button
                onClick={() => navigate("/upload")}
                className="nb-btn-primary px-5 py-2.5 bg-foreground text-background"
              >
                Try Again
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-16"
            >
              <div className="mb-8">
                <span className="editorial-label">Analysis in progress</span>
                <h1 className="font-display text-2xl mt-2">
                  Running forensic pipeline
                </h1>
              </div>

              <AnalysisProgress
                stages={stages}
                currentStageIndex={currentStageIndex}
              />

              <p className="text-xs text-muted-foreground text-center mt-8 font-mono">
                Please do not close this page during analysis
              </p>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
