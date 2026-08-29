import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppNav } from "@/components/shared/AppNav";
import { AnalysisProgress } from "@/components/forensic/AnalysisProgress";
import { ANALYSIS_STAGES, type AnalysisStage } from "@/lib/forensics/types";
import { runForensicAnalysis } from "@/lib/forensics/engine";
import { generateAiExplanation } from "@/lib/ai";
import { motion } from "framer-motion";

export default function Analysis() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const session = useQuery(
    api.analysisSessions.getSession,
    sessionId ? { sessionId: sessionId as any } : "skip"
  );
  const updateSession = useMutation(api.analysisSessions.updateSessionStatus);
  const bulkInsertFindings = useMutation(api.forensicFindings.bulkInsertFindings);

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

  // Start analysis when session data is loaded
  useEffect(() => {
    if (
      !session ||
      session.status !== "pending" ||
      isRunning ||
      analysisStarted.current
    )
      return;

    analysisStarted.current = true;

    const runAnalysis = async () => {
      try {
        setIsRunning(true);

        // Update status to analyzing
        await updateSession({ sessionId: session._id, status: "analyzing" });

        // Run forensic analysis
        const result = await runForensicAnalysis(
          {
            name: session.fileName,
            type: session.fileType,
            size: session.fileSize,
            dataUrl: session.fileData,
          },
          {
            onStageUpdate: handleStageUpdate,
          }
        );

        // Insert findings into database
        if (result.findings.length > 0) {
          await bulkInsertFindings({
            sessionId: session._id,
            findings: result.findings.map((f) => ({
              category: f.category,
              finding: f.finding,
              severity: f.severity,
              confidence: f.confidence,
              evidence: f.evidence,
              technicalExplanation: f.technicalExplanation,
              userExplanation: f.userExplanation,
              region: f.region,
            })),
          });
        }

        // Generate AI explanation
        let aiExplanation = "";
        try {
          const explanation = generateAiExplanation(result);
          aiExplanation = JSON.stringify(explanation);
        } catch {
          // AI explanation failed, continue without it
        }

        // Update session with results
        await updateSession({
          sessionId: session._id,
          status: "completed",
          integrityScore: result.integrityScore,
          riskLevel: result.riskLevel,
          aiExplanation,
        });

        // Navigate to results
        navigate(`/results/${session._id}`);
      } catch (err) {
        console.error("Analysis failed:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Analysis failed. Please try again."
        );

        // Update session to failed state
        try {
          await updateSession({
            sessionId: session._id,
            status: "failed",
          });
        } catch {
          // Ignore update errors
        }

        setIsRunning(false);
      }
    };

    runAnalysis();
  }, [
    session,
    isRunning,
    updateSession,
    bulkInsertFindings,
    handleStageUpdate,
    navigate,
  ]);

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
              <AnalysisProgress stages={stages} currentStageIndex={currentStageIndex} />

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
