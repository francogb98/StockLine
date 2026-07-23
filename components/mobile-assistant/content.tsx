'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { viewVariants } from './animation-variants'
import { useAssistant } from './context'
import { AssistantHome } from './home'
import { CashView } from './views/cash-view'
import { ReportsView } from './views/reports-view'
import { SettingsView } from './views/settings-view'
import { CreateSaleView } from './views/create-sale-view'
import { AddProductView } from './views/add-product-view'
import { CategoriesView } from './views/categories-view'
import { UsersView } from './views/users-view'
import { BusinessView } from './views/business-view'
import { ConversationView } from './views/conversation-view'
import type { AssistantView } from './types'

export const VIEW_LABELS: Record<AssistantView, string> = {
  home: 'Inicio',
  cash: 'Caja',
  reports: 'Reportes',
  settings: 'Configuración',
  'create-sale': 'Crear venta',
  'add-product': 'Agregar producto',
  categories: 'Categorías',
  users: 'Usuarios',
  business: 'Mi negocio',
  conversation: 'Asistente',
}

const VIEW_COMPONENTS: Record<AssistantView, React.ComponentType> = {
  home: AssistantHome,
  cash: CashView,
  reports: ReportsView,
  settings: SettingsView,
  'create-sale': CreateSaleView,
  'add-product': AddProductView,
  categories: CategoriesView,
  users: UsersView,
  business: BusinessView,
  conversation: ConversationView,
}

export function AssistantContent() {
  const { state } = useAssistant()
  const ViewComponent = VIEW_COMPONENTS[state.currentView]

  return (
    <div className="relative flex-1 overflow-y-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={state.currentView}
          variants={viewVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="min-h-full"
        >
          <ViewComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
