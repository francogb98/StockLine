'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Wallet, DollarSign, Unlock, Lock, ShoppingCart, ArrowRight } from 'lucide-react'
import { staggerContainer } from '../animation-variants'
import { useData, useAuth } from '@/lib/store-context'
import { useAssistant } from '../context'

export function CashStatusView() {
  const { sales } = useData()
  const { navigateTo, close } = useAssistant()

  const todaySales = useMemo(
    () => sales.filter((s) => {
      const d = new Date(s.createdAt)
      const now = new Date()
      return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    }),
    [sales],
  )

  const total = todaySales.reduce((sum, s) => sum + s.total, 0)
  const cashTotal = todaySales.filter((s) => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0)
  const cardTotal = todaySales.filter((s) => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0)
  const transferTotal = todaySales.filter((s) => s.paymentMethod === 'transfer').reduce((sum, s) => sum + s.total, 0)

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)

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

        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5">
          <Unlock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Caja abierta
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Ventas registradas</span>
            <span className="text-sm font-bold tabular-nums text-foreground">{todaySales.length}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              Efectivo
            </span>
            <span className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(cashTotal)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Wallet className="h-3.5 w-3.5 text-blue-500" />
              Tarjeta
            </span>
            <span className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(cardTotal)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShoppingCart className="h-3.5 w-3.5 text-purple-500" />
              Transferencia
            </span>
            <span className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(transferTotal)}</span>
          </div>
        </div>

        <div className="mt-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-card-foreground">Total general</span>
            <span className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => close()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        Ir a Caja
      </motion.button>
    </motion.div>
  )
}
