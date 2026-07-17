"use client";

import { useState, useEffect, useMemo } from "react";
import { X, History, ArrowUpDown, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockMovement, MovementType } from "@/lib/types";

const typeLabels: Record<MovementType, string> = {
  SALE: "Venta",
  RETURN: "Devolución",
  MANUAL_ADJUSTMENT: "Ajuste manual",
  PRODUCT_CREATION: "Creación",
  IMPORT: "Importación",
  STOCK_CORRECTION: "Corrección",
  CANCELLATION: "Cancelación",
};

const typeColors: Record<MovementType, string> = {
  SALE: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  RETURN: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
  MANUAL_ADJUSTMENT: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
  PRODUCT_CREATION: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950",
  IMPORT: "text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950",
  STOCK_CORRECTION: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950",
  CANCELLATION: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

interface StockMovementHistoryProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export function StockMovementHistory({
  open,
  onClose,
  productId,
  productName,
}: StockMovementHistoryProps) {
  const [sortAsc, setSortAsc] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    async function fetchMovements() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stock-movements?productId=${productId}`);
        if (!res.ok) {
          throw new Error("Error al cargar movimientos");
        }
        const data = await res.json();
        setMovements(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar movimientos");
      } finally {
        setIsLoading(false);
      }
    }

    fetchMovements();
  }, [open, productId]);

  const sortedMovements = useMemo(() => {
    const sorted = [...movements].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortAsc ? diff : -diff;
    });
    return sorted;
  }, [movements, sortAsc]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        aria-label="Close dialog"
      />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-card shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Historial de Stock
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-3">
          <p className="text-sm font-medium text-foreground">{productName}</p>
          <p className="text-xs text-muted-foreground">{sortedMovements.length} movimientos</p>
        </div>

        <div className="flex-1 overflow-auto px-5 pb-4">
          {isLoading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <p className="mt-2 text-sm text-muted-foreground">Cargando movimientos...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-12">
              <Package className="h-12 w-12 text-destructive/30" />
              <p className="mt-2 text-sm text-destructive">{error}</p>
            </div>
          ) : sortedMovements.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">
                Sin movimientos registrados
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                  <th className="p-2 text-right text-xs font-medium text-muted-foreground">
                    <button
                      onClick={() => setSortAsc(!sortAsc)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      type="button"
                    >
                      Cantidad
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="p-2 text-right text-xs font-medium text-muted-foreground">Stock anterior</th>
                  <th className="p-2 text-right text-xs font-medium text-muted-foreground">Stock nuevo</th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground">Usuario</th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {sortedMovements.map((m) => (
                  <tr key={m.id} className="border-b text-sm hover:bg-muted/30">
                    <td className="p-2 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="p-2">
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", typeColors[m.type])}>
                        {typeLabels[m.type]}
                      </span>
                    </td>
                    <td className={cn("p-2 text-right font-bold tabular-nums", m.quantity > 0 ? "text-green-600" : "text-red-600")}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="p-2 text-right tabular-nums text-muted-foreground">{m.previousStock}</td>
                    <td className="p-2 text-right tabular-nums text-muted-foreground">{m.newStock}</td>
                    <td className="p-2 text-muted-foreground">{m.userName ?? "—"}</td>
                    <td className="p-2 text-muted-foreground max-w-[150px] truncate">{m.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
