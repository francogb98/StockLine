'use client'

import { motion } from 'framer-motion'
import { FolderTree, Plus, Folder, Coffee, Beer, Utensils, Candy, ShoppingBag } from 'lucide-react'
import { staggerContainer } from '../animation-variants'

const categories = [
  { name: 'Bebidas', count: 24, icon: Coffee },
  { name: 'Cervezas', count: 12, icon: Beer },
  { name: 'Comidas', count: 18, icon: Utensils },
  { name: 'Snacks', count: 30, icon: Candy },
  { name: 'Limpieza', count: 8, icon: ShoppingBag },
]

export function CategoriesView() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4 px-5 py-4"
    >
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
          <FolderTree className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-card-foreground">Categorías</p>
          <p className="text-xs text-muted-foreground">{categories.length} categorías</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>

      <div className="space-y-1">
        {categories.map((cat, i) => {
          const Icon = cat.icon
          return (
            <motion.button
              key={cat.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 transition-colors hover:bg-muted"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.count} productos</p>
              </div>
              <span className="text-xs text-muted-foreground">
                <Folder className="h-3.5 w-3.5" />
              </span>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
