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
    <div className="border-b border-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="editorial-label">Document Viewer</span>
          {regionFindings.length > 0 && (
            <span className="text-[10px] font-mono text-accent">
              {regionFindings.length} suspicious region
              {regionFindings.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-1.5 border border-border hover:bg-secondary transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono px-2 text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="p-1.5 border border-border hover:bg-secondary transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 border border-border hover:bg-secondary transition-colors ml-1"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative overflow-auto bg-secondary/20 max-h-[600px] flex items-center justify-center p-6"
      >
        <div
          className="relative inline-block bg-card shadow-sm"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          <img
            ref={imgRef}
            src={fileDataUrl}
            alt="Analyzed document"
            className="max-w-full max-h-[500px] border border-border"
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

            return (
              <div
                key={idx}
                onClick={() => handleRegionClick(finding)}
                className={cn(
                  "absolute cursor-pointer border-2 border-accent transition-all",
                  isSelected
                    ? "bg-accent/25"
                    : "bg-accent/10 hover:bg-accent/20"
                )}
                style={{
                  left: `${x * scale}px`,
                  top: `${y * scale}px`,
                  width: `${width * scale}px`,
                  height: `${height * scale}px`,
                }}
                title={finding.finding}
              >
                <div className="absolute -top-5 left-0 px-1.5 py-0.5 text-[9px] font-mono font-medium uppercase whitespace-nowrap bg-accent text-background">
                  {idx + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* No region notice */}
      {regionFindings.length === 0 && (
        <div className="px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground font-mono">
            No precise region identified. Evidence is file-level.
          </p>
        </div>
      )}
    </div>
  );
}
