'use client'

import { motion } from 'framer-motion'
import { Wallet, DollarSign, Clock, Lock, Unlock, ArrowRight } from 'lucide-react'
import { staggerContainer, cardVariants } from '../animation-variants'

export function CashView() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4 px-5 py-4"
    >
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">Estado de caja</p>
            <p className="text-xs text-muted-foreground">Resumen del día</p>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5">
          <Unlock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Caja abierta
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Saldo actual</span>
            <span className="text-sm font-bold tabular-nums text-foreground">$ 12,450.00</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Apertura</span>
            <span className="text-sm tabular-nums text-foreground">$ 5,000.00</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Ventas hoy</span>
            <span className="text-sm font-medium tabular-nums text-foreground">$ 7,450.00</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.button
          variants={cardVariants}
          custom={0}
          whileTap={{ scale: 0.97 }}
          className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold text-card-foreground">Ingresar</span>
        </motion.button>
        <motion.button
          variants={cardVariants}
          custom={1}
          whileTap={{ scale: 0.97 }}
          className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <Lock className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold text-card-foreground">Cerrar caja</span>
        </motion.button>
      </div>
    </motion.div>
  )
}
