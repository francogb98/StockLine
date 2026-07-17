"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  ArrowRightLeft,
  CheckCircle,
  Settings,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useData, useAuth } from "@/lib/store-context";
import { parseFile } from "@/lib/import/csv-reader";
import { detectColumns } from "@/lib/import/column-mapper";
import { validateImportRows } from "@/lib/import/import-service";
import type {
  ImportMapping,
  ImportOptions,
  ImportRowRaw,
  ValidationResult,
  ImportResult,
} from "@/lib/import/product-import-schemas";
import { createEmptyMapping } from "@/lib/import/product-import-schemas";
import { FileUploadStep } from "./file-upload-step";
import { ColumnMappingStep } from "./column-mapping-step";
import { ValidationStep } from "./validation-step";
import { ImportOptionsStep } from "./import-options-step";
import { ImportProgressStep } from "./import-progress-step";
import { ImportResultsStep } from "./import-results-step";

interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
}

type WizardStep = "upload" | "mapping" | "validation" | "options" | "progress" | "results";

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: "upload", label: "Archivo", icon: FileSpreadsheet },
  { id: "mapping", label: "Mapeo", icon: ArrowRightLeft },
  { id: "validation", label: "Validación", icon: CheckCircle },
  { id: "options", label: "Opciones", icon: Settings },
];

