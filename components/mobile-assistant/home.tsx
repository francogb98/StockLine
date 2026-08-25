'use client'

import { useState } from 'react'
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
  ArrowRight,
  Package,
  Search,
} from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useAssistant } from './context'
import type { AssistantCardAction, AssistantView } from './types'
import { scaleIn, staggerContainer, fadeIn } from './animation-variants'

const HOME_ACTIONS: AssistantCardAction[] = [
  { id: 'devoluciones-home', label: 'Devoluciones', description: 'Devolver o ver cómo hacerlo', icon: Undo2 },
  { id: 'add-product', label: 'Agregar producto', description: 'Crear nuevo', icon: PackagePlus },
  { id: 'search-product', label: 'Buscar producto', description: 'Ver detalle o editar', icon: Search },
  { id: 'add-stock', label: 'Agregar stock', description: 'Sumar unidades', icon: Package },
  { id: 'change-price', label: 'Cambiar precio', description: 'Actualizar precio', icon: DollarSign },
  { id: 'today-sales', label: 'Ventas de hoy', description: 'Resumen del día', icon: BarChart3 },
  { id: 'low-stock-products', label: 'Poco stock', description: 'Productos críticos', icon: AlertTriangle },
  { id: 'cash-status', label: 'Estado de caja', description: 'Control diario', icon: Wallet },
]

interface QuickActionsViewProps {
  onSelect: (view: AssistantView) => void
}

function QuickActionsView({ onSelect }: QuickActionsViewProps) {
  return (
    <CommandGroup heading="Acciones rápidas">
      {HOME_ACTIONS.map((action) => {
        const Icon = action.icon
        return (
          <CommandItem
            key={action.id}
            value={`${action.label} ${action.description}`}
            onSelect={() => onSelect(action.id)}
            className="h-9 px-2"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{action.label}</span>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              {action.description}
              <ArrowRight className="h-3 w-3 opacity-50" />
            </span>
          </CommandItem>
        )
      })}
    </CommandGroup>
  )
}

interface LowStockAlertRowProps {
  outOfStock: number
  lowStock: number
  onSelect: () => void
}

function LowStockAlertRow({ outOfStock, lowStock, onSelect }: LowStockAlertRowProps) {
  return (
    <CommandItem
      value="alerta poco stock revisar"
      onSelect={onSelect}
      className="h-9 border border-amber-300 bg-amber-50/70 px-2 data-[selected=true]:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/30 dark:data-[selected=true]:bg-amber-950/50"
    >
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
        Poco stock
      </span>
      <span className="ml-auto flex items-center gap-2 text-xs">
        <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-medium text-red-700 dark:text-red-400">
          {outOfStock} sin stock
        </span>
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-400">
          {lowStock} por agotarse
        </span>
      </span>
    </CommandItem>
  )
}

interface RecentChipProps {
  label: string
  onClick: () => void
}

function RecentChip({ label, onClick }: RecentChipProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
    >
      <Sparkles className="h-3 w-3 text-primary" />
      {label}
    </motion.button>
  )
}

export function AssistantHome() {
  const { navigateTo, state, stockAlert, isUnseenAlert } = useAssistant()
  const { recentActions } = state
  const [showSuggestion, setShowSuggestion] = useState(false)

  const hasStockIssues =
    stockAlert !== null && (stockAlert.outOfStock > 0 || stockAlert.lowStock > 0)
  const showHighlight = hasStockIssues && isUnseenAlert

  const handleSelect = (view: AssistantView) => navigateTo(view)

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-col px-5 pb-6 pt-2"
    >
      <motion.h3
        variants={fadeIn}
        className="mb-2 text-base font-semibold text-foreground"
      >
        ¿Qué necesitás hacer?
      </motion.h3>

      <motion.div variants={fadeIn} className="overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-sm">
        <Command
          className="bg-transparent"
          filter={(value, search) => {
            if (!search.trim()) return 1
            const target = value.toLowerCase()
            const query = search.toLowerCase()
            return target.includes(query) ? 1 : 0
          }}
        >
          <CommandInput
            placeholder="Buscar acción o escribir opción..."
            className="h-9 text-sm"
          />
          <CommandList className="max-h-[260px] overflow-y-auto py-1">
            <CommandEmpty className="py-4 text-xs">
              No hay acciones que coincidan.
            </CommandEmpty>

            {showHighlight && stockAlert && (
              <CommandGroup heading="Atención">
                <LowStockAlertRow
                  outOfStock={stockAlert.outOfStock}
                  lowStock={stockAlert.lowStock}
                  onSelect={() => handleSelect('low-stock-products')}
                />
              </CommandGroup>
            )}

            <QuickActionsView onSelect={handleSelect} />
          </CommandList>
        </Command>
      </motion.div>

      {recentActions.length > 0 && (
        <motion.div variants={scaleIn} className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Usados recientemente
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentActions.slice(0, 5).map((action, i) => (
              <RecentChip
                key={`${action.view}-${i}`}
                label={action.label}
                onClick={() => handleSelect(action.view)}
              />
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={scaleIn} className="mt-4">
        {showSuggestion ? (
          <SuggestionForm onClose={() => setShowSuggestion(false)} />
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowSuggestion(true)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-dashed bg-card/50 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-accent/30"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
              <MessageSquarePlus className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-card-foreground">
              Enviar sugerencia
            </span>
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
        className="rounded-xl border bg-card p-3 text-center"
      >
        <p className="text-sm font-medium text-foreground">¡Gracias por tu sugerencia!</p>
        <p className="mt-0.5 text-xs text-muted-foreground">La vamos a tener en cuenta.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-card-foreground">💬 Enviar sugerencia</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Contanos qué mejorarías..."
        className="mb-2 w-full resize-none rounded-lg border bg-background px-2.5 py-2 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        rows={2}
      />
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-50"
      >
        <Send className="h-3.5 w-3.5" />
        Enviar sugerencia
      </motion.button>
    </motion.div>
  )
}