'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react'
import type { AssistantView, AssistantState, AssistantAction } from './types'
import { useData } from '@/lib/store-context'

function assistantReducer(state: AssistantState, action: AssistantAction): AssistantState {
  switch (action.type) {
    case 'OPEN':
      return { ...state, isOpen: true }
    case 'CLOSE':
      return { ...state, isOpen: false, currentView: 'home', history: [], pendingProductId: null }
    case 'NAVIGATE':
      if (action.view === state.currentView) return state
      return {
        ...state,
        currentView: action.view,
        history: [...state.history, state.currentView],
        pendingProductId: action.productId ?? state.pendingProductId,
      }
    case 'GO_BACK': {
      if (state.history.length === 0) return state
      const newHistory = [...state.history]
      const previousView = newHistory.pop()!
      return {
        ...state,
        currentView: previousView,
        history: newHistory,
      }
    }
    case 'RESET':
      return { ...state, currentView: 'home', history: [], pendingProductId: null }
    case 'TRACK_ACTION': {
      const filtered = state.recentActions.filter(
        (a) => a.view !== action.action.view,
      )
      return {
        ...state,
        recentActions: [action.action, ...filtered].slice(0, 5),
      }
    }
    case 'CLEAR_PENDING_PRODUCT':
      return { ...state, pendingProductId: null }
    default:
      return state
  }
}

const initialState: AssistantState = {
  isOpen: false,
  currentView: 'home',
  history: [],
  recentActions: [],
  pendingProductId: null,
}

interface AssistantContextType {
  state: AssistantState
  stockAlert: { outOfStock: number; lowStock: number } | null
  badgeVisible: boolean
  notifVisible: boolean
  isUnseenAlert: boolean
  dismissNotif: () => void
  open: () => void
  close: () => void
  navigateTo: (view: AssistantView) => void
  navigateToWithProduct: (view: AssistantView, productId: string) => void
  clearPendingProduct: () => void
  goBack: () => void
  resetToHome: () => void
  canGoBack: boolean
}

const AssistantContext = createContext<AssistantContextType | null>(null)

const VIEW_LABELS_MAP: Record<string, string> = {
  'add-product': 'Agregar producto',
  'add-stock': 'Agregar stock',
  'change-price': 'Cambiar precio',
  'today-sales': 'Ventas de hoy',
  'low-stock-products': 'Productos con poco stock',
  'cash-status': 'Estado de caja',
  'make-return': 'Hacer devolución',
}

function getLabelForView(view: AssistantView): string {
  return VIEW_LABELS_MAP[view] ?? view
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(assistantReducer, initialState)

  const { products, isDataLoading } = useData()
  const [stockAlert, setStockAlert] = useState<{ outOfStock: number; lowStock: number } | null>(null)
  const [badgeVisible, setBadgeVisible] = useState(false)
  const [notifVisible, setNotifVisible] = useState(false)
  const [isUnseenAlert, setIsUnseenAlert] = useState(false)
  const shownAlertKeyRef = useRef('')

  useEffect(() => {
    if (isDataLoading) return
    if (products.length === 0) return

    const outOfStock = products.filter(p => p.stock <= 0).length
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length

    if (outOfStock > 0 || lowStock > 0) {
      const key = `${outOfStock}-${lowStock}`
      setStockAlert({ outOfStock, lowStock })
      if (key !== shownAlertKeyRef.current) {
        shownAlertKeyRef.current = key
        setBadgeVisible(true)
        setNotifVisible(true)
        setIsUnseenAlert(true)
      }
    } else {
      setStockAlert(null)
      setBadgeVisible(false)
      setNotifVisible(false)
      setIsUnseenAlert(false)
    }
  }, [products, isDataLoading])

  const open = useCallback(() => {
    dispatch({ type: 'OPEN' })
    setBadgeVisible(false)
    setIsUnseenAlert(false)
  }, [])
  const dismissNotif = useCallback(() => setNotifVisible(false), [])
  const close = useCallback(() => dispatch({ type: 'CLOSE' }), [])
  const navigateTo = useCallback(
    (view: AssistantView) => {
      dispatch({ type: 'NAVIGATE', view })
      if (view !== 'home') {
        dispatch({ type: 'TRACK_ACTION', action: { view, label: getLabelForView(view) } })
      }
    },
    [],
  )
  const navigateToWithProduct = useCallback(
    (view: AssistantView, productId: string) => {
      dispatch({ type: 'NAVIGATE', view, productId })
      if (view !== 'home') {
        dispatch({ type: 'TRACK_ACTION', action: { view, label: getLabelForView(view) } })
      }
    },
    [],
  )
  const clearPendingProduct = useCallback(() => dispatch({ type: 'CLEAR_PENDING_PRODUCT' }), [])
  const goBack = useCallback(() => dispatch({ type: 'GO_BACK' }), [])
  const resetToHome = useCallback(() => dispatch({ type: 'RESET' }), [])

  return (
    <AssistantContext.Provider
      value={{
        state,
        stockAlert,
        badgeVisible,
        notifVisible,
        isUnseenAlert,
        dismissNotif,
        open,
        close,
        navigateTo,
        navigateToWithProduct,
        clearPendingProduct,
        goBack,
        resetToHome,
        canGoBack: state.history.length > 0,
      }}
    >
      {children}
    </AssistantContext.Provider>
  )
}

export function useAssistant() {
  const context = useContext(AssistantContext)
  if (!context) {
    throw new Error('useAssistant debe usarse dentro de un AssistantProvider')
  }
  return context
}
