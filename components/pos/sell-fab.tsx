"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface SellFabProps {
  onClick?: () => void;
}

const EASE = [0.32, 0.72, 0, 1] as const;

export function SellFab({ onClick }: SellFabProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="fixed right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-lg shadow-primary/30 transition-shadow hover:shadow-xl active:scale-95"
      style={{ bottom: "calc(var(--bottom-nav-height, 72px) + 12px)" }}
      aria-label="Vender"
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
      <span className="text-sm font-semibold">Vender</span>
    </motion.button>
  );
}
