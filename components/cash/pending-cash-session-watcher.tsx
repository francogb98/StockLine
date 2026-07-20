"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/store-context";
import { PendingCashSessionDialog } from "./pending-cash-session-dialog";

export function PendingCashSessionWatcher() {
  const { pendingCashSession, clearPendingCashSession } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const hasShown = useRef(false);

  useEffect(() => {
    if (pendingCashSession && !hasShown.current) {
      hasShown.current = true;
      setShowDialog(true);
    }
  }, [pendingCashSession]);

  const handleClose = () => {
    setShowDialog(false);
    clearPendingCashSession();
  };

  const handleClosed = () => {
    setShowDialog(false);
    clearPendingCashSession();
  };

  if (!pendingCashSession) return null;

  return (
    <PendingCashSessionDialog
      open={showDialog}
      session={pendingCashSession}
      onClose={handleClose}
      onSessionClosed={handleClosed}
    />
  );
}
