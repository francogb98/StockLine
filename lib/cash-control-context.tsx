"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { saveUIState, loadUIState } from "@/lib/ui-persistence";

const CASH_CONTROL_KEY = "cashControlEnabled";
const CASH_CONTROL_DEFAULT = true;

interface CashControlContextType {
  cashControlEnabled: boolean;
  enableCashControl: () => void;
  disableCashControl: () => void;
}

const CashControlContext = createContext<CashControlContextType | null>(null);

export function useCashControl() {
  const context = useContext(CashControlContext);
  if (!context) {
    throw new Error("useCashControl must be used within CashControlProvider");
  }
  return context;
}

export function CashControlProvider({ children }: { children: ReactNode }) {
  const [cashControlEnabled, setCashControlEnabled] = useState<boolean>(() =>
    loadUIState<boolean>(CASH_CONTROL_KEY, CASH_CONTROL_DEFAULT)
  );

  const enableCashControl = useCallback(() => {
    setCashControlEnabled(true);
    saveUIState(CASH_CONTROL_KEY, true);
  }, []);

  const disableCashControl = useCallback(() => {
    setCashControlEnabled(false);
    saveUIState(CASH_CONTROL_KEY, false);
  }, []);

  return (
    <CashControlContext.Provider
      value={{ cashControlEnabled, enableCashControl, disableCashControl }}
    >
      {children}
    </CashControlContext.Provider>
  );
}
