export type AssistantView =
  | 'home'
  | 'add-product'
  | 'add-stock'
  | 'change-price'
  | 'today-sales'
  | 'low-stock-products'
  | 'cash-status'
  | 'devoluciones-home'
  | 'make-return'
  | 'how-return-works'
  | 'search-product'

export interface AssistantCardAction {
  id: AssistantView
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export interface RecentAction {
  view: AssistantView
  label: string
}

export interface AssistantState {
  isOpen: boolean
  currentView: AssistantView
  history: AssistantView[]
  recentActions: RecentAction[]
  pendingProductId: string | null
}

export type AssistantAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'NAVIGATE'; view: AssistantView; productId?: string }
  | { type: 'GO_BACK' }
  | { type: 'RESET' }
  | { type: 'TRACK_ACTION'; action: RecentAction }
  | { type: 'CLEAR_PENDING_PRODUCT' }
