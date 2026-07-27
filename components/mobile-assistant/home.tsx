'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  PackagePlus,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Wallet,
  Undo2,
  History,
  Sparkles,
  MessageSquarePlus,
  X,
  Send,
  Package,
  ArrowRight,
} from 'lucide-react'
import { staggerContainer, cardVariants, scaleIn, fadeIn } from './animation-variants'
import { AssistantCard } from './card'
import { useAssistant } from './context'
import type { AssistantCardAction, AssistantView } from './types'

const HOME_ACTIONS: AssistantCardAction[] = [
  { id: 'make-return', label: 'Hacer devolución', description: 'Devolver productos', icon: Undo2 },
  { id: 'add-stock', label: 'Agregar stock', description: 'Sumar unidades', icon: PackagePlus },
  { id: 'change-price', label: 'Cambiar precio', description: 'Actualizar precio', icon: DollarSign },
  { id: 'today-sales', label: 'Ventas de hoy', description: 'Resumen del día', icon: BarChart3 },
  { id: 'low-stock-products', label: 'Poco stock', description: 'Productos críticos', icon: AlertTriangle },
  { id: 'cash-status', label: 'Estado de caja', description: 'Control diario', icon: Wallet },
]

function LowStockHighlightCard({
  action,
  index,
  onSelect,
  outOfStock,
  lowStock,
}: {
  action: AssistantCardAction
  index: number
  onSelect: () => void
  outOfStock: number
  lowStock: number
}) {
  const Icon = action.icon

  return (
    <motion.button
      variants={cardVariants}
      initial="initial"
      animate="highlighted"
      whileHover="hover"
      whileTap="tap"
      custom={index}
      onClick={onSelect}
      className="group relative col-span-2 flex flex-col gap-2 rounded-2xl border-2 border-amber-400 bg-amber-50/70 p-4 text-left shadow-sm transition-colors hover:border-amber-500 hover:bg-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-amber-500/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
    >
      <span className="absolute -right-2 -top-2 z-10 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold leading-tight text-white shadow-sm">
        Atención
      </span>
      <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-400/50 ring-inset pointer-events-none animate-pulse dark:ring-amber-500/40" />
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight text-amber-800 dark:text-amber-300">
            {action.label}
          </span>
          <span className="block text-xs leading-tight text-amber-600/70 dark:text-amber-400/70">
            {action.description}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 pl-[60px]">
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/15">
            <Package className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          </div>
          <span className="text-xs font-medium text-red-700 dark:text-red-400">
            {outOfStock} sin stock
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {lowStock} por agotarse
          </span>
        </div>
        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
          Revisar
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </motion.button>
  )
}

export function AssistantHome() {
  const { navigateTo, state, stockAlert, isUnseenAlert } = useAssistant()
  const { recentActions } = state
  const [showSuggestion, setShowSuggestion] = useState(false)

  const hasStockIssues = stockAlert !== null && (stockAlert.outOfStock > 0 || stockAlert.lowStock > 0)
  const showHighlight = hasStockIssues && isUnseenAlert

  const orderedActions = useMemo(() => {
    if (!hasStockIssues) return HOME_ACTIONS
    const lowStockAction = HOME_ACTIONS.find(a => a.id === 'low-stock-products')
    const rest = HOME_ACTIONS.filter(a => a.id !== 'low-stock-products')
    return lowStockAction ? [lowStockAction, ...rest] : HOME_ACTIONS
  }, [hasStockIssues])

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-col px-5 pb-6 pt-2"
    >
      <motion.h3
        variants={fadeIn}
        className="mb-5 text-lg font-semibold text-foreground"
      >
        ¿Qué necesitás hacer?
      </motion.h3>

      <div className="grid grid-cols-2 gap-3">
        {orderedActions.map((action, i) => (
          action.id === 'low-stock-products' && showHighlight ? (
            <LowStockHighlightCard
              key={action.id}
              action={action}
              index={i}
              onSelect={() => navigateTo(action.id as AssistantView)}
              outOfStock={stockAlert!.outOfStock}
              lowStock={stockAlert!.lowStock}
            />
          ) : (
            <AssistantCard
              key={action.id}
              action={action}
              index={i}
              onSelect={() => navigateTo(action.id as AssistantView)}
            />
          )
        ))}
      </div>

      {recentActions.length > 0 && (
        <motion.div variants={scaleIn} className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Usados recientemente
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentActions.map((action, i) => (
              <motion.button
                key={`${action.view}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.04 } }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigateTo(action.view)}
                className="flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-2 text-xs font-medium text-card-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                {action.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={scaleIn} className="mt-6">
        {showSuggestion ? (
          <SuggestionForm onClose={() => setShowSuggestion(false)} />
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowSuggestion(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed bg-card/50 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/30"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <span className="block text-sm font-medium text-card-foreground">
                Enviar sugerencia
              </span>
              <span className="block text-xs text-muted-foreground">
                Ayudanos a mejorar
              </span>
            </div>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  )
}

function SuggestionForm({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = () => {
    if (!text.trim()) return
    console.log('Sugerencia:', text)
    setSent(true)
    setTimeout(onClose, 2000)
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border bg-card p-4 text-center"
      >
        <p className="text-sm font-medium text-foreground">¡Gracias por tu sugerencia!</p>
        <p className="text-xs text-muted-foreground mt-1">La vamos a tener en cuenta.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-card-foreground">💬 Enviar sugerencia</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Contanos qué mejorarías..."
        className="mb-3 w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        rows={3}
      />
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        Enviar sugerencia
      </motion.button>
    </motion.div>
  )
}
