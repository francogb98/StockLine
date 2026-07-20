"use client";

import React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Check,
  Loader2,
  PauseCircle,
  Wallet,
  Coins,
} from "lucide-react";
import { usePOS, useAuth } from "@/lib/store-context";
import { useCashControl } from "@/lib/cash-control-context";
import { useCashSession } from "@/components/cash/cash-session-provider";
import { formatCurrency } from "@/lib/mock-data";
import type { PaymentMethod, Sale } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

interface PaymentPanelProps {
  onSaleComplete?: (sale: Sale) => void;
}

const paymentMethods: {
  value: PaymentMethod;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "cash", label: "Efectivo", icon: <Banknote className="h-4 w-4" /> },
  {
    value: "card",
    label: "Tarjeta",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    value: "transfer",
    label: "Transferencia",
    icon: <ArrowRightLeft className="h-4 w-4" />,
  },
];

export function PaymentPanel({
  onSaleComplete,
}: PaymentPanelProps) {
  const { cart, total, completeSale, clearCart, suspendSale, receivedAmount, setReceivedAmount, change } = usePOS();
  const { subscription } = useAuth();
  const { cashControlEnabled } = useCashControl();
  const { session, loading, openCashDialog } = useCashSession();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const completeSaleRef = useRef(completeSale);
  const clearCartRef = useRef(clearCart);
  const cartRef = useRef(cart);
  const isProcessingRef = useRef(isProcessing);
  const cashBlockedRef = useRef(false);

  useEffect(() => {
    completeSaleRef.current = completeSale;
  }, [completeSale]);

  useEffect(() => {
    clearCartRef.current = clearCart;
  }, [clearCart]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const isPastDue =
    subscription?.status === "past_due" || subscription?.status === "canceled";
  const cashBlocked = cashControlEnabled && !session && !loading && cart.length > 0;
  const isDisabled = cart.length === 0 || isProcessing || isPastDue || cashBlocked;
  const isActionDisabled = isDisabled || !selectedMethod;

  useEffect(() => {
    cashBlockedRef.current = cashBlocked;
  }, [cashBlocked]);

  const handleCompleteSale = useCallback(async () => {
    if (cartRef.current.length === 0 || isProcessingRef.current) return;
    if (cashBlockedRef.current) {
      openCashDialog();
      return;
    }

    if (!selectedMethod) return;

    setIsProcessing(true);

    try {
      const sale = await completeSaleRef.current(selectedMethod);

      if (sale) {
        setLastSale(sale);
        onSaleComplete?.(sale);

        setTimeout(() => setLastSale(null), 3000);
      } else {
        toast.error(
          "No se pudo completar la venta. Verificá el stock disponible.",
        );
      }
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error("Error al procesar la venta. Intentá nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedMethod, onSaleComplete]);

  const handleSuspendSale = useCallback(async () => {
    if (cartRef.current.length === 0 || isProcessingRef.current) return;

    setIsProcessing(true);
    try {
      const success = await suspendSale();
      if (success) {
        toast.success("Venta enviada a espera correctamente.");
      } else {
        toast.error("No se pudo enviar la venta a espera.");
      }
    } catch (error) {
      console.error("Error suspending sale:", error);
      toast.error("Error al enviar la venta a espera.");
    } finally {
      setIsProcessing(false);
    }
  }, [suspendSale]);

  const handleCancel = useCallback(() => {
    if (isProcessingRef.current) return;
    clearCartRef.current();
  }, []);

  useEffect(() => {
    const handleSelectMethod = (e: Event) => {
      const { method } = (e as CustomEvent).detail as { method: PaymentMethod };
      setSelectedMethod(method);
    };

    const handleConfirm = () => {
      handleCompleteSale();
    };

    const handleCancelPayment = () => {
      handleCancel();
    };

    window.addEventListener("pos:select-payment-method", handleSelectMethod);
    window.addEventListener("pos:confirm-payment", handleConfirm);
    window.addEventListener("pos:cancel-payment", handleCancelPayment);

    return () => {
      window.removeEventListener(
        "pos:select-payment-method",
        handleSelectMethod,
      );
      window.removeEventListener("pos:confirm-payment", handleConfirm);
      window.removeEventListener("pos:cancel-payment", handleCancelPayment);
    };
  }, [handleCompleteSale, handleCancel]);

  return (
    <div className="space-y-1.5 p-2">
      {/* Success notification */}
      {lastSale && (
        <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--success))] p-2 text-[hsl(var(--success-foreground))] animate-in fade-in slide-in-from-top-1 duration-200">
          <Check className="h-4 w-4" />
          <div>
            <p className="text-sm font-semibold">Venta completada</p>
            <p className="text-[11px] opacity-90">
              Total: {formatCurrency(lastSale.total)}
            </p>
          </div>
        </div>
      )}

      {/* Subscription past-due warning */}
      {isPastDue ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          Suscripción vencida. Activá un plan para volver a vender.
        </div>
      ) : null}

      {/* Cash blocked state */}
      {cashBlocked ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-center dark:border-amber-700 dark:bg-amber-950">
          <Coins className="h-8 w-8 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Debe abrir la caja para realizar una venta
            </p>
          </div>
          <button
            onClick={openCashDialog}
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            type="button"
          >
            <Wallet className="h-4 w-4" />
            Abrir Caja
          </button>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Si no usás caja, podés desactivar este control desde{' '}
              <Link
                href="/app/settings"
                className="underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-200"
              >
                Configuración
              </Link>
            </p>
        </div>
      ) : (
        <>
          {/* Payment method buttons — horizontal row */}
          <div className="flex flex-wrap gap-1.5">
            {paymentMethods.map((method) => (
              <button
                key={method.value}
                onClick={() => setSelectedMethod(method.value)}
                disabled={isDisabled}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-1.5 text-xs font-medium transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  selectedMethod === method.value
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/50",
                )}
                type="button"
              >
                <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">
                  {method.icon}
                </span>
                {method.label}
              </button>
            ))}
          </div>

          {/* Cash received input — only for cash payments */}
          {selectedMethod === "cash" && (
            <div className="space-y-1 animate-in fade-in duration-150">
              <div>
                <label htmlFor="received-amount" className="text-[10px] text-muted-foreground">
                  Dinero recibido
                </label>
                <input
                  id="received-amount"
                  type="number"
                  value={receivedAmount || ""}
                  onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="mt-0.5 h-8 w-full rounded-md border bg-background px-2.5 text-sm font-semibold tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                  min="0"
                />
              </div>
              {receivedAmount > 0 && (
                <div className="flex items-center justify-between rounded-md bg-green-50 px-2.5 py-1 dark:bg-green-950 animate-in fade-in slide-in-from-top-1 duration-150">
                  <span className="text-xs text-green-700 dark:text-green-300">Vuelto</span>
                  <span className="text-sm font-bold tabular-nums text-green-700 dark:text-green-300">
                    {change > 0 ? formatCurrency(change) : "—"}
                  </span>
                </div>
              )}
              {receivedAmount > 0 && receivedAmount < total && (
                <p className="text-[10px] text-destructive animate-in fade-in duration-150">
                  Falta {formatCurrency(total - receivedAmount)}
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-1">
            <button
              onClick={handleCompleteSale}
              data-testid="complete-sale"
              disabled={isActionDisabled}
                className={cn(
                  "flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-150",
                "hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
              )}
              type="button"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Cobrar
                </>
              )}
            </button>
            <button
              onClick={handleSuspendSale}
              disabled={isActionDisabled}
                className={cn(
                  "flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-muted-foreground/30 bg-background text-[11px] font-medium text-muted-foreground transition-all duration-150",
                "hover:border-muted-foreground/50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                "active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
              )}
              type="button"
            >
              <PauseCircle className="h-3.5 w-3.5" />
              Enviar a Espera
            </button>
          </div>

          {/* Keyboard shortcut hint */}
          <p className="text-center text-[10px] text-muted-foreground">
            Presiona{" "}
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              C
            </kbd>{" "}
            para cobrar rápido
          </p>
        </>
      )}
    </div>
  );
}
