"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useCashControl } from "@/lib/cash-control-context";
import { OpenCashDialog } from "./open-cash-dialog";

interface CashSessionData {
  id: string;
  openingAmount: number;
  userName: string;
  createdAt: string;
  salesCount: number;
  currentCashTotal: number;
  currentTotal: number;
}

interface CashSessionContextType {
  session: CashSessionData | null;
  loading: boolean;
  openCashDialog: () => void;
  refreshSession: () => Promise<void>;
}

const CashSessionContext = createContext<CashSessionContextType | null>(null);

export function useCashSession() {
  const context = useContext(CashSessionContext);
  if (!context) {
    throw new Error("useCashSession must be used within CashSessionProvider");
  }
  return context;
}

export function CashSessionProvider({ children }: { children: ReactNode }) {
  const { cashControlEnabled } = useCashControl();
  const [session, setSession] = useState<CashSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!cashControlEnabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cash-sessions/current");
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      } else {
        setSession(null);
      }
    } catch (e) {
      console.error("Error fetching current cash session", e);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [cashControlEnabled]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    const handleSaleCompleted = () => fetchSession();
    window.addEventListener("sale-completed", handleSaleCompleted);
    return () =>
      window.removeEventListener("sale-completed", handleSaleCompleted);
  }, [fetchSession]);

  const handleSessionCreated = (newSession: CashSessionData) => {
    setSession(newSession);
    setDialogOpen(false);
  };

  return (
    <CashSessionContext.Provider
      value={{
        session,
        loading,
        openCashDialog: () => setDialogOpen(true),
        refreshSession: fetchSession,
      }}
    >
      {children}
      {cashControlEnabled && (
        <OpenCashDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSessionCreated={handleSessionCreated}
        />
      )}
    </CashSessionContext.Provider>
  );
}
