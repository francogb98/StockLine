"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, ArrowLeft } from "lucide-react";
import { usePOS } from "@/lib/store-context";
import { QuickProducts, type QuickProductsHandle } from "./quick-products";
import { CartPanel } from "./cart-panel";
import { PaymentPanel } from "./payment-panel";
import { TodaySalesPanel } from "./today-sales-panel";
import { CartFloatingBar } from "./cart-floating-bar";
import { SellFab } from "./sell-fab";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { toast } from "sonner";
import type { Sale } from "@/lib/types";

type View = "products" | "cart" | "sales";

interface MobilePOSProps {
  onSaleComplete?: (sale: Sale) => void;
}

export function MobilePOS({ onSaleComplete }: MobilePOSProps) {
  const [view, setView] = useState<View>("products");
  const { cart, total } = usePOS();
  const quickProductsRef = useRef<QuickProductsHandle>(null);

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

  const handleSellFabTap = useCallback(() => {
    quickProductsRef.current?.scrollToTop();
    quickProductsRef.current?.focusSearch();
  }, []);

  const handleSaleComplete = useCallback(
    (sale: Sale) => {
      onSaleComplete?.(sale);
      setView("products");
    },
    [onSaleComplete],
  );

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
                <button
                  onClick={() => setView("sales")}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  <Receipt className="h-4 w-4" />
                  Ventas
                </button>
              </div>
              <div className="flex-1 overflow-hidden pb-28">
                <QuickProducts ref={quickProductsRef} />
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
        {view === "products" &&
          (totalItems === 0 ? (
            <SellFab key="sell-fab" onClick={handleSellFabTap} />
          ) : (
            <CartFloatingBar
              key="cart-bar"
              totalItems={totalItems}
              totalPrice={total}
              onClick={handleCartOpen}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
