import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { createSession } from "@/lib/sessionStore";
import { AppNav } from "@/components/shared/AppNav";
import { FileUpload, FilePreview } from "@/components/shared/FileUpload";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Beaker, AlertTriangle } from "lucide-react";
import {
  generateDemoInvoiceCanvas,
  canvasToDataUrl,
  DEMO_FILES,
} from "@/lib/demoData";

interface UploadedFile {
  file: File;
  dataUrl: string;
  name: string;
  size: number;
  type: string;
}

export default function Upload() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback((file: UploadedFile) => {
    setSelectedFile(file);
    setError(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  const handleLoadDemo = useCallback(async (manipulated: boolean) => {
    const canvas = generateDemoInvoiceCanvas(manipulated);
    const dataUrl = canvasToDataUrl(canvas);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = manipulated ? DEMO_FILES[1].name : DEMO_FILES[0].name;
    const file = new File([blob], fileName, { type: "image/png" });
    setSelectedFile({
      file,
      dataUrl,
      name: fileName,
      size: blob.size,
      type: "image/png",
    });
    setError(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const sessionId = createSession({
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        fileData: selectedFile.dataUrl,
        isDemo:
          selectedFile.name.includes("Sample") ||
          selectedFile.name.includes("Altered"),
      });
      navigate(`/analysis/${sessionId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start analysis. Please try again."
      );
      setIsAnalyzing(false);
    }
  }, [selectedFile, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="pt-20 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 pb-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              ← Back to Dashboard
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-[1.5px] bg-accent" />
              <span className="editorial-label">Submit Evidence</span>
            </div>
            <h1 className="font-display text-3xl">
              New Analysis
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select a file to run through the forensic pipeline.
            </p>
          </motion.div>

          {/* Upload area */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            {selectedFile ? (
              <div className="space-y-4">
                <FilePreview file={selectedFile} onRemove={handleRemoveFile} />
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="nb-btn-primary w-full px-6 py-3 bg-foreground text-background flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background border-t-transparent animate-spin" />
                      Queuing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Analyze Document
                    </>
                  )}
                </button>
              </div>
            ) : (
              <FileUpload onFileSelected={handleFileSelected} disabled={isAnalyzing} />
            )}
          </motion.div>

          {/* Error */}
          {error && (
            <div className="mb-8 p-4 border border-destructive/30 bg-destructive/5 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-destructive uppercase">Error</p>
                <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Sample data */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-4 h-[1.5px] bg-border" />
              <span className="editorial-label">Sample Data</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-px bg-border border border-border">
              {DEMO_FILES.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => handleLoadDemo(demo.isManipulated)}
                  disabled={isAnalyzing}
                  className="bg-card p-5 text-left hover:bg-secondary/30 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {demo.isManipulated ? (
                        <AlertTriangle className="w-4 h-4 text-accent" />
                      ) : (
                        <Beaker className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{demo.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {demo.description}
                      </p>
                      {demo.manipulation && (
                        <p className="text-[10px] font-bold text-accent mt-1.5 uppercase tracking-wider font-mono">
                          {demo.manipulation}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
