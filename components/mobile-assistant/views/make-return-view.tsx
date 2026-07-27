'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Undo2, Search, Package, ShoppingCart, Check, CreditCard, DollarSign, ArrowLeft, X } from 'lucide-react'
import { staggerContainer, fadeIn } from '../animation-variants'
import { useData } from '@/lib/store-context'
import { useAssistant } from '../context'

type Step = 'search-sale' | 'select-items' | 'confirm'

export function MakeReturnView() {
  const { sales, products, updateProduct } = useData()
  const [step, setStep] = useState<Step>('search-sale')
  const [query, setQuery] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({})
  const [done, setDone] = useState(false)

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

  const filteredSales = useMemo(
    () =>
      query.length >= 2
        ? todaySales.filter(
            (s) =>
              s.id.toLowerCase().includes(query.toLowerCase()) ||
              s.items.some((i) =>
                i.productName.toLowerCase().includes(query.toLowerCase()),
              ),
          )
        : [],
    [query, todaySales],
  )

  const selectedSale = useMemo(
    () => sales.find((s) => s.id === selectedSaleId),
    [selectedSaleId, sales],
  )

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)

  const toggleItem = (itemId: string, maxQty: number) => {
    setReturnQtys((prev) => {
      const current = prev[itemId] || 0
      if (current > 0) return { ...prev, [itemId]: 0 }
      return { ...prev, [itemId]: maxQty }
    })
  }

  const setQty = (itemId: string, qty: number, maxQty: number) => {
    setReturnQtys((prev) => ({
      ...prev,
      [itemId]: Math.max(0, Math.min(qty, maxQty)),
    }))
  }

  const handleConfirm = () => {
    if (!selectedSale) return
    for (const item of selectedSale.items) {
      const qty = returnQtys[item.id] || 0
      if (qty > 0) {
        const product = products.find((p) => p.id === item.productId)
        if (product) {
          updateProduct(product.id, { stock: product.stock + qty })
        }
      }
    }
    setDone(true)
    setTimeout(() => {
      setDone(false)
      setSelectedSaleId(null)
      setQuery('')
      setReturnQtys({})
      setStep('search-sale')
    }, 2000)
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
        <p className="text-lg font-semibold text-foreground">Devolución completada</p>
        <p className="mt-1 text-sm text-muted-foreground">El stock se actualizó automáticamente.</p>
      </motion.div>
    )
  }

  if (step === 'select-items' && selectedSale) {
    const hasSelectedItems = Object.values(returnQtys).some((q) => q > 0)

    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-4 px-5 py-4"
      >
        <button
          onClick={() => { setStep('search-sale'); setSelectedSaleId(null); setReturnQtys({}) }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a buscar
        </button>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-card-foreground">
              Venta #{selectedSale.id.slice(-6)}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date(selectedSale.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="space-y-1.5">
            {selectedSale.items.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 transition-colors ${
                  (returnQtys[item.id] || 0) > 0
                    ? 'border-primary/30 bg-primary/5'
                    : 'bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{item.productName}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(item.unitPrice)} c/u
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Cantidad en venta: {item.quantity}
                  </span>
                  <div className="flex items-center gap-2">
                    {(returnQtys[item.id] || 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQty(item.id, (returnQtys[item.id] || 0) - 1, item.quantity)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border text-xs"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm font-medium tabular-nums">
                          {returnQtys[item.id] || 0}
                        </span>
                        <button
                          onClick={() => setQty(item.id, (returnQtys[item.id] || 0) + 1, item.quantity)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border text-xs"
                        >
                          +
                        </button>
                      </div>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleItem(item.id, item.quantity)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        (returnQtys[item.id] || 0) > 0
                          ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {(returnQtys[item.id] || 0) > 0 ? 'Quitar' : 'Devolver'}
                    </motion.button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={!hasSelectedItems}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" />
            Confirmar devolución
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscá por producto o ID de venta..."
          className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
          autoFocus
        />
      </div>

      {query.length >= 2 && (
        <motion.div variants={fadeIn} className="space-y-1">
          {filteredSales.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron ventas
            </p>
          ) : (
            filteredSales.map((sale, i) => (
              <motion.button
                key={sale.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
                whileTap={{ scale: 0.99 }}
                onClick={() => { setSelectedSaleId(sale.id); setStep('select-items') }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    Venta #{sale.id.slice(-6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sale.items.length} producto{sale.items.length !== 1 ? 's' : ''} — {formatCurrency(sale.total)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(sale.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.button>
            ))
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
