'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Package, PackagePlus, ArrowRight } from 'lucide-react'
import { staggerContainer } from '../animation-variants'
import { useData } from '@/lib/store-context'
import { useAssistant } from '../context'

export function LowStockProductsView() {
  const { products } = useData()
  const { navigateToWithProduct } = useAssistant()

  const lowStock = useMemo(
    () => products.filter((p) => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock),
    [products],
  )

  if (lowStock.length === 0) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center px-5 py-16 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <Package className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-lg font-semibold text-foreground">Todo en orden</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No hay productos con stock bajo.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-3 px-5 py-4"
    >
      <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {lowStock.length} producto{lowStock.length !== 1 ? 's' : ''} con stock bajo
        </span>
      </div>

      <div className="space-y-1.5">
        {lowStock.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
            className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Package className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-card-foreground">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                Stock: <span className="font-semibold text-red-600 dark:text-red-400">{product.stock}</span>
                {' '}/ mín: {product.minStock} uds.
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigateToWithProduct('add-stock', product.id)}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <PackagePlus className="h-3.5 w-3.5" />
              Stock
            </motion.button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
