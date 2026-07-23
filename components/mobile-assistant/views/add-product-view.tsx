'use client'

import { motion } from 'framer-motion'
import { PackagePlus, Image, Tag, Barcode, Package, DollarSign, Hash } from 'lucide-react'
import { staggerContainer } from '../animation-variants'

const fields = [
  { icon: Image, label: 'Foto', hint: 'Agregar imagen del producto' },
  { icon: Tag, label: 'Nombre', hint: 'Ej: Coca Cola 2L' },
  { icon: Barcode, label: 'Código de barras', hint: '123456789012' },
  { icon: Package, label: 'Categoría', hint: 'Seleccionar categoría' },
  { icon: DollarSign, label: 'Precio de venta', hint: '$ 0.00' },
  { icon: Hash, label: 'Stock inicial', hint: '0' },
]

export function AddProductView() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4 px-5 py-4"
    >
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PackagePlus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-card-foreground">Agregar producto</p>
          <p className="text-xs text-muted-foreground">Completá los datos del nuevo producto</p>
        </div>
      </div>

      <div className="space-y-2">
        {fields.map((field, i) => {
          const Icon = field.icon
          return (
            <motion.div
              key={field.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
              className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                <p className="text-sm text-foreground">{field.hint}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.3 } }}
        whileTap={{ scale: 0.98 }}
        className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
      >
        Guardar producto
      </motion.button>
    </motion.div>
  )
}
