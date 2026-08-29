import { useState, useRef, useEffect } from "react";
import type { ForensicFinding } from "@/lib/forensics/types";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface DocumentViewerProps {
  fileDataUrl: string;
  findings: ForensicFinding[];
  onRegionClick?: (finding: ForensicFinding) => void;
}

export function DocumentViewer({
  fileDataUrl,
  findings,
  onRegionClick,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

  // Get findings with regions
  const regionFindings = findings.filter(
    (f) => f.region && !f.finding.toLowerCase().includes("no significant")
  );

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = fileDataUrl;
  }, [fileDataUrl]);

  // Compute scale factor to map finding coordinates to displayed image
  const getScaleFactor = () => {
    if (!imgRef.current || imgDimensions.width === 0) return 1;
    return imgRef.current.clientWidth / imgDimensions.width;
  };

  const handleRegionClick = (finding: ForensicFinding) => {
    setSelectedRegion(
      selectedRegion === finding.finding ? null : finding.finding
    );
    onRegionClick?.(finding);
  };

  return (
    <div className="border-3 border-border bg-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b-2 border-border">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Document Viewer
          {regionFindings.length > 0 && (
            <span className="ml-2 text-foreground">
              · {regionFindings.length} suspicious region{regionFindings.length !== 1 ? "s" : ""}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-1.5 border-2 border-border hover:bg-muted transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-bold px-2">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="p-1.5 border-2 border-border hover:bg-muted transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 border-2 border-border hover:bg-muted transition-colors ml-1"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative overflow-auto bg-muted/50 max-h-[600px] flex items-center justify-center p-4"
      >
        <div
          className="relative inline-block"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        >
          <img
            ref={imgRef}
            src={fileDataUrl}
            alt="Analyzed document"
            className="max-w-full max-h-[500px] border-2 border-border"
            onLoad={() => {
              if (imgRef.current) {
                setImgDimensions({
                  width: imgRef.current.naturalWidth,
                  height: imgRef.current.naturalHeight,
                });
              }
            }}
          />

          {/* Bounding box overlays */}
          {regionFindings.map((finding, idx) => {
            if (!finding.region) return null;
            const scale = getScaleFactor();
            const { x, y, width, height } = finding.region;
            const isSelected = selectedRegion === finding.finding;

            const severityColor =
              finding.severity === "high"
                ? "border-red-500 bg-red-500"
                : finding.severity === "medium"
                  ? "border-amber-500 bg-amber-500"
                  : "border-blue-500 bg-blue-500";

            return (
              <div
                key={idx}
                onClick={() => handleRegionClick(finding)}
                className={cn(
                  "absolute cursor-pointer border-3 transition-all",
                  severityColor,
                  isSelected ? "opacity-80" : "opacity-40 hover:opacity-70"
                )}
                style={{
                  left: `${x * scale}px`,
                  top: `${y * scale}px`,
                  width: `${width * scale}px`,
                  height: `${height * scale}px`,
                }}
                title={finding.finding}
              >
                {/* Label */}
                <div
                  className={cn(
                    "absolute -top-6 left-0 px-2 py-0.5 text-[9px] font-black uppercase whitespace-nowrap text-white",
                    severityColor
                  )}
                >
                  {idx + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* No region notice */}
      {regionFindings.length === 0 && (
        <div className="p-4 border-t-2 border-border text-center">
          <p className="text-sm text-muted-foreground">
            No precise region identified. Evidence is file-level.
          </p>
        </div>
      )}
    </div>
  );
}
