"use client";

import { motion } from "framer-motion";
import { ShoppingCart, ChevronRight, MoreVertical, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CartFloatingBarProps {
  totalItems: number;
  totalPrice: number;
  onClick?: () => void;
  onClear?: () => void;
}

const EASE = [0.32, 0.72, 0, 1] as const;

export function CartFloatingBar({
  totalItems,
  totalPrice,
  onClick,
  onClear,
}: CartFloatingBarProps) {
  if (totalItems === 0) return null;

  const productLabel = totalItems === 1 ? "producto" : "productos";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="fixed inset-x-0 z-40 px-4"
      style={{ bottom: "calc(var(--bottom-nav-height, 72px) + 12px)" }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white py-3 pl-4 pr-2 text-left shadow-xl shadow-slate-900/10 transition-colors hover:shadow-2xl active:scale-[0.99] active:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:active:bg-zinc-800 [@media(max-height:700px)]:py-2"
        aria-label={`Ver carrito con ${totalItems} ${productLabel}, total ${formatCurrency(totalPrice)}`}
      >
        <div className="relative shrink-0">
          <ShoppingCart className="h-6 w-6 text-slate-900 dark:text-white" />
          <motion.span
            key={totalItems}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground tabular-nums"
          >
            {totalItems > 99 ? "99+" : totalItems}
          </motion.span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {totalItems} {productLabel}
          </p>
          <p className="truncate text-lg font-bold leading-tight tabular-nums text-slate-900 dark:text-white [@media(max-height:700px)]:text-base">
            {formatCurrency(totalPrice)}
          </p>
        </div>

        <span className="text-primary flex shrink-0 items-center gap-1 px-2 text-sm font-semibold">
          Ver carrito
          <ChevronRight className="h-4 w-4" />
        </span>

        {onClear && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                aria-label="Más opciones del carrito"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-ring dark:text-slate-400 dark:hover:bg-zinc-800"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="min-w-[180px]">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Vaciar carrito
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  );
}
