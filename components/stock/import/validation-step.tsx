"use client";

import {
  CheckCircle,
  XCircle,
  Copy,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValidationResult } from "@/lib/import/product-import-schemas";
import { generateErrorCSV, generateImportReport } from "@/lib/import/import-service";
import { useState } from "react";

interface ValidationStepProps {
  result: ValidationResult;
}

export function ValidationStep({ result }: ValidationStepProps) {
  const [expandedError, setExpandedError] = useState<number | null>(null);
  const [expandedDuplicate, setExpandedDuplicate] = useState<number | null>(null);

  const hasErrors = result.errorRows.length > 0;
  const hasDuplicates = result.duplicateRows.length > 0;
  const hasExisting = result.existingRows.length > 0;
  const canProceed = result.validRows.length > 0;

  const handleDownloadErrors = () => {
    const csv = generateErrorCSV(result.errorRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "errores-importacion.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    const report = generateImportReport(result);
    const blob = new Blob([report], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte-importacion.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total"
          value={result.totalRows}
          icon={<CheckCircle className="h-4 w-4" />}
          color="text-muted-foreground"
        />
        <SummaryCard
          label="Válidos"
          value={result.validRows.length}
          icon={<CheckCircle className="h-4 w-4" />}
          color="text-green-600"
        />
        <SummaryCard
          label="Con errores"
          value={result.errorRows.length}
          icon={<XCircle className="h-4 w-4" />}
          color="text-destructive"
        />
        <SummaryCard
          label="Duplicados"
          value={result.duplicateRows.length}
          icon={<Copy className="h-4 w-4" />}
          color="text-orange-500"
        />
      </div>

      {!canProceed && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          No hay filas válidas para importar. Corregí los errores y volvé a intentar.
        </div>
      )}

      {/* Category analysis */}
      {result.categoryAnalysis.allUniqueNames.length > 0 && (
        <div className="rounded-md border p-3">
          <div className="mb-2 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">
              Categorías detectadas ({result.categoryAnalysis.allUniqueNames.length})
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* Existing categories */}
            {result.categoryAnalysis.existing.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Existentes ({result.categoryAnalysis.existing.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.categoryAnalysis.existing.map((cat) => (
                    <span
                      key={cat.normalizedName}
                      className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* New categories */}
            {result.categoryAnalysis.newCategories.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-blue-600">
                  <FolderPlus className="h-3 w-3" />
                  Nuevas ({result.categoryAnalysis.newCategories.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.categoryAnalysis.newCategories.map((cat) => (
                    <span
                      key={cat.normalizedName}
                      className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error rows */}
      {hasErrors && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">
              Filas con errores ({result.errorRows.length})
            </h4>
            <button
              onClick={handleDownloadErrors}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              type="button"
            >
              <Download className="h-3 w-3" />
              Descargar reporte
            </button>
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border">
            {result.errorRows.map((row) => (
              <div key={row.row}>
                <button
                  onClick={() =>
                    setExpandedError(
                      expandedError === row.row ? null : row.row,
                    )
                  }
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                  type="button"
                >
                  {expandedError === row.row ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    Fila {row.row}
                  </span>
                  <span className="truncate text-foreground">
                    {row.data.name || "(sin nombre)"}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-destructive">
                    {row.errors.length} error(es)
                  </span>
                </button>
                {expandedError === row.row && (
                  <div className="border-t bg-destructive/5 px-6 py-2">
                    {row.errors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive">
                        <span className="font-medium">{err.field}:</span>{" "}
                        {err.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate rows */}
      {hasDuplicates && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-foreground">
            Duplicados ({result.duplicateRows.length})
          </h4>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border">
            {result.duplicateRows.map((row) => (
              <div key={row.row}>
                <button
                  onClick={() =>
                    setExpandedDuplicate(
                      expandedDuplicate === row.row ? null : row.row,
                    )
                  }
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                  type="button"
                >
                  {expandedDuplicate === row.row ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    Fila {row.row}
                  </span>
                  <span className="truncate text-foreground">
                    {row.data.name || "(sin nombre)"}
                  </span>
                </button>
                {expandedDuplicate === row.row && (
                  <div className="border-t bg-orange-500/5 px-6 py-2">
                    {row.errors.map((err, i) => (
                      <p key={i} className="text-xs text-orange-600">
                        {err.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing rows (create mode) */}
      {hasExisting && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-foreground">
            Ya existentes ({result.existingRows.length})
          </h4>
          <p className="mb-2 text-xs text-muted-foreground">
            Estos productos serán omitidos en modo &quot;Crear nuevos&quot;.
          </p>
          <div className="max-h-32 overflow-y-auto rounded-md border">
            {result.existingRows.map((row) => (
              <div
                key={row.row}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  Fila {row.row}
                </span>
                <span className="truncate text-foreground">
                  {row.data.name}
                </span>
                {row.existingProduct && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    → {row.existingProduct.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download full report */}
      {(hasErrors || hasDuplicates || hasExisting) && (
        <button
          onClick={handleDownloadReport}
          className="flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          type="button"
        >
          <Download className="h-4 w-4" />
          Descargar reporte completo
        </button>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className={cn("flex items-center gap-1.5 text-xs", color)}>
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
