"use client";

import { useState } from "react";
import { Wallet, Coins, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/mock-data";
import { useCashControl } from "@/lib/cash-control-context";
import { useCashSession } from "./cash-session-provider";
import { CloseCashDialog } from "./close-cash-dialog";

export function CashSessionBar() {
  const { cashControlEnabled } = useCashControl();
  const { session, loading, openCashDialog, refreshSession } = useCashSession();
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const handleSessionClosed = () => {
    setShowCloseDialog(false);
    refreshSession();
  };

  if (loading) return null;
  if (!cashControlEnabled) return null;

  if (!session) {
    return (
      <div
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 transition-colors",
          "hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:hover:bg-amber-900",
        )}
        onClick={openCashDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openCashDialog();
        }}
      >
        <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
          Caja cerrada — Abrir caja
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 transition-colors",
            "hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950 dark:hover:bg-emerald-900",
          )}
          onClick={() => setShowCloseDialog(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setShowCloseDialog(true);
          }}
        >
          <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Caja: {formatCurrency(session.currentCashTotal)}
          </span>
          <span className="text-[11px] text-emerald-500 dark:text-emerald-400">
            ({session.salesCount} ventas)
          </span>
          <Plus className="h-3 w-3 rotate-45 text-emerald-500 dark:text-emerald-400" />
        </div>
      </div>
      <CloseCashDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        session={session}
        onSessionClosed={handleSessionClosed}
      />
    </>
  );
}
