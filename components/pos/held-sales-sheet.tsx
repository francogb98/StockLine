"use client";

import { useState, useCallback } from "react";
import { Clock, Loader2, Trash2, RotateCcw, Inbox } from "lucide-react";
import { usePOS } from "@/lib/store-context";
import { formatCurrency } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { SuspendedSale } from "@/lib/types";

function formatTicketId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

function formatTimeShort(date: Date | string): string {
  return new Date(date).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function summarizeItems(items: SuspendedSale["items"]): string {
  if (items.length === 0) return "Sin productos";
  const first = items[0];
  const firstName = first.productName || "Producto";
  const rest = items.length - 1;
  return rest > 0 ? `${firstName} +${rest}` : firstName;
}

interface HeldSalesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored?: () => void;
}

export function HeldSalesSheet({ open, onOpenChange, onRestored }: HeldSalesSheetProps) {
  const {
    suspendedSales,
    isSuspendedSalesLoading,
    restoreSuspendedSale,
    deleteSuspendedSale,
    cart,
  } = usePOS();

  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleRestore = useCallback(
    async (sale: SuspendedSale) => {
      if (cart.length > 0) {
        toast.error(
          "El carrito no est\u00e1 vac\u00edo. Complet\u00e1 o paus\u00e1 la venta actual antes de recuperar.",
        );
        return;
      }
      setPendingId(sale.id);
      try {
        await restoreSuspendedSale(sale);
        toast.success("Venta recuperada", {
          description: formatTicketId(sale.id),
        });
        onRestored?.();
        onOpenChange(false);
      } catch (err) {
        console.error("Error restoring held sale", err);
        toast.error("No se pudo recuperar la venta");
      } finally {
        setPendingId(null);
      }
    },
    [cart.length, restoreSuspendedSale, onRestored, onOpenChange],
  );

  const handleDelete = useCallback(
    async (sale: SuspendedSale) => {
      setPendingId(sale.id);
      try {
        await deleteSuspendedSale(sale.id);
        toast.success("Venta en espera eliminada", {
          description: formatTicketId(sale.id),
        });
      } catch (err) {
        console.error("Error deleting held sale", err);
        toast.error("No se pudo eliminar la venta");
      } finally {
        setPendingId(null);
      }
    },
    [deleteSuspendedSale],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-0 pb-0 max-h-[85vh] flex flex-col"
      >
        <SheetHeader className="px-5 pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <SheetTitle className="text-base">Ventas en espera</SheetTitle>
              <SheetDescription className="text-xs">
                {suspendedSales.length === 0
                  ? "No hay ventas pausadas"
                  : `${suspendedSales.length} ${suspendedSales.length === 1 ? "venta guardada" : "ventas guardadas"}`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {isSuspendedSalesLoading && suspendedSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs font-medium">Cargando ventas en espera...</p>
            </div>
          ) : suspendedSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Sin ventas en espera</p>
              <p className="text-xs text-center max-w-[260px]">
                Las ventas que pauses desde el carrito aparecer\u00e1n ac\u00e1 para recuperarlas despu\u00e9s.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {suspendedSales.map((sale) => {
                const isPending = pendingId === sale.id;
                const cartBlocked = cart.length > 0;
                return (
                  <li
                    key={sale.id}
                    className={cn(
                      "rounded-xl border bg-card p-3 shadow-sm transition-opacity",
                      isPending && "opacity-60",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {formatTicketId(sale.id)}
                          </span>
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {formatTimeShort(sale.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {summarizeItems(sale.items)}
                        </p>
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>
                            {sale.itemCount}{" "}
                            {sale.itemCount === 1 ? "producto" : "productos"}
                          </span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatCurrency(sale.total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={() => handleRestore(sale)}
                        disabled={isPending || cartBlocked}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                          "bg-emerald-600 text-white hover:bg-emerald-700",
                          "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                        )}
                        type="button"
                        title={
                          cartBlocked
                            ? "Vaci\u00e1 el carrito para recuperar"
                            : "Cargar venta al carrito"
                        }
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Cargar
                      </button>
                      <button
                        onClick={() => handleDelete(sale)}
                        disabled={isPending}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground transition-colors",
                          "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30",
                          "focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                        )}
                        type="button"
                        title="Eliminar venta en espera"
                        aria-label="Eliminar venta en espera"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
