"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Receipt, ArrowLeft } from "lucide-react";
import { usePOS } from "@/lib/store-context";
import { QuickProducts } from "./quick-products";
import { CartPanel } from "./cart-panel";
import { PaymentPanel } from "./payment-panel";
import { TodaySalesPanel } from "./today-sales-panel";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { toast } from "sonner";
import type { Sale } from "@/lib/types";

type View = "products" | "cart" | "sales";

interface MobilePOSProps {
  onSaleComplete?: (sale: Sale) => void;
}

export function MobilePOS({ onSaleComplete }: MobilePOSProps) {
  const [view, setView] = useState<View>("products");
  const { cart } = usePOS();

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

  const handleSaleComplete = useCallback(
    (sale: Sale) => {
      onSaleComplete?.(sale);
      setView("products");
    },
    [onSaleComplete],
  );

  return (
    <div className="flex min-h-[calc(100dvh-52px-72px)] flex-col">
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
                <button
                  onClick={() => setView("sales")}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  <Receipt className="h-4 w-4" />
                  Ventas
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
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

      {view === "products" && totalItems > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={handleCartOpen}
          className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-shadow active:scale-95"
          type="button"
          aria-label={`Carrito con ${totalItems} productos`}
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground tabular-nums">
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        </motion.button>
      )}
    </div>
  );
}
