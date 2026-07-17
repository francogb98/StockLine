"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface StockAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product;
}

export function StockAdjustmentDialog({
  open,
  onClose,
  product,
}: StockAdjustmentDialogProps) {
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty === 0) {
      setError("La cantidad debe ser un número distinto de cero");
      return;
    }
    if (product.stock + qty < 0) {
      setError("El stock no puede ser negativo");
      return;
    }
    if (!reason.trim()) {
      setError("El motivo es requerido");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/stock-movements/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity: qty,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Error al ajustar stock" }));
        throw new Error(data.error || "Error al ajustar stock");
      }

      toast.success(`Stock ajustado: ${qty > 0 ? "+" : ""}${qty} unidades`);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al ajustar stock";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <div className="relative z-10 flex w-full max-w-md flex-col rounded-lg bg-card shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-semibold text-foreground">
            Ajustar Stock
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 p-5"
        >
          <div>
            <p className="text-sm font-medium text-foreground">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              Stock actual: <span className="font-bold">{product.stock}</span>
            </p>
          </div>

          <div>
            <label htmlFor="adjust-qty" className="block text-sm font-medium text-foreground">
              Cantidad
            </label>
            <p className="text-xs text-muted-foreground mb-1">
              Usá valores positivos para aumentar stock, negativos para disminuir
            </p>
            <input
              id="adjust-qty"
              type="number"
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setError(null); }}
              placeholder="Ej: 10 o -5"
              className={cn(
                "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              )}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="adjust-reason" className="block text-sm font-medium text-foreground">
              Motivo *
            </label>
            <input
              id="adjust-reason"
              type="text"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(null); }}
              placeholder="Ej: Ajuste por inventario"
              className={cn(
                "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              )}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "rounded-md border px-4 py-1.5 text-sm font-medium transition-colors",
                "hover:bg-muted",
              )}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors",
                "hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ajustando...
                </>
              ) : (
                "Ajustar Stock"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
