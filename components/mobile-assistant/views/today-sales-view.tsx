'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, DollarSign, TrendingUp, Package, Clock, ShoppingCart, ArrowRight } from 'lucide-react'
import { staggerContainer } from '../animation-variants'
import { useData } from '@/lib/store-context'
import { useAssistant } from '../context'
import { useAuth } from '@/lib/store-context'

export function TodaySalesView() {
  const { sales, products } = useData()
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
  const count = todaySales.length
  const items = todaySales.reduce((sum, s) => sum + s.items.length, 0)
  const avg = count > 0 ? total / count : 0

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number }> = {}
    for (const sale of todaySales) {
      for (const item of sale.items) {
        if (!map[item.productId]) {
          map[item.productId] = { name: item.productName, qty: 0 }
        }
        map[item.productId].qty += item.quantity
      }
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b.qty - a.qty)
      .slice(0, 3)
  }, [todaySales])

  const lastSaleTime = useMemo(() => {
    if (todaySales.length === 0) return null
    const sorted = [...todaySales].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    return new Date(sorted[0].createdAt)
  }, [todaySales])

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
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">Ventas de hoy</p>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="mb-1 text-3xl font-bold tabular-nums text-foreground">
          {formatCurrency(total)}
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          {count === 0
            ? 'Sin ventas registradas hoy'
            : `${items} productos en ${count} transacciones`
          }
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShoppingCart className="h-3.5 w-3.5" />
              Transacciones
            </span>
            <span className="text-sm font-bold tabular-nums text-foreground">{count}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Ticket promedio
            </span>
            <span className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(avg)}</span>
          </div>
          {lastSaleTime && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Última venta
              </span>
              <span className="text-sm tabular-nums text-foreground">
                {lastSaleTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {topProducts.length > 0 && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Más vendidos hoy
            </span>
          </div>
          <div className="space-y-2">
            {topProducts.map(([id, p], i) => (
              <div key={id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground">{p.name}</span>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">{p.qty} uds.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => close()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground"
      >
        <ShoppingCart className="h-4 w-4" />
        Crear nueva venta
      </motion.button>
    </motion.div>
  )
}
