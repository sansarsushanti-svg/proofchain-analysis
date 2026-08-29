import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Image, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = {
  "image/jpeg": ".jpg,.jpeg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

const MAX_SIZE_MB = 20;

interface UploadedFile {
  file: File;
  dataUrl: string;
  name: string;
  size: number;
  type: string;
}

interface FileUploadProps {
  onFileSelected: (file: UploadedFile) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileSelected, disabled = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const isValidType = Object.keys(ACCEPTED_TYPES).includes(file.type) ||
      file.name.endsWith(".pdf") ||
      file.name.endsWith(".jpg") ||
      file.name.endsWith(".jpeg") ||
      file.name.endsWith(".png");

    if (!isValidType) {
      return "Unsupported file type. Please upload PDF, JPG, or PNG files.";
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File is too large. Maximum size is ${MAX_SIZE_MB}MB.`;
    }

    return null;
  }, []);

  const handleFile = useCallback((file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onFileSelected({ file, dataUrl, name: file.name, size: file.size, type: file.type });
    };
    reader.onerror = () => setError("Failed to read file. Please try again.");
    reader.readAsDataURL(file);
  }, [validateFile, onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  }, [handleFile, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFile(files[0]);
  }, [handleFile]);

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed transition-all cursor-pointer",
          "flex flex-col items-center justify-center py-14 px-8 text-center",
          isDragging
            ? "border-foreground bg-secondary/40"
            : "border-border bg-card hover:border-foreground/30 hover:bg-secondary/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload
          className={cn(
            "w-6 h-6 mb-4",
            isDragging ? "text-foreground" : "text-muted-foreground"
          )}
        />

        <p className="text-sm font-medium uppercase tracking-wider mb-1">
          {isDragging ? "Drop your file here" : "Drop document here"}
        </p>

        <p className="text-xs text-muted-foreground mb-4">
          or click to browse
        </p>

        <div className="flex gap-2">
          {["PDF", "JPG", "PNG"].map((type) => (
            <span
              key={type}
              className="nb-badge px-2 py-0.5 bg-secondary text-muted-foreground border-border"
            >
              {type}
            </span>
          ))}
        </div>

        <p className="text-[10px] font-mono text-muted-foreground/60 mt-3">
          Max {MAX_SIZE_MB}MB
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {error && (
        <div className="mt-3 p-3 border border-destructive/30 bg-destructive/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}

interface FilePreviewProps {
  file: UploadedFile;
  onRemove: () => void;
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = file.type.includes("image");
  const isPdf = file.type.includes("pdf");

  return (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 border border-border bg-secondary/30 flex items-center justify-center shrink-0 overflow-hidden">
          {isImage ? (
            <img
              src={file.dataUrl}
              alt={file.name}
              className="w-full h-full object-cover"
            />
          ) : isPdf ? (
            <FileText className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Image className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground font-mono">
            <span>{formatSize(file.size)}</span>
            <span>·</span>
            <span className="uppercase">{file.type.split("/")[1]}</span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1.5 border border-border hover:bg-destructive/10 hover:border-destructive/30 transition-colors shrink-0"
          title="Remove file"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
