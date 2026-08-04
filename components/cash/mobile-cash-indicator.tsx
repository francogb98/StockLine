"use client";

import { useCashControl } from "@/lib/cash-control-context";
import { useCashSession } from "./cash-session-provider";
import { formatCurrency } from "@/lib/mock-data";

export function MobileCashIndicator() {
  const { session, loading, syncing } = useCashSession();
  const { cashControlEnabled } = useCashControl();

  if (!cashControlEnabled) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse" />
        <span className="text-xs text-white/60">...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        <span className="text-xs font-medium text-red-300">Cerrada</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full bg-emerald-400 ${syncing ? "animate-pulse" : ""}`} />
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-medium text-emerald-300">Abierta</span>
        <span className={`text-xs font-semibold text-white tabular-nums ${syncing ? "animate-pulse" : ""}`}>
          {formatCurrency(session.currentCashTotal)}
        </span>
      </div>
    </div>
  );
}
