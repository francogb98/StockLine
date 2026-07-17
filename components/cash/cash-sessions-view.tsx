"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Filter,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/store-context";
import { formatCurrency, formatDateTime } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CashSessionSummary {
  id: string;
  userName: string;
  openingAmount: number;
  expectedAmount: number | null;
  closingAmount: number | null;
  difference: number | null;
  notes: string | null;
  closedAt: string | null;
  createdAt: string;
  salesCount: number;
}

export function CashSessionsView() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CashSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [selectedSession, setSelectedSession] = useState<CashSessionSummary | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "open") params.set("status", "open");
      if (filter === "closed") params.set("status", "closed");
      if (user?.role !== "admin") params.set("userId", user?.id ?? "");

      const res = await fetch(`/api/cash-sessions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (e) {
      console.error("Error fetching cash sessions", e);
    } finally {
      setLoading(false);
    }
  }, [filter, user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSelectSession = async (session: CashSessionSummary) => {
    setSelectedSession(session);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(`/api/cash-sessions/${session.id}`);
      if (res.ok) {
        setDetailData(await res.json());
      }
    } catch (e) {
      console.error("Error fetching session detail", e);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Sesiones de Caja
            </h1>
            <p className="text-sm text-muted-foreground">
              Aperturas, cierres y diferencias
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex rounded-md border">
            {[
              { value: "all", label: "Todas" },
              { value: "open", label: "Abiertas" },
              { value: "closed", label: "Cerradas" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as typeof filter)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  filter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sessions list */}
        <div className="w-1/2 overflow-auto border-r p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 opacity-30" />
              <p className="mt-2">No hay sesiones de caja</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                const isOpen = !session.closedAt;
                const diff = session.difference ?? 0;
                return (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                      selectedSession?.id === session.id && "border-primary bg-primary/5",
                      isOpen && "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/50",
                    )}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        {session.userName}
                      </span>
                      {isOpen ? (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Abierta
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          <Check className="h-3 w-3" />
                          Cerrada
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                      <span>{new Date(session.createdAt).toLocaleDateString("es-AR")}</span>
                      <span className="tabular-nums font-medium">
                        {formatCurrency(session.openingAmount)}
                      </span>
                    </div>
                    {session.closedAt && diff !== 0 && (
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <span className={diff > 0 ? "text-emerald-600" : "text-red-600"}>
                          Diferencia: {diff > 0 ? "+" : ""}{formatCurrency(diff)}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="w-1/2 overflow-auto p-4">
          {!selectedSession ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p className="text-sm">Seleccioná una sesión para ver el detalle</p>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailData ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <h3 className="mb-3 font-semibold text-foreground">
                  Resumen
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Abrió</span>
                    <span className="font-medium">{detailData.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Apertura</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(detailData.openingAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Apertura</span>
                    <span className="font-medium">
                      {new Date(detailData.createdAt).toLocaleString("es-AR")}
                    </span>
                  </div>
                  {detailData.closedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cierre</span>
                      <span className="font-medium">
                        {new Date(detailData.closedAt).toLocaleString("es-AR")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ventas efectivo</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(detailData.cashTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ventas tarjeta</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(detailData.cardTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ventas transferencia</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(detailData.transferTotal)}
                    </span>
                  </div>
                  {detailData.expectedAmount != null && (
                    <>
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>Efectivo esperado</span>
                        <span className="tabular-nums">
                          {formatCurrency(detailData.expectedAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Efectivo contado</span>
                        <span className="tabular-nums">
                          {formatCurrency(detailData.closingAmount ?? 0)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "flex justify-between border-t pt-2 text-lg font-bold",
                          (detailData.difference ?? 0) > 0
                            ? "text-emerald-600"
                            : (detailData.difference ?? 0) < 0
                              ? "text-red-600"
                              : "text-foreground",
                        )}
                      >
                        <span>Diferencia</span>
                        <span className="tabular-nums">
                          {detailData.difference > 0 ? "+" : ""}
                          {formatCurrency(detailData.difference ?? 0)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {detailData.notes && (
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notas
                  </p>
                  <p className="mt-1 text-sm text-foreground">{detailData.notes}</p>
                </div>
              )}

              {detailData.sales && detailData.sales.length > 0 && (
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="mb-3 font-semibold text-foreground">
                    Ventas ({detailData.sales.length})
                  </h3>
                  <div className="max-h-64 space-y-2 overflow-auto">
                    {detailData.sales.map((sale: any) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between rounded-md bg-muted/30 p-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(sale.createdAt).toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="font-medium">{sale.userName}</span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                              sale.paymentMethod === "cash" && "bg-emerald-100 text-emerald-700",
                              sale.paymentMethod === "card" && "bg-blue-100 text-blue-700",
                              sale.paymentMethod === "transfer" && "bg-amber-100 text-amber-700",
                            )}
                          >
                            {sale.paymentMethod === "cash"
                              ? "Efectivo"
                              : sale.paymentMethod === "card"
                                ? "Tarjeta"
                                : "Transferencia"}
                          </span>
                        </div>
                        <span className="tabular-nums font-semibold">
                          {formatCurrency(sale.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


