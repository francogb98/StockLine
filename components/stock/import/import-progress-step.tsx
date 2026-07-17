"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportOptions, MappedRow, ImportResult } from "@/lib/import/product-import-schemas";

interface ImportProgressStepProps {
  products: MappedRow[];
  options: ImportOptions;
  onResult: (result: ImportResult) => void;
}

const BATCH_SIZE = 50;

export function ImportProgressStep({
  products,
  options,
  onResult,
}: ImportProgressStepProps) {
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [isImporting, setIsImporting] = useState(true);

  const executeImport = useCallback(async () => {
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);
    let currentProcessed = 0;
    const result: ImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, products.length);
      const batch = products.slice(start, end);

      try {
        const response = await fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: batch, options }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: "Error desconocido" }));
          throw new Error(errData.error || "Error en la importación");
        }

        const batchResult: ImportResult = await response.json();

        result.created += batchResult.created;
        result.updated += batchResult.updated;
        result.skipped += batchResult.skipped;
        result.errors.push(...batchResult.errors);
      } catch (error) {
        result.errors.push({
          row: start + 1,
          message: error instanceof Error ? error.message : "Error desconocido",
        });
      }

      currentProcessed += batch.length;
      setProcessed(currentProcessed);
      setProgress(Math.round((currentProcessed / products.length) * 100));
    }

    setIsImporting(false);
    onResult(result);
  }, [products, options, onResult]);

  useEffect(() => {
    executeImport();
  }, [executeImport]);

  const barWidth = `${progress}%`;
  const filledBlocks = Math.floor(progress / 5);
  const emptyBlocks = 20 - filledBlocks;
  const bar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {isImporting && (
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      )}

      <div className="text-center">
        <h4 className="text-lg font-semibold text-foreground">
          {isImporting ? "Importando productos..." : "Proceso completado"}
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          {isImporting
            ? "No cierres esta ventana mientras se completa la importación."
            : "Los resultados se muestran a continuación."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {processed} de {products.length} productos
          </span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>

        {/* Visual bar */}
        <div className="rounded-md bg-muted p-3 font-mono text-xs leading-none">
          <span className={cn("text-primary", !isImporting && "text-green-600")}>
            {bar}
          </span>
        </div>

        {/* shadcn Progress fallback */}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isImporting ? "bg-primary" : "bg-green-600",
            )}
            style={{ width: barWidth }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-center">
        <div>
          <p className="text-2xl font-bold text-green-600">{processed}</p>
          <p className="text-xs text-muted-foreground">Procesados</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{products.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>
    </div>
  );
}
