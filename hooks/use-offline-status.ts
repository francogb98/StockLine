import { useState, useEffect, useCallback } from "react";
import { isOnline, onStatusChange, getQueueCount } from "@/lib/offline";

export interface UseOfflineStatusReturn {
  isOnline: boolean;
  pendingCount: number;
  refreshCount: () => Promise<void>;
}

export function useOfflineStatus(): UseOfflineStatusReturn {
  const [online, setOnline] = useState<boolean>(() => isOnline());
  const [pendingCount, setPendingCount] = useState<number>(0);

  const refreshCount = useCallback(async () => {
    const count = await getQueueCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    // Subscribe to browser online/offline events
    const unsub = onStatusChange((online) => {
      setOnline(online);
    });

    // Listen to custom DOM events
    const handleSaleQueued = () => {
      refreshCount();
    };
    const handleSyncCompleted = () => {
      refreshCount();
    };

    window.addEventListener("sale-queued", handleSaleQueued);
    window.addEventListener("sync-completed", handleSyncCompleted);

    // Initial fetch
    refreshCount();

    return () => {
      unsub();
      window.removeEventListener("sale-queued", handleSaleQueued);
      window.removeEventListener("sync-completed", handleSyncCompleted);
    };
  }, [refreshCount]);

  return { isOnline: online, pendingCount, refreshCount };
}
