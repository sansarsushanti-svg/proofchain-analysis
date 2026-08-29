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
      return `Unsupported file type. Please upload PDF, JPG, or PNG files.`;
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
          "relative border-3 border-dashed transition-all cursor-pointer",
          "flex flex-col items-center justify-center py-16 px-8 text-center",
          isDragging
            ? "border-foreground bg-muted/50"
            : "border-border bg-card hover:border-foreground/50 hover:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div
          className={cn(
            "w-16 h-16 flex items-center justify-center mb-4 border-3",
            isDragging ? "bg-foreground text-background" : "bg-muted text-foreground border-border"
          )}
        >
          <Upload className="w-7 h-7" />
        </div>

        <p className="text-lg font-bold uppercase tracking-wider mb-2">
          {isDragging ? "Drop your file here" : "Upload a file for analysis"}
        </p>

        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop or click to browse
        </p>

        <div className="flex gap-2 flex-wrap justify-center">
          {["PDF", "JPG", "PNG"].map((type) => (
            <span
              key={type}
              className="nb-badge px-3 py-1 bg-muted text-muted-foreground"
            >
              {type}
            </span>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Maximum file size: {MAX_SIZE_MB}MB
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
        <div className="mt-4 p-4 border-2 border-red-300 bg-red-50 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-red-700 uppercase">Upload Error</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
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
    <div className="border-3 border-border bg-card p-4">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 border-2 border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {isImage ? (
            <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
          ) : isPdf ? (
            <FileText className="w-7 h-7 text-foreground" />
          ) : (
            <Image className="w-7 h-7 text-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{file.name}</p>
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
            <span>{formatSize(file.size)}</span>
            <span className="uppercase font-semibold">{file.type.split("/")[1]}</span>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-2 border-2 border-border hover:border-red-300 hover:bg-red-50 transition-colors shrink-0"
          title="Remove file"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
