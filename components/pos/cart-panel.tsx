"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingCart, Tag, Percent } from "lucide-react";
import { usePOS } from "@/lib/store-context";
import { formatCurrency } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useCartNavigation } from "@/hooks/use-cart-navigation";

export function CartPanel() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    subtotal,
    tax,
    total,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    taxConfig,
    getAvailableStock,
  } = usePOS();

  const [showDiscountInput, setShowDiscountInput] = useState(false);

  const {
    focusedIndex,
    containerRef: cartContainerRef,
    handleKeyDown: handleCartKeyDown,
  } = useCartNavigation({
    totalItems: cart.length,
    onIncrease: (index) => {
      const item = cart[index];
      if (item) updateQuantity(item.product.id, item.quantity + 1);
    },
    onDecrease: (index) => {
      const item = cart[index];
      if (item) updateQuantity(item.product.id, item.quantity - 1);
    },
    onRemove: (index) => {
      const item = cart[index];
      if (item) removeFromCart(item.product.id);
    },
  });

  if (cart.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
        <ShoppingCart className="h-14 w-14 opacity-30" />
        <div className="text-center">
          <p className="text-base font-medium">Carrito vacío</p>
          <p className="text-xs">Escanea un producto para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Cart header */}
      <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-3 py-1.5">
        <h2 className="text-sm font-semibold text-foreground">
          {cart.reduce((sum, item) => sum + item.quantity, 0)} items
        </h2>
      </div>

      {/* Cart items */}
      <div
        ref={cartContainerRef}
        data-keyboard-zone="cart"
        className="min-h-0 flex-1 overflow-y-auto"
        onKeyDown={handleCartKeyDown}
      >
        {cart.map((item, index) => {
          const isFocused = focusedIndex === index;

          return (
            <div
              key={item.product.id}
              data-cart-index={index}
              tabIndex={isFocused ? 0 : -1}
              className={cn(
                "flex items-center gap-2 border-b px-3 py-1.5 transition-colors duration-150",
                "hover:bg-muted/30",
                isFocused && "keyboard-cart-focused",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(item.product.price)} c/u
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    updateQuantity(item.product.id, item.quantity - 1)
                  }
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded border transition-colors duration-150",
                    "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                  type="button"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-7 text-center text-sm font-semibold tabular-nums">
                  {item.quantity}
                </span>
                <button
                  onClick={() =>
                    updateQuantity(item.product.id, item.quantity + 1)
                  }
                  disabled={getAvailableStock(item.product.id) <= 0}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded border transition-colors duration-150",
                    "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                  type="button"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="w-20 text-right">
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(item.product.price * item.quantity)}
                </p>
              </div>

              <button
                onClick={() => removeFromCart(item.product.id)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors duration-150",
                  "hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive",
                )}
                type="button"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Compact summary */}
      <div className="shrink-0 border-t bg-muted/30 px-3 py-1.5">
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Subtotal</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatCurrency(subtotal)}
            </span>
          </div>

          {discount > 0 && (
            <div className="flex items-center justify-between text-green-600 transition-all duration-150">
              <span className="text-xs">Descuento</span>
              <span className="text-xs tabular-nums">
                -{discountType === "percentage" ? `${discount}%` : formatCurrency(discount)}
              </span>
            </div>
          )}

          {taxConfig.enabled && tax > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{taxConfig.name} ({taxConfig.rate}%)</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatCurrency(tax)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-0.5">
            <span className="text-base font-bold">TOTAL</span>
            <span className="text-base font-bold tabular-nums text-primary transition-all duration-200">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowDiscountInput(!showDiscountInput)}
          className={cn(
            "mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground transition-colors duration-150",
            "hover:text-foreground",
          )}
          type="button"
        >
          <Tag className="h-2.5 w-2.5" />
          {showDiscountInput ? "Cerrar" : "Descuento"}
        </button>

        {showDiscountInput && (
          <div className="mt-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setDiscountType("fixed")}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] transition-colors duration-150",
                  discountType === "fixed"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                type="button"
              >
                $
              </button>
              <button
                onClick={() => setDiscountType("percentage")}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] transition-colors duration-150",
                  discountType === "percentage"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                type="button"
              >
                <Percent className="h-2.5 w-2.5" />
              </button>
            </div>
            <input
              type="number"
              value={discount || ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setDiscount(Math.max(0, val));
              }}
              placeholder="0"
              className="h-6 w-16 rounded border bg-background px-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-ring"
              min="0"
              max={discountType === "percentage" ? 100 : subtotal}
            />
            {discount > 0 && (
              <button
                onClick={() => setDiscount(0)}
                className="text-[10px] text-destructive hover:underline transition-colors duration-150"
                type="button"
              >
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
