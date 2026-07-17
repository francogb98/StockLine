"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import { PendingSalesDialog } from "@/components/offline/pending-sales-dialog";

export function PendingSalesBadge() {
  const { pendingCount } = useOfflineStatus();
  const [open, setOpen] = useState(false);

  if (pendingCount === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title={`${pendingCount} venta(s) pendiente(s)`}
      >
        <Bell className="h-5 w-5" />
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
          {pendingCount > 9 ? "9+" : pendingCount}
        </span>
      </button>
      <PendingSalesDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