export function ImportSheet({ open, onClose }: ImportSheetProps) {
  const { categories, products } = useData();
  const { store } = useAuth();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{
    headers: string[];
    rows: ImportRowRaw[];
    totalRows: number;
  } | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>(createEmptyMapping());
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [options, setOptions] = useState<ImportOptions>({
    mode: "create",
    matchBy: "barcode",
    updateFields: ["stock", "price", "cost", "minStock"],
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Load saved mapping from localStorage
  useEffect(() => {
    if (open) {
      try {
        const storeId = store?.id;
        if (storeId) {
          const saved = localStorage.getItem(`import-mapping-${storeId}`);
          if (saved) {
            const parsed = JSON.parse(saved) as ImportMapping;
            setMapping(parsed);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [open, store]);

  const resetWizard = useCallback(() => {
    setCurrentStep("upload");
    setFile(null);
    setParsedData(null);
    setMapping(createEmptyMapping());
    setValidation(null);
    setImportResult(null);
    setParseError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetWizard();
    onClose();
  }, [resetWizard, onClose]);

  // Parse file when selected
  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f);
    setIsParsing(true);
    setParseError(null);
    try {
      const parsed = await parseFile(f);
      setParsedData({
        headers: parsed.headers,
        rows: parsed.rows as ImportRowRaw[],
        totalRows: parsed.totalRows,
      });

      // Auto-detect columns
      const detected = detectColumns(parsed.headers);
      setMapping((prev) => {
        // Merge detected with any saved mapping
        const merged = { ...prev };
        for (const [key, value] of Object.entries(detected)) {
          if (merged[key as keyof ImportMapping] === null && value !== null) {
            merged[key as keyof ImportMapping] = value;
          }
        }
        return merged;
      });

      setCurrentStep("mapping");
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "Error al leer el archivo",
      );
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileRemove = useCallback(() => {
    setFile(null);
    setParsedData(null);
    setParseError(null);
  }, []);

  // Run validation
  const runValidation = useCallback(() => {
    if (!parsedData) return;
    const result = validateImportRows(
      parsedData.rows,
      mapping,
      categories,
      products,
      options,
    );
    setValidation(result);
    setCurrentStep("validation");
  }, [parsedData, mapping, categories, products, options]);

  // Get valid products for import
  const validProducts = useMemo(() => {
    if (!validation) return [];
    return validation.validRows.map((row) => row.data);
  }, [validation]);

  // Navigation
  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const canGoBack = stepIndex > 0 && currentStep !== "progress" && currentStep !== "results";
  const canGoForward = currentStep === "mapping" && mapping.name !== null;

  const handleBack = () => {
    if (currentStep === "mapping") setCurrentStep("upload");
    else if (currentStep === "validation") setCurrentStep("mapping");
    else if (currentStep === "options") setCurrentStep("validation");
  };

  const handleForward = () => {
    if (currentStep === "mapping") runValidation();
    else if (currentStep === "validation") setCurrentStep("options");
    else if (currentStep === "options") setCurrentStep("progress");
  };

  const handleStartImport = () => {
    setCurrentStep("progress");
  };

  const handleImportResult = useCallback((result: ImportResult) => {
    setImportResult(result);
    setCurrentStep("results");
  }, []);

  // Save mapping on successful import
  useEffect(() => {
    if (currentStep === "results" && importResult && store?.id) {
      try {
        localStorage.setItem(
          `import-mapping-${store.id}`,
          JSON.stringify(mapping),
        );
      } catch {
        // ignore
      }
    }
  }, [currentStep, importResult, mapping, store]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative z-10 flex h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-card shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Importar Productos
            </h2>
            <p className="text-xs text-muted-foreground">
              Cargá productos desde un archivo Excel o CSV
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        {currentStep !== "progress" && currentStep !== "results" && (
          <div className="flex shrink-0 items-center gap-1 border-b px-5 py-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < stepIndex;
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      isActive && "bg-primary/10 text-primary",
                      isCompleted && "text-green-600",
                      !isActive && !isCompleted && "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="mx-0.5 h-3 w-3 text-muted-foreground/30" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
          {isParsing && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Leyendo archivo...</p>
            </div>
          )}

          {parseError && !isParsing && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-destructive">{parseError}</p>
              <button
                onClick={handleFileRemove}
                className="text-sm text-primary hover:underline"
                type="button"
              >
                Seleccionar otro archivo
              </button>
            </div>
          )}

          {!isParsing && !parseError && currentStep === "upload" && (
            <FileUploadStep
              file={file}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
            />
          )}

          {currentStep === "mapping" && parsedData && (
            <ColumnMappingStep
              headers={parsedData.headers}
              previewRows={parsedData.rows.slice(0, 5)}
              mapping={mapping}
              onMappingChange={setMapping}
            />
          )}

          {currentStep === "validation" && validation && (
            <ValidationStep result={validation} />
          )}

          {currentStep === "options" && (
            <ImportOptionsStep
              options={options}
              onOptionsChange={setOptions}
              existingCount={validation?.existingRows.length ?? 0}
            />
          )}

          {currentStep === "progress" && (
            <ImportProgressStep
              products={validProducts}
              options={options}
              onResult={handleImportResult}
            />
          )}

          {currentStep === "results" && importResult && validation && (
            <ImportResultsStep
              importResult={importResult}
              validationResult={validation}
              onReset={resetWizard}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Footer */}
        {currentStep !== "progress" && currentStep !== "results" && (
          <div className="flex shrink-0 items-center justify-between border-t px-5 py-3">
            <button
              onClick={handleBack}
              disabled={!canGoBack}
              className={cn(
                "flex items-center gap-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                canGoBack
                  ? "text-muted-foreground hover:bg-muted"
                  : "cursor-not-allowed text-muted-foreground/30",
              )}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
              Atrás
            </button>

            {currentStep === "mapping" ? (
              <button
                onClick={handleForward}
                disabled={!canGoForward}
                className={cn(
                  "flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors",
                  canGoForward
                    ? "hover:bg-primary/90"
                    : "cursor-not-allowed opacity-50",
                )}
                type="button"
              >
                Validar
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : currentStep === "validation" ? (
              <button
                onClick={handleForward}
                disabled={!validation || validation.validRows.length === 0}
                className={cn(
                  "flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors",
                  validation && validation.validRows.length > 0
                    ? "hover:bg-primary/90"
                    : "cursor-not-allowed opacity-50",
                )}
                type="button"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : currentStep === "options" ? (
              <button
                onClick={handleStartImport}
                className="flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                type="button"
              >
                Importar {validProducts.length} productos
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
