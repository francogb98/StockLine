"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, ArrowLeft, Clock } from "lucide-react";
import { usePOS } from "@/lib/store-context";
import { cn } from "@/lib/utils";
import { QuickProducts } from "./quick-products";
import { CartPanel } from "./cart-panel";
import { PaymentPanel } from "./payment-panel";
import { TodaySalesPanel } from "./today-sales-panel";
import { CartFloatingBar } from "./cart-floating-bar";
import { HeldSalesSheet } from "./held-sales-sheet";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { toast } from "sonner";
import type { Sale } from "@/lib/types";

type View = "products" | "cart" | "sales";

interface MobilePOSProps {
  onSaleComplete?: (sale: Sale) => void;
}

export function MobilePOS({ onSaleComplete }: MobilePOSProps) {
  const [view, setView] = useState<View>("products");
  const [isHeldSheetOpen, setIsHeldSheetOpen] = useState(false);
  const { cart, total, clearCart, suspendedSales } = usePOS();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCartOpen = useCallback(() => {
    if (totalItems === 0) {
      toast.message("Carrito vac\u00edo", {
        description: "Agreg\u00e1 productos para comenzar",
      });
      return;
    }
    setView("cart");
  }, [totalItems]);

  const handleClearCart = useCallback(() => {
    const count = totalItems;
    clearCart();
    toast.success("Carrito vaciado", {
      description: `${count} ${count === 1 ? "producto eliminado" : "productos eliminados"}`,
    });
  }, [clearCart, totalItems]);

  const handleSaleComplete = useCallback(
    (sale: Sale) => {
      onSaleComplete?.(sale);
      setView("products");
    },
    [onSaleComplete],
  );

  const handleRestoredToCart = useCallback(() => {
    setView("cart");
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <OfflineBanner />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {view === "products" && (
            <motion.div
              key="products"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-0">
                <h1 className="text-lg font-semibold">Vender</h1>
                <div className="flex items-center gap-1.5">
                  {suspendedSales.length > 0 && (
                    <button
                      onClick={() => setIsHeldSheetOpen(true)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                        "bg-amber-100 text-amber-800 hover:bg-amber-200",
                        "dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60",
                        "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1",
                      )}
                      type="button"
                      aria-label={`Ver ${suspendedSales.length} ventas en espera`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{suspendedSales.length}</span>
                      <span className="hidden sm:inline">En espera</span>
                    </button>
                  )}
                  <button
                    onClick={() => setView("sales")}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                  >
                    <Receipt className="h-4 w-4" />
                    Ventas
                  </button>
                </div>
              </div>
              <div
                className={cn(
                  "flex-1 overflow-hidden transition-[padding] duration-200",
                  totalItems > 0 ? "pb-28" : "pb-0",
                )}
              >
                <QuickProducts />
              </div>
            </motion.div>
          )}

          {view === "cart" && (
            <motion.div
              key="cart"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="flex items-center justify-between border-b px-4 pt-3 pb-2 shrink-0">
                <button
                  onClick={() => setView("products")}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Productos
                </button>
                <span className="text-sm font-semibold">Carrito</span>
                <div className="w-20" />
              </div>
              <div className="flex-1 overflow-hidden min-h-0">
                <CartPanel />
              </div>
              <div className="shrink-0 border-t bg-background">
                <PaymentPanel onSaleComplete={handleSaleComplete} />
              </div>
            </motion.div>
          )}

          {view === "sales" && (
            <motion.div
              key="sales"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="flex items-center gap-2 border-b px-4 pt-3 pb-2 shrink-0">
                <button
                  onClick={() => setView("products")}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </button>
                <span className="text-sm font-semibold">Ventas</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <TodaySalesPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {view === "products" && totalItems > 0 && (
          <CartFloatingBar
            key="cart-bar"
            totalItems={totalItems}
            totalPrice={total}
            onClick={handleCartOpen}
            onClear={handleClearCart}
          />
        )}
      </AnimatePresence>

      <HeldSalesSheet
        open={isHeldSheetOpen}
        onOpenChange={setIsHeldSheetOpen}
        onRestored={handleRestoredToCart}
      />
    </div>
  );
}
