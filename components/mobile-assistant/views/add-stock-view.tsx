'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { PackagePlus, Search, Package, Check, Plus, Minus, X } from 'lucide-react'
import { staggerContainer, fadeIn } from '../animation-variants'
import { useData } from '@/lib/store-context'
import { useAssistant } from '../context'

export function AddStockView() {
  const { products, updateProduct } = useData()
  const { state, clearPendingProduct } = useAssistant()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(state.pendingProductId)
  const [quantity, setQuantity] = useState(1)
  const [done, setDone] = useState(false)
  const initialPending = useRef(state.pendingProductId)

  useEffect(() => {
    if (initialPending.current) {
      clearPendingProduct()
    }
  }, [clearPendingProduct])

  const filtered = useMemo(
    () =>
      query.length >= 2
        ? products.filter((p) =>
            p.name.toLowerCase().includes(query.toLowerCase()),
          )
        : [],
    [query, products],
  )

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId),
    [selectedId, products],
  )

  const handleSave = () => {
    if (!selected || quantity <= 0) return
    updateProduct(selected.id, { stock: selected.stock + quantity })
    setDone(true)
    setTimeout(() => { setDone(false); setSelectedId(null); setQuantity(1); setQuery('') }, 1500)
  }

  if (done) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center px-5 py-20"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-lg font-semibold text-foreground">Stock actualizado</p>
        <p className="text-sm text-muted-foreground mt-1">
          {selected?.name} +{quantity} uds.
        </p>
      </motion.div>
    )
  }

  if (selected) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-5 px-5 py-4"
      >
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground truncate">{selected.name}</h3>
              <p className="text-xs text-muted-foreground">Stock actual: {selected.stock} uds.</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              Cantidad a agregar
            </label>
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-foreground transition-colors hover:bg-muted"
              >
                <Minus className="h-4 w-4" />
              </motion.button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 flex-1 rounded-xl border bg-background text-center text-lg font-bold tabular-nums text-foreground outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
                min={1}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-foreground transition-colors hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
              </motion.button>
            </div>
          </div>

          <p className="mb-4 text-center text-xs text-muted-foreground">
            Stock después de la carga: <span className="font-semibold text-foreground">{selected.stock + quantity} uds.</span>
          </p>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground"
          >
            <PackagePlus className="h-4 w-4" />
            Agregar stock
          </motion.button>
        </div>

        <button
          onClick={() => { setSelectedId(null); setQuery('') }}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Elegir otro producto
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4 px-5 py-4"
    >
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscá un producto..."
          className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
          autoFocus
        />
      </div>

      {query.length >= 2 && (
        <motion.div variants={fadeIn} className="space-y-1">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron productos
            </p>
          ) : (
            filtered.map((product, i) => (
              <motion.button
                key={product.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedId(product.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">Stock: {product.stock} uds.</p>
                </div>
              </motion.button>
            ))
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
