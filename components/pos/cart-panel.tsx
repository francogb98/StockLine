"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Minus, Plus, Trash2, ShoppingCart, Tag, Percent, Clock, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePOS } from "@/lib/store-context";
import { formatCurrency } from "@/lib/mock-data";
import { cn, formatQuantityForCart } from "@/lib/utils";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { useCartNavigation } from "@/hooks/use-cart-navigation";
import { toast } from "sonner";

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
    suspendSale,
  } = usePOS();

  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const prevCartLength = useRef(cart.length);
  const quantityInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (cart.length > prevCartLength.current) {
      const lastId = cart[cart.length - 1]?.product.id;
      if (lastId) {
        setHighlightedId(lastId);
        const timer = setTimeout(() => setHighlightedId(null), 800);
        prevCartLength.current = cart.length;
        return () => clearTimeout(timer);
      }
    }
    prevCartLength.current = cart.length;
  }, [cart]);

  const {
    focusedIndex,
    containerRef: cartContainerRef,
    handleKeyDown: handleCartKeyDown,
  } = useCartNavigation({
    totalItems: cart.length,
    onIncrease: (index) => {
      const item = cart[index];
      if (item) updateQuantity(item.product.id, item.quantity + 1, item.presentation?.id);
    },
    onDecrease: (index) => {
      const item = cart[index];
      if (item) updateQuantity(item.product.id, item.quantity - 1, item.presentation?.id);
    },
    onRemove: (index) => {
      const item = cart[index];
      if (item) removeFromCart(item.product.id, item.presentation?.id);
    },
  });

  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSuspend = useCallback(async () => {
    if (cart.length === 0 || isSuspending) return;
    setIsSuspending(true);
    try {
      const ok = await suspendSale();
      if (ok) {
        toast.success("Venta enviada a espera", {
          description: `${totalQty} ${totalQty === 1 ? "producto" : "productos"} guardados`,
        });
      } else {
        toast.error("No se pudo pausar la venta");
      }
    } catch (err) {
      console.error("Error suspending sale", err);
      toast.error("No se pudo pausar la venta");
    } finally {
      setIsSuspending(false);
    }
  }, [cart.length, isSuspending, suspendSale, totalQty]);

  const handleCardClick = useCallback((lineKey: string, e: React.MouseEvent) => {
    // Don't select if clicking on buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    
    const input = quantityInputRefs.current.get(lineKey);
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const handleQuantityChange = useCallback((productId: string, presentationId: string | undefined, value: string, step: number) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < step) return;
    
    const availableStock = getAvailableStock(productId);
    const maxQuantity = availableStock + (cart.find(i => i.product.id === productId)?.quantity ?? 0);
    
    const clampedValue = Math.min(numValue, maxQuantity);
    const roundedValue = Number(clampedValue.toFixed(3));
    
    updateQuantity(productId, roundedValue, presentationId);
  }, [cart, getAvailableStock, updateQuantity]);

  if (cart.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-transparent p-6 text-muted-foreground">
        <ShoppingCart className="h-14 w-14 opacity-30" />
        <div className="text-center">
          <p className="text-base font-medium">Carrito vacío</p>
          <p className="text-xs">Escanea un producto para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Cart items — scrollable */}
      <div
        ref={cartContainerRef}
        data-keyboard-zone="cart"
        className="min-h-0 flex-1 overflow-y-auto"
        onKeyDown={handleCartKeyDown}
      >
        <AnimatePresence initial={false}>
          {cart.map((item, index) => {
            const isFocused = focusedIndex === index;
            const isNew = highlightedId === item.product.id;
            const presentation = item.presentation;
            const isContinuous =
              item.product.quantityType === "CONTINUA" &&
              item.product.unit !== "unit";
            const step = isContinuous ? 0.001 : 1;
            const presentationDisplay = presentation
              ? presentation.name
              : isContinuous
                ? formatQuantityForCart(
                    item.quantity,
                    item.product.unit,
                    item.product.quantityType,
                  )
                : null;
            const lineKey = `${item.product.id}::${presentation?.id ?? ""}`;
            return (
              <motion.div
                key={lineKey}
                data-cart-index={index}
                tabIndex={isFocused ? 0 : -1}
                onClick={(e) => handleCardClick(lineKey, e)}
                initial={{ opacity: 0, x: 20, height: 0 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  height: "auto",
                  backgroundColor: isNew
                    ? "hsl(var(--primary) / 0.08)"
                    : "transparent",
                }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "flex items-center gap-2 border-b px-3 py-2 cursor-pointer",
                  "hover:bg-muted/30",
                  isFocused && "keyboard-cart-focused",
                )}
              >
                <ProductThumbnail
                  imageUrl={item.product.imageUrl}
                  name={item.product.name}
                  className="h-9 w-9 shrink-0 rounded-md border"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.product.name}
                  </p>
                  {presentationDisplay ? (
                    <p className="text-xs font-medium text-primary">
                      {presentationDisplay}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.product.price)}{" "}
                    {isContinuous
                      ? `por ${item.product.unit}`
                      : "c/u"}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = Math.max(
                        step,
                        Number((item.quantity - step).toFixed(3)),
                      );
                      updateQuantity(
                        item.product.id,
                        next,
                        item.presentation?.id,
                      );
                    }}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md border transition-colors duration-150",
                      "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
                    )}
                    type="button"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    ref={(el) => {
                      if (el) {
                        quantityInputRefs.current.set(lineKey, el);
                      } else {
                        quantityInputRefs.current.delete(lineKey);
                      }
                    }}
                    type="number"
                    min={step}
                    step={step}
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.product.id, item.presentation?.id, e.target.value, step)}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => setEditingQuantityId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "w-12 h-7 text-center text-sm font-semibold tabular-nums rounded-md border bg-background",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                      "[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    )}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(
                        item.product.id,
                        Number((item.quantity + step).toFixed(3)),
                        item.presentation?.id,
                      );
                    }}
                    disabled={getAvailableStock(item.product.id) <= 0}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md border transition-colors duration-150",
                      "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                    type="button"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <motion.div
                  className="w-20 text-right"
                  animate={{ scale: isNew ? [1, 1.05, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(item.product.price * item.quantity * (item.presentation?.quantity ?? 1))}
                  </p>
                </motion.div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(item.product.id, item.presentation?.id);
                  }}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150",
                    "hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive",
                  )}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Summary + Discount — fondo unificado sin capa oscura */}
      <div className="shrink-0 border-t bg-background px-3 py-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Subtotal ({totalQty} items)
            </span>
            <span className="text-sm tabular-nums text-foreground">
              {formatCurrency(subtotal)}
            </span>
          </div>

          {discount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between text-green-600"
            >
              <span className="text-xs">Descuento</span>
              <span className="text-xs tabular-nums">
                -
                {discountType === "percentage"
                  ? `${discount}%`
                  : formatCurrency(discount)}
              </span>
            </motion.div>
          )}

          {taxConfig.enabled && tax > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {taxConfig.name} ({taxConfig.rate}%)
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatCurrency(tax)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-1.5">
            <span className="text-base font-bold">TOTAL</span>
            <motion.span
              key={total}
              initial={{ scale: 1.08, color: "hsl(var(--primary))" }}
              animate={{ scale: 1, color: "hsl(var(--primary))" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="text-base font-bold tabular-nums text-primary"
            >
              {formatCurrency(total)}
            </motion.span>
          </div>
        </div>

        <button
          onClick={() => setShowDiscountInput(!showDiscountInput)}
          className={cn(
            "mt-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors duration-150",
            "hover:text-foreground",
          )}
          type="button"
        >
          <Tag className="h-3 w-3" />
          {showDiscountInput ? "Cerrar descuento" : "Agregar descuento"}
        </button>

        {showDiscountInput && (
          <div className="mt-2 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setDiscountType("fixed")}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150",
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
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150",
                  discountType === "percentage"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                type="button"
              >
                <Percent className="h-3 w-3" />
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
              className="h-7 w-20 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              min="0"
              max={discountType === "percentage" ? 100 : subtotal}
            />
            {discount > 0 && (
              <button
                onClick={() => setDiscount(0)}
                className="text-xs text-destructive hover:underline transition-colors duration-150"
                type="button"
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        <button
          onClick={handleSuspend}
          disabled={cart.length === 0 || isSuspending}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs font-semibold transition-colors",
            "text-amber-700 border-amber-300/70 bg-amber-50/60 hover:bg-amber-100/80 hover:border-amber-400",
            "dark:text-amber-300 dark:border-amber-700/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:hover:border-amber-600",
            "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-amber-50/60",
          )}
          type="button"
          title="Pausar venta y guardarla en espera"
        >
          {isSuspending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Clock className="h-3.5 w-3.5" />
          )}
          {isSuspending ? "Pausando..." : "Pausar venta"}
        </button>
      </div>
    </div>
  );
}
