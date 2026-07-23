'use client'

import { motion } from 'framer-motion'
import { ShoppingCart, Search, ArrowRight } from 'lucide-react'
import { staggerContainer } from '../animation-variants'

const recentProducts = [
  { name: 'Coca Cola 2L', price: '$ 1,200', stock: 45 },
  { name: 'Agua mineral 500ml', price: '$ 500', stock: 30 },
  { name: 'Papas fritas 120g', price: '$ 800', stock: 22 },
  { name: 'Hamburguesa completa', price: '$ 2,500', stock: 15 },
]

export function CreateSaleView() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4 px-5 py-4"
    >
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-card-foreground">Crear una venta</p>
          <p className="text-xs text-muted-foreground">Seleccioná productos para vender</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Buscar productos...</span>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Productos recientes</p>
        <div className="space-y-1">
          {recentProducts.map((product, i) => (
            <motion.button
              key={product.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05, duration: 0.2 } }}
              whileTap={{ scale: 0.99 }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-muted"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-foreground">{product.price}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
