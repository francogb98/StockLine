"use client";

import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  RotateCcw,
} from "lucide-react";
import type { ImportResult } from "@/lib/import/product-import-schemas";
import { generateImportReport } from "@/lib/import/import-service";
import type { ValidationResult } from "@/lib/import/product-import-schemas";

interface ImportResultsStepProps {
  importResult: ImportResult;
  validationResult: ValidationResult;
  onReset: () => void;
  onClose: () => void;
}

export function ImportResultsStep({
  importResult,
  validationResult,
  onReset,
  onClose,
}: ImportResultsStepProps) {
  const hasErrors = importResult.errors.length > 0;

  const handleDownloadReport = () => {
    const report = generateImportReport(validationResult, importResult);
    const blob = new Blob([report], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte-importacion.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Header */}
      <div className="text-center">
        {hasErrors ? (
          <AlertTriangle className="mx-auto h-12 w-12 text-orange-500" />
        ) : (
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
        )}
        <h4 className="mt-3 text-lg font-semibold text-foreground">
          {hasErrors
            ? "Importación completada con algunos errores"
            : "Importación completada"}
        </h4>
      </div>

      {/* Results */}
      <div className="w-full space-y-2">
        {importResult.created > 0 && (
          <ResultRow
            icon={<CheckCircle className="h-4 w-4 text-green-600" />}
            text={`${importResult.created} productos creados`}
          />
        )}
        {importResult.updated > 0 && (
          <ResultRow
            icon={<CheckCircle className="h-4 w-4 text-blue-600" />}
            text={`${importResult.updated} productos actualizados`}
          />
        )}
        {importResult.skipped > 0 && (
          <ResultRow
            icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
            text={`${importResult.skipped} productos omitidos`}
          />
        )}
        {importResult.errors.length > 0 && (
          <ResultRow
            icon={<XCircle className="h-4 w-4 text-destructive" />}
            text={`${importResult.errors.length} productos con errores`}
          />
        )}
      </div>

      {/* Error details */}
      {hasErrors && (
        <div className="w-full max-h-32 overflow-y-auto rounded-md border border-destructive/20 bg-destructive/5 p-3">
          {importResult.errors.map((err, i) => (
            <p key={i} className="text-xs text-destructive">
              Fila {err.row}: {err.message}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex w-full flex-col gap-2">
        <button
          onClick={handleDownloadReport}
          className="flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          type="button"
        >
          <Download className="h-4 w-4" />
          Descargar reporte
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          type="button"
        >
          <RotateCcw className="h-4 w-4" />
          Importar otro archivo
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          type="button"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function ResultRow({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      {icon}
      <span className="text-sm text-foreground">{text}</span>
    </div>
  );
}
