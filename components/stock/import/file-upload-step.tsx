"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { validateFile, formatFileSize } from "@/lib/import/csv-reader";

interface FileUploadStepProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
}

export function FileUploadStep({
  file,
  onFileSelect,
  onFileRemove,
}: FileUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (f: File) => {
      setError(null);
      const validation = validateFile(f);
      if (!validation.valid) {
        setError(validation.error!);
        return;
      }
      onFileSelect(f);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {file ? (
        <div className="flex w-full items-center gap-3 rounded-lg border bg-muted/30 p-4">
          <FileSpreadsheet className="h-10 w-10 shrink-0 text-green-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>
          <button
            onClick={onFileRemove}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          )}
        >
          <Upload
            className={cn(
              "h-10 w-10",
              isDragging ? "text-primary" : "text-muted-foreground/40",
            )}
          />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Arrastrá el archivo aquí o hacé clic para seleccionar
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Formatos soportados: .xlsx, .xls, .csv (máx. 10MB)
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex w-full items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
