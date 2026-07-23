'use client'

import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Package, Receipt, DollarSign } from 'lucide-react'
import { staggerContainer } from '../animation-variants'

const stats = [
  { label: 'Ventas hoy', value: '$ 7,450', icon: DollarSign, change: '+12%', positive: true },
  { label: 'Productos vend.', value: '48', icon: Package, change: '+5%', positive: true },
  { label: 'Ticket promedio', value: '$ 155', icon: Receipt, change: '-3%', positive: false },
  { label: 'Crecimiento', value: '+12.5%', icon: TrendingUp, change: 'vs. ayer', positive: true },
]

export function ReportsView() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4 px-5 py-4"
    >
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-card-foreground">Reportes</p>
          <p className="text-xs text-muted-foreground">Resumen del {new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.06, duration: 0.3, ease: [0.32, 0.72, 0, 1] } }}
              className="rounded-2xl border bg-card p-4 shadow-sm"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-lg font-bold tabular-nums text-foreground">{stat.value}</p>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className={`text-[11px] font-medium ${stat.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {stat.change}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
