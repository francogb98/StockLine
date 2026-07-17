"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/mock-data";
import type { Sale } from "@/lib/types";

interface SaleDetailDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  card: "bg-primary/10 text-primary",
  transfer: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
};

export function SaleDetailDialog({
  sale,
  open,
  onOpenChange,
}: SaleDetailDialogProps) {
  if (!sale) return null;

  const createdAt = new Date(sale.createdAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Detalle de Venta
            <span className="rounded-md border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
              #{sale.id.slice(-8).toUpperCase()}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Fecha</p>
            <p className="font-medium text-foreground">
              {createdAt.toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hora</p>
            <p className="font-medium text-foreground">
              {createdAt.toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vendedor</p>
            <p className="font-medium text-foreground">
              {sale.userName ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Método de pago</p>
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                PAYMENT_COLORS[sale.paymentMethod] ??
                  "bg-muted text-muted-foreground",
              )}
            >
              {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
            </span>
          </div>
        </div>

        {/* Items table */}
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Producto</th>
                <th className="px-4 py-2 text-center font-medium">Cant.</th>
                <th className="px-4 py-2 text-right font-medium">P. Unit.</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {item.productName}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">
              {formatCurrency(sale.subtotal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA (21%)</span>
            <span className="tabular-nums">{formatCurrency(sale.tax)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <span>Total</span>
            <span className="tabular-nums text-primary">
              {formatCurrency(sale.total)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
