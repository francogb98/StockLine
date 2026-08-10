"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn, formatUnitLabel, formatQuantity } from "@/lib/utils";
import { formatCurrency } from "@/lib/mock-data";
import type { Product } from "@/lib/types";

interface QuantityDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  onConfirm: (product: Product, quantity: number) => void;
}

export function QuantityDialog({
  open,
  onClose,
  product,
  onConfirm,
}: QuantityDialogProps) {
  const [quantity, setQuantity] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuantity("");
      setError(null);
    } else {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    const q = parseFloat(quantity.replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) {
      setError("Ingresá una cantidad válida");
      return;
    }
    if (q > product.stock) {
      setError(`Stock insuficiente. Disponible: ${formatQuantity(product.stock, product.unit)}`);
      return;
    }
    onConfirm(product, q);
  };

  const numericQuantity = parseFloat(quantity.replace(",", "."));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        aria-label="Cerrar"
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col rounded-lg bg-card shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Cantidad
            </h2>
            <p className="text-xs text-muted-foreground">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div>
            <label
              htmlFor="quantity-dialog-qty"
              className="block text-sm font-medium text-foreground"
            >
              Cantidad ({formatUnitLabel(product.unit)})
            </label>
            <input
              id="quantity-dialog-qty"
              ref={inputRef}
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
              placeholder="0.000"
              className={cn(
                "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm tabular-nums",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                error && "border-destructive",
              )}
              data-testid="quantity-dialog-input"
            />
            {error && (
              <p className="mt-1 text-xs text-destructive">{error}</p>
            )}
          </div>

          {Number.isFinite(numericQuantity) && numericQuantity > 0 && (
            <p className="text-sm font-medium text-foreground">
              Total:{" "}
              <span className="text-base font-semibold">
                {formatCurrency(product.price * numericQuantity)}
              </span>
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Stock disponible:{" "}
            <span className="font-semibold text-foreground">
              {formatQuantity(product.stock, product.unit)}
            </span>
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              data-testid="quantity-dialog-confirm"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
