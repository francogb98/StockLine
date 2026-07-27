'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Package, Tag, Barcode, Layers, Archive, DollarSign, PackagePlus, TrendingUp, History, X, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import { staggerContainer, fadeIn } from '../animation-variants'
import { useData } from '@/lib/store-context'
import { useAssistant } from '../context'

export function SearchProductView() {
  const { products, sales } = useData()
  const { navigateTo } = useAssistant()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(
    () =>
      query.length >= 2
        ? products.filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              p.barcode?.toLowerCase().includes(query.toLowerCase()),
          )
        : [],
    [query, products],
  )

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId),
    [selectedId, products],
  )

  const lastSale = useMemo(() => {
    if (!selected) return null
    const productSales = sales
      .filter((s) => s.items.some((i) => i.productId === selected.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return productSales[0] ?? null
  }, [selected, sales])

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)

  if (selected) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-4 px-5 py-4"
      >
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a buscar
        </button>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
              <Package className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground truncate">{selected.name}</h3>
              {selected.barcode && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Barcode className="h-3 w-3" />
                  {selected.barcode}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                Precio
              </span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {formatCurrency(selected.price)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Archive className="h-3.5 w-3.5" />
                Stock
              </span>
              <span className={`text-sm font-medium tabular-nums ${selected.stock <= selected.minStock ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {selected.stock} uds.
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Layers className="h-3.5 w-3.5" />
                Stock mínimo
              </span>
              <span className="text-sm tabular-nums text-foreground">{selected.minStock} uds.</span>
            </div>
            {selected.categoryId && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  Categoría
                </span>
                <span className="text-sm text-foreground">{selected.categoryId}</span>
              </div>
            )}
            {lastSale && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  Última venta
                </span>
                <span className="text-sm tabular-nums text-foreground">
                  {new Date(lastSale.createdAt).toLocaleDateString('es-AR')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigateTo('add-stock')}
            className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PackagePlus className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-card-foreground">Agregar stock</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigateTo('change-price')}
            className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-card-foreground">Cambiar precio</span>
          </motion.button>
        </div>
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
          onChange={(e) => { setQuery(e.target.value); setSelectedId(null) }}
          placeholder="Buscá por nombre o código..."
          className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query.length >= 2 && (
        <motion.div variants={fadeIn} className="space-y-1">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron productos para "{query}"
            </p>
          ) : (
            filtered.map((product, i) => (
              <motion.button
                key={product.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedId(product.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Stock: {product.stock} — {formatCurrency(product.price)}
                  </p>
                </div>
              </motion.button>
            ))
          )}
        </motion.div>
      )}

      {query.length === 1 && (
        <p className="text-center text-xs text-muted-foreground">Escribí al menos 2 caracteres</p>
      )}
    </motion.div>
  )
}
