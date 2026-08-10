'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Undo2,
  Search,
  ShoppingCart,
  Check,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react'
import { staggerContainer, fadeIn } from '../animation-variants'
import { useData } from '@/lib/store-context'
import { useAssistant } from '../context'
import { useDevoluciones } from '@/hooks/use-devoluciones'

type Step = 'search-sale' | 'select-items' | 'confirm' | 'done'

interface ReturnSelection {
  saleItemId: string
  cantidad: number
  disposicion: 'REINGRESAR_STOCK' | 'MERMAR'
}

export function MakeReturnView() {
  const { sales } = useData()
  const [step, setStep] = useState<Step>('search-sale')
  const [query, setQuery] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [selection, setSelection] = useState<Record<string, ReturnSelection>>({})
  const [motivo, setMotivo] = useState('')
  const [totalReturn, setTotalReturn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastAmount, setLastAmount] = useState<number | null>(null)

  const { create } = useDevoluciones({ autoLoad: false })

  const todaySales = useMemo(
    () =>
      sales.filter((s) => {
        const d = new Date(s.createdAt)
        const now = new Date()
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        )
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
    () => sales.find((s) => s.id === selectedSaleId) ?? null,
    [selectedSaleId, sales],
  )

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)

  const toggleItem = (saleItemId: string, maxQty: number) => {
    setSelection((prev) => {
      const current = prev[saleItemId]
      if (current) {
        const next = { ...prev }
        delete next[saleItemId]
        return next
      }
      return {
        ...prev,
        [saleItemId]: { saleItemId, cantidad: maxQty, disposicion: 'REINGRESAR_STOCK' },
      }
    })
  }

  const setQty = (saleItemId: string, qty: number, maxQty: number) => {
    setSelection((prev) => {
      const current = prev[saleItemId]
      if (!current) return prev
      return {
        ...prev,
        [saleItemId]: { ...current, cantidad: Math.max(0, Math.min(qty, maxQty)) },
      }
    })
  }

  const setDisposicion = (saleItemId: string, value: 'REINGRESAR_STOCK' | 'MERMAR') => {
    setSelection((prev) => {
      const current = prev[saleItemId]
      if (!current) return prev
      return { ...prev, [saleItemId]: { ...current, disposicion: value } }
    })
  }

  const selectedItems = selectedSale
    ? selectedSale.items
        .map((item) => ({ item, sel: selection[item.id] }))
        .filter((x) => x.sel && x.sel.cantidad > 0)
    : []

  const previewTotal = selectedItems.reduce(
    (acc, { item, sel }) => acc + item.unitPrice * (sel?.cantidad ?? 0),
    0,
  )

  const resetFlow = () => {
    setStep('search-sale')
    setSelectedSaleId(null)
    setQuery('')
    setSelection({})
    setMotivo('')
    setTotalReturn(false)
    setSubmitError(null)
    setLastAmount(null)
  }

  const handleConfirm = async () => {
    if (!selectedSale) return
    if (!totalReturn && selectedItems.length === 0) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const detalles = totalReturn
        ? []
        : selectedItems.map(({ sel }) => ({
            saleItemId: sel!.saleItemId,
            cantidad: sel!.cantidad,
            disposicion: sel!.disposicion,
          }))

      const devolucion = await create({
        ventaId: selectedSale.id,
        total: totalReturn,
        motivo: motivo.trim() || undefined,
        detalles,
      })

      setLastAmount(devolucion.montoTotalDevuelto)
      setStep('done')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al registrar la devolución')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'done') {
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
        <p className="text-lg font-semibold text-foreground">Devolución registrada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Se devolvieron {lastAmount !== null ? formatCurrency(lastAmount) : ''} al cliente.
        </p>
        <button
          onClick={resetFlow}
          className="mt-6 rounded-xl border bg-card px-4 py-2 text-sm font-medium text-card-foreground"
        >
          Hacer otra devolución
        </button>
      </motion.div>
    )
  }

  if (step === 'confirm' && selectedSale) {
    const hasItems = totalReturn || selectedItems.length > 0

    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-4 px-5 py-4"
      >
        <button
          onClick={() => setStep('select-items')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold text-card-foreground">
            Confirmar devolución — Venta #{selectedSale.id.slice(-6)}
          </p>

          <div className="mt-3 space-y-2">
            <label className="block text-xs text-muted-foreground">
              Motivo (opcional)
            </label>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: producto defectuoso"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
              maxLength={500}
            />
          </div>

          <div className="mt-3 space-y-1">
            {totalReturn ? (
              <div className="rounded-lg bg-primary/5 p-2 text-sm">
                Devolución total: {selectedSale.items.length} producto(s)
              </div>
            ) : (
              selectedItems.map(({ item, sel }) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-muted/30 p-2 text-sm"
                >
                  <span className="truncate">{item.productName}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {sel?.cantidad} × {formatCurrency(item.unitPrice)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
            <span className="font-medium">Total a devolver</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(totalReturn ? selectedSale.total : previewTotal)}
            </span>
          </div>

          {submitError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={!hasItems || submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" />
            {submitting ? 'Procesando…' : 'Confirmar devolución'}
          </motion.button>
        </div>
      </motion.div>
    )
  }

  if (step === 'select-items' && selectedSale) {
    const canContinue = totalReturn || selectedItems.length > 0

    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-4 px-5 py-4"
      >
        <button
          onClick={() => {
            setStep('search-sale')
            setSelectedSaleId(null)
            setSelection({})
            setTotalReturn(false)
          }}
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
              {new Date(selectedSale.createdAt).toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="space-y-1.5">
            {selectedSale.items.map((item) => {
              const sel = selection[item.id]
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    sel && sel.cantidad > 0
                      ? 'border-primary/30 bg-primary/5'
                      : 'bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">
                      {item.productName}
                    </span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(item.unitPrice)} c/u
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Cantidad en venta: {item.quantity}
                    </span>

                    <div className="flex items-center gap-2">
                      {sel && sel.cantidad > 0 && (
                        <>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                setQty(item.id, sel.cantidad - 1, item.quantity)
                              }
                              className="flex h-6 w-6 items-center justify-center rounded-md border text-xs"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-medium tabular-nums">
                              {sel.cantidad}
                            </span>
                            <button
                              onClick={() =>
                                setQty(item.id, sel.cantidad + 1, item.quantity)
                              }
                              className="flex h-6 w-6 items-center justify-center rounded-md border text-xs"
                            >
                              +
                            </button>
                          </div>

                          <select
                            value={sel.disposicion}
                            onChange={(e) =>
                              setDisposicion(
                                item.id,
                                e.target.value as 'REINGRESAR_STOCK' | 'MERMAR',
                              )
                            }
                            className="rounded-md border bg-background px-1.5 py-0.5 text-xs"
                          >
                            <option value="REINGRESAR_STOCK">Reingresar</option>
                            <option value="MERMAR">Mermar</option>
                          </select>
                        </>
                      )}

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleItem(item.id, item.quantity)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          sel && sel.cantidad > 0
                            ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400'
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                      >
                        {sel && sel.cantidad > 0 ? 'Quitar' : 'Devolver'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => setTotalReturn((v) => !v)}
            className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm ${
              totalReturn ? 'border-primary bg-primary/5 text-primary' : 'bg-card'
            }`}
          >
            <span>Devolución total de la venta</span>
            <span className="text-xs">{totalReturn ? 'Activado' : 'Desactivado'}</span>
          </button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setStep('confirm')}
            disabled={!canContinue}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" />
            Continuar
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
                onClick={() => {
                  setSelectedSaleId(sale.id)
                  setStep('select-items')
                }}
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
                    {sale.items.length} producto{sale.items.length !== 1 ? 's' : ''} —{' '}
                    {formatCurrency(sale.total)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(sale.createdAt).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </motion.button>
            ))
          )}
        </motion.div>
      )}
    </motion.div>
  )
}