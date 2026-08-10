"use client";

import { useMemo, useState } from "react";
import {
  Undo2,
  AlertCircle,
  Check,
  Loader2,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDevoluciones, type Devolucion } from "@/hooks/use-devoluciones";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/mock-data";
import type { Sale, SaleItem } from "@/lib/types";
import { toast } from "sonner";

type Step = "select" | "confirm" | "done";

interface ReturnFlowDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReturned?: (devolucion: Devolucion) => void;
}

interface Selection {
  saleItemId: string;
  cantidad: number;
  disposicion: "REINGRESAR_STOCK" | "MERMAR";
}

const MAX_DISPOSICION_REASON = 200;

export function ReturnFlowDialog({
  sale,
  open,
  onOpenChange,
  onReturned,
}: ReturnFlowDialogProps) {
  const [step, setStep] = useState<Step>("select");
  const [selection, setSelection] = useState<Record<string, Selection>>({});
  const [totalReturn, setTotalReturn] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastAmount, setLastAmount] = useState<number | null>(null);
  const { create } = useDevoluciones({ autoLoad: false });

  const resetFlow = () => {
    setStep("select");
    setSelection({});
    setTotalReturn(false);
    setMotivo("");
    setSubmitError(null);
    setLastAmount(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetFlow();
    onOpenChange(next);
  };

  if (!sale) return null;

  const selectedItems = sale.items
    .map((item) => ({ item, sel: selection[item.id] }))
    .filter((x) => x.sel && x.sel.cantidad > 0);

  const previewTotal = useMemo(
    () =>
      selectedItems.reduce(
        (acc, { item, sel }) => acc + item.unitPrice * (sel?.cantidad ?? 0),
        0,
      ),
    [selectedItems],
  );

  const toggleItem = (item: SaleItem) => {
    setSelection((prev) => {
      const current = prev[item.id];
      if (current) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return {
        ...prev,
        [item.id]: {
          saleItemId: item.id,
          cantidad: item.quantity,
          disposicion: "REINGRESAR_STOCK",
        },
      };
    });
  };

  const setQty = (item: SaleItem, qty: number) => {
    setSelection((prev) => {
      const current = prev[item.id];
      if (!current) return prev;
      return {
        ...prev,
        [item.id]: {
          ...current,
          cantidad: Math.max(0, Math.min(qty, item.quantity)),
        },
      };
    });
  };

  const setDisposicion = (
    item: SaleItem,
    value: "REINGRESAR_STOCK" | "MERMAR",
  ) => {
    setSelection((prev) => {
      const current = prev[item.id];
      if (!current) return prev;
      return { ...prev, [item.id]: { ...current, disposicion: value } };
    });
  };

  const canContinue = totalReturn || selectedItems.length > 0;

  const handleConfirm = async () => {
    if (!sale) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const detalles = totalReturn
        ? []
        : selectedItems.map(({ sel }) => ({
            saleItemId: sel!.saleItemId,
            cantidad: sel!.cantidad,
            disposicion: sel!.disposicion,
          }));

      const devolucion = await create({
        ventaId: sale.id,
        total: totalReturn,
        motivo: motivo.trim() || undefined,
        detalles,
      });

      setLastAmount(devolucion.montoTotalDevuelto);
      setStep("done");
      toast.success(
        `Devolución registrada — ${formatCurrency(devolucion.montoTotalDevuelto)}`,
      );
      onReturned?.(devolucion);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al registrar la devolución");
    } finally {
      setSubmitting(false);
    }
  };

  const allReturned =
    totalReturn ||
    (sale.items.length > 0 &&
      sale.items.every((item) => {
        const s = selection[item.id];
        return s && s.cantidad === item.quantity;
      }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-4 w-4 text-amber-600" />
            Devolución de venta
          </DialogTitle>
          <DialogDescription>
            Venta #{sale.id.slice(-8).toUpperCase()} —{" "}
            {formatCurrency(sale.total)}
          </DialogDescription>
        </DialogHeader>

        {step === "done" ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold">Devolución registrada</p>
            {lastAmount !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Se devolvieron {formatCurrency(lastAmount)} al cliente
              </p>
            )}
            <Button className="mt-5" onClick={() => handleOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Productos
                </span>
                <button
                  type="button"
                  onClick={() => setTotalReturn((v) => !v)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                    totalReturn
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      : "bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  {totalReturn ? "Devolución total activada" : "Devolver todo"}
                </button>
              </div>

              <div className="space-y-1.5">
                {sale.items.map((item) => {
                  const sel = selection[item.id];
                  const active = totalReturn || (sel && sel.cantidad > 0);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg border p-2.5 text-sm transition-colors",
                        active
                          ? "border-amber-300 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-950/20"
                          : "bg-card",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </p>
                        </div>

                        {!totalReturn && (
                          <div className="flex items-center gap-1.5">
                            {sel && sel.cantidad > 0 ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setQty(item, sel.cantidad - 1)}
                                    className="flex h-6 w-6 items-center justify-center rounded-md border text-xs"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center text-sm font-medium tabular-nums">
                                    {sel.cantidad}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setQty(item, sel.cantidad + 1)}
                                    className="flex h-6 w-6 items-center justify-center rounded-md border text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                                <select
                                  value={sel.disposicion}
                                  onChange={(e) =>
                                    setDisposicion(
                                      item,
                                      e.target.value as
                                        | "REINGRESAR_STOCK"
                                        | "MERMAR",
                                    )
                                  }
                                  className="rounded-md border bg-background px-1.5 py-0.5 text-xs"
                                >
                                  <option value="REINGRESAR_STOCK">
                                    Reingresar
                                  </option>
                                  <option value="MERMAR">Mermar</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => toggleItem(item)}
                                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                                  title="Quitar"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => toggleItem(item)}
                              >
                                Devolver
                              </Button>
                            )}
                          </div>
                        )}

                        {totalReturn && (
                          <span className="text-xs text-amber-700 dark:text-amber-300">
                            Cant: {item.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">
                Motivo (opcional)
              </label>
              <input
                value={motivo}
                onChange={(e) =>
                  setMotivo(e.target.value.slice(0, MAX_DISPOSICION_REASON))
                }
                placeholder="Ej: producto defectuoso"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
                maxLength={MAX_DISPOSICION_REASON}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Total a devolver</span>
              <span className="text-base font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                {formatCurrency(totalReturn ? sale.total : previewTotal)}
              </span>
            </div>

            {allReturned && !totalReturn && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Estás devolviendo todos los productos de la venta. Podés
                  activar &quot;Devolución total&quot; para confirmar más rápido.
                </span>
              </div>
            )}

            {submitError && (
              <div className="flex items-start gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!canContinue || submitting}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                Confirmar devolución
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}