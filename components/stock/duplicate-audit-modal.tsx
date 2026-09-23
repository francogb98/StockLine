"use client";

import { useState, useCallback } from "react";
import {
  Loader2,
  AlertTriangle,
  Merge,
  X,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProductThumbnail } from "@/components/products/product-thumbnail";

interface AuditProduct {
  id: string;
  name: string;
  barcode: string | null;
  stock: number;
  price: number;
  cost: number;
  categoryId: string;
  imageUrl: string | null;
}

interface AuditPair {
  productAId: string;
  productBId: string;
  similarity: number;
  reason: string;
}

interface AuditGroup {
  key: string;
  products: AuditProduct[];
  pairs: AuditPair[];
}

type StockStrategy = "SUM" | "KEEP_TARGET" | "KEEP_DUPLICATE";

interface DuplicateAuditModalProps {
  open: boolean;
  onClose: () => void;
  categories: Array<{ id: string; name: string }>;
  onMergeSuccess: () => void;
}

export function DuplicateAuditModal({
  open,
  onClose,
  categories,
  onMergeSuccess,
}: DuplicateAuditModalProps) {
  const [groups, setGroups] = useState<AuditGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [mergingPair, setMergingPair] = useState<string | null>(null);
  const [dismissedGroups, setDismissedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [stockStrategies, setStockStrategies] = useState<
    Record<string, StockStrategy>
  >({});

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name || "Sin categoría";

  const runAudit = useCallback(async () => {
    setIsLoading(true);
    setDismissedGroups(new Set());
    try {
      const res = await fetch("/api/products/duplicates-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold: 0.75 }),
      });
      if (!res.ok) throw new Error("Error al auditar");
      const data = await res.json();
      setGroups(data.groups ?? []);
      setHasScanned(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al auditar duplicados",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleMerge = useCallback(
    async (
      primaryId: string,
      duplicateId: string,
      groupKey: string,
      stockStrategy: StockStrategy,
    ) => {
      const pairKey = `${primaryId}-${duplicateId}`;
      setMergingPair(pairKey);
      try {
        const res = await fetch("/api/products/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ primaryId, duplicateId, stockStrategy }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al unificar");
        }

        toast.success("Productos unificados correctamente");

        // Remove merged product from local groups
        setGroups((prev) =>
          prev
            .map((g) => {
              if (g.key !== groupKey) return g;
              return {
                ...g,
                products: g.products.filter((p) => p.id !== duplicateId),
                pairs: g.pairs.filter(
                  (p) =>
                    p.productAId !== duplicateId && p.productBId !== duplicateId,
                ),
              };
            })
            .filter((g) => g.products.length >= 2),
        );

        onMergeSuccess();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error al unificar",
        );
      } finally {
        setMergingPair(null);
      }
    },
    [onMergeSuccess],
  );

  const dismissGroup = (groupKey: string) => {
    setDismissedGroups((prev) => new Set(prev).add(groupKey));
  };

  const getStrategy = (groupKey: string): StockStrategy =>
    stockStrategies[groupKey] ?? "SUM";

  const setStrategy = (groupKey: string, strategy: StockStrategy) => {
    setStockStrategies((prev) => ({ ...prev, [groupKey]: strategy }));
  };

  const visibleGroups = groups.filter((g) => !dismissedGroups.has(g.key));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Detectar Duplicados</DialogTitle>
          <DialogDescription>
            {hasScanned
              ? `Se encontraron ${groups.length} grupo(s) de productos sospechosos.`
              : "Ejecutá el análisis para encontrar productos duplicados en tu inventario."}
          </DialogDescription>
        </DialogHeader>

        {/* Scan button */}
        {!hasScanned && (
          <div className="flex justify-center py-8">
            <button
              onClick={runAudit}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors",
                "hover:bg-primary/90 disabled:opacity-50",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando...
                </>
              ) : (
                "Iniciar análisis"
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {hasScanned && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {visibleGroups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  No se encontraron duplicados
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tu inventario está limpio. Podés cerrar esta ventana.
                </p>
              </div>
            )}

            {visibleGroups.map((group) => (
              <div
                key={group.key}
                className="rounded-lg border bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-foreground">
                      {group.products.length} productos similares
                    </span>
                  </div>
                  <button
                    onClick={() => dismissGroup(group.key)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Descartar grupo
                  </button>
                </div>

                {/* Product cards */}
                <div className="space-y-2">
                  {group.products.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md border bg-background p-3",
                        p.imageUrl && "ring-1 ring-primary/20",
                      )}
                    >
                      <ProductThumbnail
                        imageUrl={p.imageUrl}
                        name={p.name}
                        className="h-12 w-12 shrink-0 rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {p.name}
                          </p>
                          {p.imageUrl && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary shrink-0">
                              <ImageIcon className="h-2.5 w-2.5" />
                              Con imagen
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {p.barcode && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {p.barcode}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {getCategoryName(p.categoryId)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right shrink-0">
                        <div>
                          <p className="text-xs text-muted-foreground">Stock</p>
                          <p className="text-sm font-bold tabular-nums text-foreground">
                            {p.stock}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Precio</p>
                          <p className="text-sm font-medium tabular-nums text-foreground">
                            {formatCurrency(p.price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stock strategy selector + Merge buttons */}
                {group.products.length === 2 && (() => {
                  const p0 = group.products[0];
                  const p1 = group.products[1];
                  const strategy = getStrategy(group.key);
                  const isMerging = mergingPair !== null;

                  let previewStock: number;
                  if (strategy === "SUM") previewStock = p0.stock + p1.stock;
                  else if (strategy === "KEEP_TARGET") previewStock = p0.stock;
                  else previewStock = p1.stock;

                  return (
                    <div className="space-y-2.5 pt-1">
                      {/* Strategy radio group */}
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          Estrategia de stock:
                        </p>
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                          {([
                            {
                              value: "SUM" as const,
                              label: "Sumar ambos",
                              detail: `${p0.stock} + ${p1.stock} = ${p0.stock + p1.stock} u.`,
                              recommended: true,
                            },
                            {
                              value: "KEEP_TARGET" as const,
                              label: `→ ${p0.name}`,
                              detail: `${p0.stock} u.`,
                              recommended: false,
                            },
                            {
                              value: "KEEP_DUPLICATE" as const,
                              label: `→ ${p1.name}`,
                              detail: `${p1.stock} u.`,
                              recommended: false,
                            },
                          ]).map((opt) => (
                            <label
                              key={opt.value}
                              className={cn(
                                "flex cursor-pointer items-start gap-2 rounded-md border p-2 text-xs transition-colors",
                                strategy === opt.value
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-muted/50",
                              )}
                            >
                              <input
                                type="radio"
                                name={`strategy-${group.key}`}
                                value={opt.value}
                                checked={strategy === opt.value}
                                onChange={() =>
                                  setStrategy(group.key, opt.value)
                                }
                                disabled={isMerging}
                                className="mt-0.5 accent-primary"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  {opt.label}
                                  {opt.recommended && (
                                    <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                      Recomendado
                                    </span>
                                  )}
                                </span>
                                <span className="block text-muted-foreground">
                                  {opt.detail}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Merge action buttons */}
                      <div className="flex items-center gap-2">
                        <Merge className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mr-auto">
                          Unificar en ({previewStock} u.):
                        </span>
                        <button
                          onClick={() =>
                            handleMerge(
                              p0.id,
                              p1.id,
                              group.key,
                              strategy,
                            )
                          }
                          disabled={isMerging}
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                            "hover:bg-muted disabled:opacity-50",
                          )}
                        >
                          {mergingPair === `${p0.id}-${p1.id}`
                            ? "Unificando..."
                            : `→ ${p0.name}`}
                        </button>
                        <button
                          onClick={() =>
                            handleMerge(
                              p1.id,
                              p0.id,
                              group.key,
                              strategy,
                            )
                          }
                          disabled={isMerging}
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                            "hover:bg-muted disabled:opacity-50",
                          )}
                        >
                          {mergingPair === `${p1.id}-${p0.id}`
                            ? "Unificando..."
                            : `→ ${p1.name}`}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Pairwise similarity info */}
                {group.pairs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {group.pairs.map((pair, idx) => {
                      const nameA =
                        group.products.find((p) => p.id === pair.productAId)
                          ?.name ?? "?";
                      const nameB =
                        group.products.find((p) => p.id === pair.productBId)
                          ?.name ?? "?";
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {Math.round(pair.similarity * 100)}%
                          <span className="max-w-[100px] truncate">
                            {nameA}
                          </span>
                          ↔
                          <span className="max-w-[100px] truncate">
                            {nameB}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Re-scan button */}
            {visibleGroups.length > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={runAudit}
                  disabled={isLoading}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  {isLoading ? "Analizando..." : "Volver a analizar"}
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
