"use client";

import { useEffect, useRef, useState } from "react";
import {
  Receipt,
  TrendingUp,
  AlertTriangle,
  Package,
  Loader2,
  Clock,
  Trash2,
} from "lucide-react";
import { useAuth, useData, usePOS } from "@/lib/store-context";
import { formatCurrency, formatTime } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { SaleDetailDialog } from "@/components/dashboard/sale-detail-dialog";
import { toast } from "sonner";
import type { Sale, SuspendedSale } from "@/lib/types";

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  return `Hace ${diffH}d`;
}

export function TodaySalesPanel() {
  const { isSessionLoading } = useAuth();
  const { getTodaySales, getLowStockProducts } = useData();
  const {
    suspendedSales,
    restoreSuspendedSale,
    deleteSuspendedSale,
    cart,
  } = usePOS();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [highlightedSaleId, setHighlightedSaleId] = useState<string | null>(
    null,
  );
  const lastTopSaleIdRef = useRef<string | null>(null);

  const todaySales = getTodaySales();
  const lowStockProducts = getLowStockProducts();

  const totalRevenue = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const totalItems = todaySales.reduce(
    (sum, sale) =>
      sum +
      (sale.items ?? []).reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );

  useEffect(() => {
    const currentTopSaleId = todaySales[0]?.id;

    if (!currentTopSaleId) {
      return;
    }

    if (!lastTopSaleIdRef.current) {
      lastTopSaleIdRef.current = currentTopSaleId;
      return;
    }

    if (lastTopSaleIdRef.current !== currentTopSaleId) {
      setHighlightedSaleId(currentTopSaleId);
      lastTopSaleIdRef.current = currentTopSaleId;

      const timeout = window.setTimeout(() => {
        setHighlightedSaleId((prev) =>
          prev === currentTopSaleId ? null : prev,
        );
      }, 3000);

      return () => window.clearTimeout(timeout);
    }
  }, [todaySales]);

  const handleRestore = async (suspendedSale: SuspendedSale) => {
    if (cart.length > 0) {
      toast.error(
        "El carrito no está vacío. Completá o cancelá la venta actual antes de recuperar.",
      );
      return;
    }
    await restoreSuspendedSale(suspendedSale);
    toast.success("Venta recuperada correctamente.");
  };

  if (isSessionLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-xs font-medium">Cargando resumen...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Stats header */}
      <div className="border-b bg-muted/30 p-3">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Resumen del día
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-card p-2 shadow-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Receipt className="h-3.5 w-3.5" />
              <span className="text-[10px]">Ventas</span>
            </div>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
              {todaySales.length}
            </p>
          </div>
          <div className="rounded-lg bg-card p-2 shadow-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span className="text-[10px]">Items</span>
            </div>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
              {totalItems}
            </p>
          </div>
          <div className="rounded-lg bg-card p-2 shadow-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px]">Total</span>
            </div>
            <p className="mt-0.5 text-base font-bold tabular-nums text-primary">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStockProducts.length > 0 && (
        <div className="border-b p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[hsl(var(--warning))]">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">
              Stock bajo ({lowStockProducts.length})
            </span>
          </div>
          <div className="space-y-1">
            {lowStockProducts.slice(0, 3).map((product) => (
              <div
                key={product.id}
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1 text-xs",
                  product.stock === 0
                    ? "bg-destructive/10"
                    : "bg-[hsl(var(--warning))]/10",
                )}
              >
                <span className="truncate">{product.name}</span>
                <span
                  className={cn(
                    "font-medium",
                    product.stock === 0
                      ? "text-destructive"
                      : "text-[hsl(var(--warning))]",
                  )}
                >
                  {product.stock === 0 ? "Sin stock" : `${product.stock} uds`}
                </span>
              </div>
            ))}
            {lowStockProducts.length > 3 && (
              <p className="text-[10px] text-muted-foreground">
                Y {lowStockProducts.length - 3} productos más...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Suspended sales - only render if there are any */}
      {suspendedSales.length > 0 && (
        <div className="border-b p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-medium text-muted-foreground">
              Ventas en espera
            </h3>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {suspendedSales.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {suspendedSales.map((suspended) => (
              <div
                key={suspended.id}
                onClick={() => handleRestore(suspended)}
                className={cn(
                  "group flex cursor-pointer items-center justify-between rounded-md border border-dashed border-muted-foreground/20 bg-muted/20 px-2.5 py-1.5 transition-colors hover:bg-muted/40",
                  cart.length > 0 && "opacity-50 cursor-not-allowed",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-foreground">
                      #{suspended.id.slice(-6).toUpperCase()}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTimeAgo(suspended.createdAt)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {suspended.itemCount} producto(s)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold tabular-nums text-foreground">
                    {formatCurrency(suspended.total)}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSuspendedSale(suspended.id);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    type="button"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sales */}
      <div className="flex-1 overflow-auto p-3">
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">
          Ventas recientes
        </h3>
        {todaySales.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-muted-foreground">
            <Receipt className="h-8 w-8 opacity-30" />
            <p className="text-xs">Sin ventas hoy</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {todaySales.slice(0, 10).map((sale) => (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-md border bg-card px-2.5 py-1.5 transition-colors duration-500 hover:bg-muted/50",
                  highlightedSaleId === sale.id &&
                    "border-emerald-300 bg-emerald-50/70 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/70",
                )}
              >
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {formatTime(new Date(sale.createdAt))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(sale.items ?? []).length} producto(s) -{" "}
                    {sale.paymentMethod === "cash"
                      ? "Efectivo"
                      : sale.paymentMethod === "card"
                        ? "Tarjeta"
                        : "Transferencia"}
                  </p>
                </div>
                <p className="text-xs font-semibold tabular-nums text-foreground">
                  {formatCurrency(sale.total)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <SaleDetailDialog
        sale={selectedSale}
        open={!!selectedSale}
        onOpenChange={(open) => {
          if (!open) setSelectedSale(null);
        }}
      />
    </div>
  );
}
