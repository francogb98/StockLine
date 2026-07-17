"use client";

import { useState } from "react";
import { ShoppingCart, Package, Receipt } from "lucide-react";
import { usePOS } from "@/lib/store-context";
import { cn } from "@/lib/utils";
import { CartPanel } from "./cart-panel";
import { PaymentPanel } from "./payment-panel";
import { QuickProducts } from "./quick-products";
import { TodaySalesPanel } from "./today-sales-panel";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { PendingSalesBadge } from "@/components/offline/pending-sales-badge";
import type { Sale } from "@/lib/types";

type MobileView = "products" | "cart" | "sales";

interface MobilePOSProps {
  onSaleComplete?: (sale: Sale) => void;
}

export function MobilePOS({ onSaleComplete }: MobilePOSProps) {
  const [activeView, setActiveView] = useState<MobileView>("products");
  const { cart } = usePOS();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSaleComplete = (sale: Sale) => {
    onSaleComplete?.(sale);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <OfflineBanner />

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        {activeView === "products" && (
          <div className="h-full overflow-hidden">
            <QuickProducts />
          </div>
        )}

        {activeView === "cart" && (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-hidden">
              <CartPanel />
            </div>
            <div className="shrink-0 border-t">
              <PaymentPanel
                onSaleComplete={handleSaleComplete}
              />
            </div>
          </div>
        )}

        {activeView === "sales" && (
          <div className="h-full overflow-hidden">
            <TodaySalesPanel />
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <nav
        className="shrink-0 border-t bg-card"
        aria-label="Navegación principal"
      >
        <div className="flex h-16 items-stretch">
          <PendingSalesBadge />
          {/* Products tab */}
          <button
            onClick={() => setActiveView("products")}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
              activeView === "products"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            type="button"
            aria-label="Productos"
          >
            <Package
              className={cn(
                "h-5 w-5 transition-transform",
                activeView === "products" && "scale-110",
              )}
            />
            <span>Productos</span>
            {activeView === "products" && (
              <span className="absolute bottom-0 block h-0.5 w-10 rounded-t-full bg-primary" />
            )}
          </button>

          {/* Cart tab */}
          <button
            onClick={() => setActiveView("cart")}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
              activeView === "cart"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            type="button"
            aria-label={`Carrito${totalItems > 0 ? `, ${totalItems} productos` : ""}`}
          >
            <div className="relative">
              <ShoppingCart
                className={cn(
                  "h-5 w-5 transition-transform",
                  activeView === "cart" && "scale-110",
                )}
              />
              {totalItems > 0 && (
                <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground tabular-nums">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </div>
            <span>Carrito</span>
            {activeView === "cart" && (
              <span className="absolute bottom-0 block h-0.5 w-10 rounded-t-full bg-primary" />
            )}
          </button>

          {/* Sales tab */}
          <button
            onClick={() => setActiveView("sales")}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
              activeView === "sales"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            type="button"
            aria-label="Ventas del día"
          >
            <Receipt
              className={cn(
                "h-5 w-5 transition-transform",
                activeView === "sales" && "scale-110",
              )}
            />
            <span>Ventas</span>
            {activeView === "sales" && (
              <span className="absolute bottom-0 block h-0.5 w-10 rounded-t-full bg-primary" />
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
