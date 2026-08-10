"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Package, Scale } from "lucide-react";
import { cn, formatUnitLabel, formatQuantity } from "@/lib/utils";
import { formatCurrency } from "@/lib/mock-data";
import type { Product, ProductPresentation } from "@/lib/types";

interface PresentationDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  onSelectFree: (product: Product, quantity: number) => void;
  onSelectPresentation: (
    product: Product,
    presentation: ProductPresentation,
  ) => void;
}

type Mode = "presentation" | "free";

export function PresentationDialog({
  open,
  onClose,
  product,
  onSelectFree,
  onSelectPresentation,
}: PresentationDialogProps) {
  const [mode, setMode] = useState<Mode>("presentation");
  const [presentationId, setPresentationId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const presentations = (product.presentations ?? []).filter((p) => p.active);

  useEffect(() => {
    if (open && presentations.length > 0 && !presentationId) {
      setPresentationId(presentations[0].id ?? "");
    }
  }, [open, presentations, presentationId]);

  useEffect(() => {
    if (!open) {
      setMode("presentation");
      setQuantity("");
      setError(null);
    } else if (mode === "free") {
      const t = setTimeout(() => quantityInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open, mode]);

  if (!open) return null;

  const handleSelectPresentation = () => {
    const pres = presentations.find((p) => p.id === presentationId);
    if (!pres) {
      setError("Selecciona una presentación");
      return;
    }
    onSelectPresentation(product, pres);
  };

  const handleSelectFree = () => {
    const q = parseFloat(quantity.replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) {
      setError("Ingresá una cantidad válida");
      return;
    }
    if (q > product.stock) {
      setError(`Stock insuficiente. Disponible: ${formatQuantity(product.stock, product.unit)}`);
      return;
    }
    onSelectFree(product, q);
  };

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

      <div className="relative z-10 flex w-full max-w-md flex-col rounded-lg bg-card shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              ¿Cómo desea venderlo?
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
          {presentations.map((p) => (
            <button
              key={p.id ?? p.name}
              type="button"
              onClick={() => onSelectPresentation(product, p)}
              className="flex w-full items-center justify-between gap-3 rounded-md border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-accent/30"
              data-testid={`presentation-option-${p.id ?? p.name}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Package className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatQuantity(p.quantity, p.unit)} por unidad
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(product.price * p.quantity)}
              </span>
            </button>
          ))}

          <div className="relative my-2 flex items-center">
            <div className="flex-1 border-t" />
            <span className="px-2 text-xs text-muted-foreground">o</span>
            <div className="flex-1 border-t" />
          </div>

          {mode === "free" ? (
            <div className="space-y-2">
              <label
                htmlFor="presentation-dialog-qty"
                className="block text-sm font-medium text-foreground"
              >
                Cantidad en {formatUnitLabel(product.unit)}
              </label>
              <input
                id="presentation-dialog-qty"
                ref={quantityInputRef}
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
                    handleSelectFree();
                  }
                }}
                placeholder="0.000"
                className={cn(
                  "h-10 w-full rounded-md border bg-background px-3 text-sm tabular-nums",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  error && "border-destructive",
                )}
                data-testid="presentation-dialog-qty-input"
              />
              {quantity && parseFloat(quantity.replace(",", ".")) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(
                      product.price * parseFloat(quantity.replace(",", ".")),
                    )}
                  </span>
                </p>
              )}
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("presentation");
                    setError(null);
                  }}
                  className="flex-1 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleSelectFree}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  data-testid="presentation-dialog-free-confirm"
                >
                  Agregar al carrito
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMode("free")}
              className="flex w-full items-center justify-between gap-3 rounded-md border border-dashed bg-background p-3 text-left transition-colors hover:border-primary hover:bg-accent/30"
              data-testid="presentation-dialog-free-option"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Scale className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">Suelto</p>
                  <p className="text-xs text-muted-foreground">
                    Vender por {formatUnitLabel(product.unit)} en cantidad libre
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                Stock: {formatQuantity(product.stock, product.unit)}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
