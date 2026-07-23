'use client'

import { motion } from 'framer-motion'
import {
  ShoppingCart,
  PackagePlus,
  FolderTree,
  Users,
  Wallet,
  BarChart3,
  Settings,
  Store,
  Sparkles,
  HelpCircle,
  History,
} from 'lucide-react'
import { staggerContainer, cardVariants, scaleIn } from './animation-variants'
import { AssistantCard } from './card'
import { useAssistant } from './context'
import { FAQ_ITEMS } from './faq-data'
import type { AssistantCardAction, AssistantView } from './types'
import { useData, useAuth } from '@/lib/store-context'
import { resolveAnswer } from '@/lib/assistant-service'

const HOME_ACTIONS: AssistantCardAction[] = [
  { id: 'create-sale', label: 'Crear una venta', description: 'Nueva venta rápida', icon: ShoppingCart },
  { id: 'add-product', label: 'Agregar producto', description: 'Alta de producto nuevo', icon: PackagePlus },
  { id: 'categories', label: 'Categorías', description: 'Gestionar categorías', icon: FolderTree },
  { id: 'users', label: 'Usuarios', description: 'Administrar usuarios', icon: Users },
  { id: 'cash', label: 'Caja', description: 'Control de caja diaria', icon: Wallet },
  { id: 'reports', label: 'Reportes', description: 'Resumen y estadísticas', icon: BarChart3 },
  { id: 'settings', label: 'Configuración', description: 'Ajustes del sistema', icon: Settings },
  { id: 'business', label: 'Mi negocio', description: 'Información del local', icon: Store },
]

const FAQ_DYNAMIC_IDS: Record<string, string> = {
  'sales-today': 'sales-today',
  'add-product': 'sales-today',
  'close-cash': 'cash-status',
  'returns': 'sales-today',
  'change-price': 'product-stats',
  'view-reports': 'sales-today',
  'manage-users': 'users-summary',
}

export function AssistantHome() {
  const { navigateTo, sendQuestion, sendResolvedMessage, state } = useAssistant()
  const { sales, products, categories } = useData()
  const { store } = useAuth()
  const { recentActions } = state

  const handleFAQ = (faqId: string) => {
    const faqItem = FAQ_ITEMS.find((f) => f.id === faqId)
    if (!faqItem) return

    const answerId = FAQ_DYNAMIC_IDS[faqId]
    const data = {
      sales,
      products,
      categories: categories.map((c) => ({
        ...c,
        _count: { products: products.filter((p) => p.categoryId === c.id).length } as any,
      })),
      store,
      cashSession: null,
      userCount: 0,
    }

    if (answerId) {
      const resolved = resolveAnswer(answerId, data)
      if (resolved) {
        const action = resolved.action
          ? { label: resolved.action.label, view: resolved.action.view as AssistantView }
          : undefined
        sendResolvedMessage(faqItem.question, resolved.text, action)
        return
      }
    }

    sendQuestion(faqId)
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-5 px-5 pb-6 pt-2"
    >
      <div className="grid grid-cols-2 gap-3">
        {HOME_ACTIONS.map((action, i) => (
          <AssistantCard
            key={action.id}
            action={action}
            index={i}
            onSelect={() => navigateTo(action.id as AssistantView)}
          />
        ))}
      </div>

      <motion.div variants={scaleIn}>
        <div className="mb-3 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preguntas frecuentes
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {FAQ_ITEMS.map((faq) => (
            <motion.button
              key={faq.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleFAQ(faq.id)}
              className="rounded-full border bg-card px-3.5 py-2 text-xs font-medium text-card-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
            >
              {faq.question}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {recentActions.length > 0 && (
        <motion.div variants={scaleIn}>
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Últimas acciones
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
    </motion.div>
  )
}
