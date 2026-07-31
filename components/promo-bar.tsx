"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";

export function PromoBar({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -44, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -44, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed inset-x-0 top-0 z-[60] grid h-11 grid-cols-[1fr_auto_1fr] items-center border-b border-emerald-200/60 bg-emerald-50 px-4 text-sm text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950 dark:text-emerald-200"
        >
          {/* Espacio izquierdo */}
          <div />

          {/* Contenido centrado */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="shrink-0">🎁</span>

            <span className="truncate">
              Oferta de lanzamiento —{" "}
              <span className="hidden sm:inline">
                15 días gratis + 50% OFF durante los primeros 3 meses.
              </span>
              <span className="sm:hidden">15 días gratis + 50% OFF.</span>
            </span>

            <Link
              href="/register"
              onClick={onDismiss}
              className="shrink-0 font-semibold underline-offset-2 transition-all hover:underline"
            >
              Aprovechar oferta →
            </Link>
          </div>

          {/* Botón cerrar */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded p-1 transition-colors hover:bg-emerald-200/60 dark:hover:bg-emerald-800/60"
              aria-label="Cerrar promoción"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
