"use client";

import { motion } from "framer-motion";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";

interface CartFloatingBarProps {
  totalItems: number;
  totalPrice: number;
  onClick?: () => void;
}

const EASE = [0.32, 0.72, 0, 1] as const;

export function CartFloatingBar({
  totalItems,
  totalPrice,
  onClick,
}: CartFloatingBarProps) {
  if (totalItems === 0) return null;

  const productLabel = totalItems === 1 ? "producto" : "productos";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="fixed inset-x-0 z-50 px-4"
      style={{ bottom: "calc(var(--bottom-nav-height, 72px) + 12px)" }}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-[20px] bg-slate-900 py-3 pl-4 pr-2 text-white shadow-xl shadow-slate-900/20 transition-shadow hover:shadow-2xl active:scale-[0.99] dark:border dark:border-white/10 dark:bg-slate-950 [@media(max-height:700px)]:py-2"
        aria-label={`Ver carrito con ${totalItems} ${productLabel}, total ${formatCurrency(totalPrice)}`}
      >
        <div className="relative shrink-0">
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold leading-none text-slate-900 tabular-nums">
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        </div>

        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-300">
            {totalItems} {productLabel}
          </p>
          <p className="truncate text-lg font-bold leading-tight tabular-nums [@media(max-height:700px)]:text-base">
            {formatCurrency(totalPrice)}
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-white/15 px-3 py-2 text-sm font-semibold">
          Ver carrito
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>
    </motion.div>
  );
}
