"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Undo2,
  Filter,
  Loader2,
  X,
  ShoppingCart,
  Calendar,
  User as UserIcon,
  Package,
} from "lucide-react";
import { useAuth } from "@/lib/store-context";
import { useDevoluciones, type Devolucion } from "@/hooks/use-devoluciones";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type FilterKey = "all" | "today" | "last7";

function within(filter: FilterKey, iso: string): boolean {
  if (filter === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  if (filter === "today") {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  if (filter === "last7") {
    const seven = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - d.getTime() <= seven;
  }
  return true;
}

export function DevolucionesView() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { items, total, loading, error, refresh } = useDevoluciones({
    limit: 100,
  });

  useEffect(() => {
    if (user?.role) void refresh();
  }, [user?.role, refresh]);

  const filtered = useMemo(
    () => items.filter((d) => within(filter, d.fecha)),
    [items, filter],
  );

  const totalMonto = useMemo(
    () => filtered.reduce((acc, d) => acc + d.montoTotalDevuelto, 0),
    [filtered],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Undo2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Devoluciones</h1>
            <p className="text-xs text-muted-foreground">
              Historial de devoluciones de ventas y productos
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(
            [
              { key: "all", label: "Todas" },
              { key: "today", label: "Hoy" },
              { key: "last7", label: "Últimos 7 días" },
            ] as { key: FilterKey; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === opt.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {filtered.length} de {total} devoluciones
            </span>
            <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground">
              Total: {formatCurrency(totalMonto)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Undo2 className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No hay devoluciones en este período
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className="flex w-full items-center gap-4 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <Undo2 className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Devolución #{d.id.slice(-6)}</span>
                    <span className="text-xs text-muted-foreground">
                      · Venta #{d.ventaId.slice(-6)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(d.fecha)}
                    </span>
                    {d.userName && (
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {d.userName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {d.detalles.length} item(s)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(d.montoTotalDevuelto)}
                  </p>
                  {d.ventaTotal !== undefined && (
                    <p className="text-xs tabular-nums text-muted-foreground">
                      de {formatCurrency(d.ventaTotal)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedId && (
        <DevolucionDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function DevolucionDetailDialog({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [devolucion, setDevolucion] = useState<Devolucion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/devoluciones/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((data: Devolucion) => {
        if (!cancelled) setDevolucion(data);
      })
      .catch(() => {
        if (!cancelled) setDevolucion(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-card p-5 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <Undo2 className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              Devolución #{id.slice(-6)}
            </h2>
            {devolucion && (
              <p className="text-xs text-muted-foreground">
                {formatDateTime(devolucion.fecha)}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !devolucion ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No se pudo cargar la devolución
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-muted-foreground">Operador</p>
                <p className="font-medium">{devolucion.userName ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-muted-foreground">Venta</p>
                <p className="flex items-center gap-1 font-medium">
                  <ShoppingCart className="h-3 w-3" />#{devolucion.ventaId.slice(-6)}
                </p>
              </div>
              {devolucion.motivo && (
                <div className="col-span-2 rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground">Motivo</p>
                  <p className="font-medium">{devolucion.motivo}</p>
                </div>
              )}
              {devolucion.observaciones && (
                <div className="col-span-2 rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground">Observaciones</p>
                  <p>{devolucion.observaciones}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl border">
              <div className="border-b bg-muted/30 px-3 py-2 text-xs font-medium">
                Items devueltos
              </div>
              <div className="divide-y">
                {devolucion.detalles.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate">{d.productName ?? "Producto"}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.cantidad} × {formatCurrency(d.precioUnitario)} ·{" "}
                        {d.disposicion === "MERMAR" ? "Merma" : "Reingreso"}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(d.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium">Total devuelto</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(devolucion.montoTotalDevuelto)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}