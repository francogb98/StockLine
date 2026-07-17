"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, Loader2, AlertTriangle, Coins } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CloseCashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    openingAmount: number;
    currentCashTotal: number;
    currentTotal: number;
    salesCount: number;
    userName: string;
  };
  onSessionClosed: () => void;
}

export function CloseCashDialog({
  open,
  onOpenChange,
  session,
  onSessionClosed,
}: CloseCashDialogProps) {
  const [closingAmount, setClosingAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const expectedAmount = session.openingAmount + session.currentCashTotal;
  const closingNum = parseFloat(closingAmount) || 0;
  const difference = closingNum - expectedAmount;
  const hasDifference = Math.abs(difference) > 0.01;

  const handleClose = async () => {
    if (closingNum < 0) {
      toast.error("El monto contado no puede ser negativo");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/cash-sessions/${session.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closingAmount: closingNum || 0,
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al cerrar caja");
        return;
      }

      toast.success("Caja cerrada correctamente");

      if (data.difference) {
        const diffText =
          data.difference > 0
            ? `Sobrante: ${formatCurrency(data.difference)}`
            : `Faltante: ${formatCurrency(Math.abs(data.difference))}`;
        toast(diffText);
      }

      onSessionClosed();
    } catch (error) {
      toast.error("Error de conexión al cerrar caja");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-600" />
            Cerrar Caja
          </DialogTitle>
          <DialogDescription>
            Registrá el efectivo contado para cerrar el turno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Resumen del turno
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Abrió</span>
                <span className="font-medium">{session.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ventas</span>
                <span className="font-medium">{session.salesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto inicial</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(session.openingAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ventas efectivo</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(session.currentCashTotal)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1.5 font-semibold">
                <span>Efectivo esperado</span>
                <span className="tabular-nums">
                  {formatCurrency(expectedAmount)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Ventas tarjeta/transferencia</span>
                <span className="tabular-nums">
                  {formatCurrency(session.currentTotal - session.currentCashTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Monto contado */}
          <div>
            <label className="text-sm font-medium text-foreground">
              Efectivo contado en caja
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="h-10 w-full rounded-md border bg-background pl-7 pr-4 text-right text-lg font-semibold tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="0"
              />
            </div>
          </div>

          {/* Diferencia */}
          {closingAmount && (
            <div
              className={cn(
                "rounded-lg border p-3",
                hasDifference
                  ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
                  : "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasDifference ? (
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span className="text-sm font-medium">
                    {hasDifference ? "Diferencia" : "Coincide"}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    difference > 0
                      ? "text-emerald-600"
                      : difference < 0
                        ? "text-red-600"
                        : "text-emerald-600",
                  )}
                >
                  {difference > 0 ? "+" : ""}
                  {formatCurrency(difference)}
                </span>
              </div>
              {hasDifference && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {difference > 0
                    ? "Sobrante en caja. Verificá que el dato sea correcto."
                    : "Faltante en caja. Revisá si hay gastos o errores."}
                </p>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="text-sm font-medium text-foreground">
              Notas (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Ej: Sin novedades"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Cerrar Caja
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
