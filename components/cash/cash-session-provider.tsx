"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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
  syncing: boolean;
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
  const [syncing, setSyncing] = useState(false);
  const [optimisticCashDelta, setOptimisticCashDelta] = useState(0);
  const pendingSalesRef = useRef(new Map<string, number>());
  const hasLoadedRef = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!cashControlEnabled) {
      setLoading(false);
      return;
    }
    if (!hasLoadedRef.current) setLoading(true);
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
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [cashControlEnabled]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const displayedSession = useMemo(() => {
    if (!session || optimisticCashDelta === 0) return session;
    return {
      ...session,
      currentCashTotal: session.currentCashTotal + optimisticCashDelta,
      currentTotal: session.currentTotal + optimisticCashDelta,
    };
  }, [session, optimisticCashDelta]);

  useEffect(() => {
    const handleSaleProcessing = (event: Event) => {
      const sale = (event as CustomEvent<{ sale?: { id: string; total: number; paymentMethod: string } }>).detail?.sale;
      if (!sale || sale.paymentMethod !== "cash") return;
      pendingSalesRef.current.set(sale.id, sale.total);
      setOptimisticCashDelta((current) => current + sale.total);
      setSyncing(true);
      fetchSession();
    };

    const handleSaleCompleted = (event: Event) => {
      const detail = (event as CustomEvent<{ sale?: { id: string }; optimisticSaleId?: string }>).detail;
      const saleId = detail?.optimisticSaleId || detail?.sale?.id;
      if (saleId && pendingSalesRef.current.has(saleId)) {
        const amount = pendingSalesRef.current.get(saleId) || 0;
        pendingSalesRef.current.delete(saleId);
        setOptimisticCashDelta((current) => current - amount);
      }
      setSyncing(false);
      fetchSession();
    };

    const handleSaleFailed = (event: Event) => {
      const saleId = (event as CustomEvent<{ saleId?: string }>).detail?.saleId;
      const amount = saleId ? pendingSalesRef.current.get(saleId) : undefined;
      if (amount) {
        pendingSalesRef.current.delete(saleId!);
        setOptimisticCashDelta((current) => current - amount);
      }
      setSyncing(false);
      fetchSession();
    };

    window.addEventListener("sale-processing", handleSaleProcessing);
    window.addEventListener("sale-completed", handleSaleCompleted);
    window.addEventListener("sale-failed", handleSaleFailed);
    return () => {
      window.removeEventListener("sale-processing", handleSaleProcessing);
      window.removeEventListener("sale-completed", handleSaleCompleted);
      window.removeEventListener("sale-failed", handleSaleFailed);
    };
  }, [fetchSession]);

  const handleSessionCreated = (newSession: CashSessionData) => {
    setSession(newSession);
    setDialogOpen(false);
  };

  return (
    <CashSessionContext.Provider
      value={{
        session: displayedSession,
        loading,
        syncing,
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
