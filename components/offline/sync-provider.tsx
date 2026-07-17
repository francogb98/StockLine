"use client";

import { useEffect, useRef } from "react";
import {
  setupSyncListener,
  flushSaleQueue,
  clearSyncedSales,
} from "@/lib/offline";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    cleanupRef.current = setupSyncListener();

    const handleSyncRequested = async () => {
      window.dispatchEvent(new CustomEvent("sync-started"));
      try {
        const { failed } = await flushSaleQueue();
        if (failed === 0) {
          await clearSyncedSales();
          window.dispatchEvent(new CustomEvent("sync-completed"));
        } else {
          window.dispatchEvent(new CustomEvent("sync-failed"));
        }
      } catch {
        window.dispatchEvent(new CustomEvent("sync-failed"));
      }
    };

    window.addEventListener("sync-requested", handleSyncRequested);

    return () => {
      cleanupRef.current?.();
      window.removeEventListener("sync-requested", handleSyncRequested);
    };
  }, []);

  return <>{children}</>;
}
