"use client";

import { WifiOff, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useOfflineStatus } from "@/hooks/use-offline-status";

export function OfflineBanner() {
  const { isOnline, pendingCount } = useOfflineStatus();

  const isSyncing = isOnline && pendingCount > 0;
  const isOffline = !isOnline;

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          key="offline"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-amber-500 text-white text-sm font-medium flex items-center justify-center gap-2 px-4 py-2"
        >
          <WifiOff className="h-4 w-4" />
          Sin conexión — las ventas se guardan localmente
        </motion.div>
      )}
      {isSyncing && (
        <motion.div
          key="syncing"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-blue-500 text-white text-sm font-medium flex items-center justify-center gap-2 px-4 py-2"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Sincronizando...
        </motion.div>
      )}
    </AnimatePresence>
  );
}
