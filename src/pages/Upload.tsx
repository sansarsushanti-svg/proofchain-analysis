import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { createSession } from "@/lib/sessionStore";
import { AppNav } from "@/components/shared/AppNav";
import { FileUpload, FilePreview } from "@/components/shared/FileUpload";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Beaker,
  AlertTriangle,
} from "lucide-react";
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
    const fileName = manipulated
      ? DEMO_FILES[1].name
      : DEMO_FILES[0].name;
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

      <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-10 max-w-4xl">
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
            <h1 className="text-3xl font-black uppercase tracking-tight">
              New Analysis
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select a file to run through the forensic pipeline.
            </p>
          </motion.div>

          {/* Upload area */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
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
                  className="nb-btn-primary w-full px-8 py-4 bg-foreground text-background flex items-center justify-center gap-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-3 border-background border-t-transparent animate-spin" />
                      Queuing...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Run Analysis
                    </>
                  )}
                </button>
              </div>
            ) : (
              <FileUpload onFileSelected={handleFileSelected} disabled={isAnalyzing} />
            )}
          </motion.div>

          {/* Error display */}
          {error && (
            <div className="mb-8 p-4 border-3 border-red-300 bg-red-50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-red-700 uppercase">Error</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Demo data section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="nb-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent text-foreground flex items-center justify-center border-2 border-border">
                  <Beaker className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-wider text-sm">
                    Sample Data
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Load a sample invoice to test the pipeline
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {DEMO_FILES.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => handleLoadDemo(demo.isManipulated)}
                    disabled={isAnalyzing}
                    className="p-4 border-2 border-border text-left hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-muted border-2 border-border flex items-center justify-center shrink-0">
                        {demo.isManipulated ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Beaker className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{demo.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {demo.description}
                        </p>
                        {demo.manipulation && (
                          <p className="text-[10px] font-bold text-amber-700 mt-1 uppercase tracking-wider">
                            {demo.manipulation}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
