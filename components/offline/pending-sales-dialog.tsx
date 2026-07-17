"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";
import {
  getPendingSales,
  getFailedSales,
  retryFailedSale,
  flushSaleQueue,
} from "@/lib/offline";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import type { QueuedSale } from "@/lib/offline";

interface PendingSalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

export function PendingSalesDialog({
  open,
  onOpenChange,
}: PendingSalesDialogProps) {
  const { refreshCount } = useOfflineStatus();
  const [pending, setPending] = useState<QueuedSale[]>([]);
  const [failed, setFailed] = useState<QueuedSale[]>([]);

  const loadSales = useCallback(async () => {
    const [p, f] = await Promise.all([getPendingSales(), getFailedSales()]);
    setPending(p);
    setFailed(f);
  }, []);

  useEffect(() => {
    if (open) {
      loadSales();
    }
  }, [open, loadSales]);

  const handleRetry = async (saleId: string) => {
    await retryFailedSale(saleId);
    await loadSales();
    await refreshCount();
  };

  const handleSyncNow = async () => {
    window.dispatchEvent(new CustomEvent("sync-requested"));
    await loadSales();
    await refreshCount();
  };

  const handleRefresh = async () => {
    await loadSales();
    await refreshCount();
  };

  const totalSales = pending.length + failed.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ventas pendientes</DialogTitle>
          <DialogDescription>
            {totalSales} venta{totalSales !== 1 ? "s" : ""} en cola
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {pending.length === 0 && failed.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay ventas pendientes
            </p>
          )}

          {pending.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono">{truncateId(sale.id)}</p>
                <p className="text-xs text-muted-foreground">
                  {sale.items.length} producto{sale.items.length !== 1 ? "s" : ""} · {formatCurrency(sale.total)} · {formatDate(sale.createdAt)}
                </p>
              </div>
              <Badge variant="secondary">Pendiente</Badge>
            </div>
          ))}

          {failed.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono">{truncateId(sale.id)}</p>
                <p className="text-xs text-muted-foreground">
                  {sale.items.length} producto{sale.items.length !== 1 ? "s" : ""} · {formatCurrency(sale.total)} · {formatDate(sale.createdAt)}
                </p>
                {sale.lastError && (
                  <p className="text-xs text-destructive mt-0.5" title={sale.lastError}>
                    {sale.lastError.length > 50 ? sale.lastError.slice(0, 50) + "…" : sale.lastError}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Fallida</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRetry(sale.id)}
                >
                  Reintentar
                </Button>
              </div>
            </div>
          ))}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleSyncNow}>Sync Now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
