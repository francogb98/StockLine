'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { viewVariants } from './animation-variants'
import { useAssistant } from './context'
import { AssistantHome } from './home'
import { CashStatusView } from './views/cash-status-view'
import { TodaySalesView } from './views/today-sales-view'
import { AddProductView } from './views/add-product-view'
import { AddStockView } from './views/add-stock-view'
import { ChangePriceView } from './views/change-price-view'
import { LowStockProductsView } from './views/low-stock-products-view'
import { MakeReturnView } from './views/make-return-view'
import { DevolucionesHomeView } from './views/devoluciones-home-view'
import { HowReturnWorksView } from './views/how-return-works-view'
import { SearchProductView } from './views/search-product-view'
import type { AssistantView } from './types'

export const VIEW_LABELS: Record<AssistantView, string> = {
  home: 'Inicio',
  'add-product': 'Agregar producto',
  'add-stock': 'Agregar stock',
  'change-price': 'Cambiar precio',
  'today-sales': 'Ventas de hoy',
  'low-stock-products': 'Productos con poco stock',
  'cash-status': 'Estado de caja',
  'devoluciones-home': 'Devoluciones',
  'make-return': 'Hacer devolución',
  'how-return-works': 'Cómo funciona',
  'search-product': 'Buscar producto',
}

const VIEW_COMPONENTS: Record<string, React.ComponentType> = {
  home: AssistantHome,
  'cash-status': CashStatusView,
  'today-sales': TodaySalesView,
  'add-product': AddProductView,
  'add-stock': AddStockView,
  'change-price': ChangePriceView,
  'low-stock-products': LowStockProductsView,
  'devoluciones-home': DevolucionesHomeView,
  'make-return': MakeReturnView,
  'how-return-works': HowReturnWorksView,
  'search-product': SearchProductView,
}

export function AssistantContent() {
  const { state } = useAssistant()

  const ViewComponent = VIEW_COMPONENTS[state.currentView]

  if (!ViewComponent) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Esta sección no está disponible desde el asistente.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Usá el menú principal de la aplicación.
        </p>
      </div>
    )
  }

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
