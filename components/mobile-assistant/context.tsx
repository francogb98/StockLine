'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react'
import type { AssistantView, AssistantState, AssistantAction } from './types'
import { getFAQResponse } from './faq-data'

let messageIdCounter = 0
function nextMessageId() {
  return `msg-${++messageIdCounter}`
}

function assistantReducer(state: AssistantState, action: AssistantAction): AssistantState {
  switch (action.type) {
    case 'OPEN':
      return { ...state, isOpen: true }
    case 'CLOSE':
      return { ...state, isOpen: false, currentView: 'home', history: [], messages: [] }
    case 'NAVIGATE':
      if (action.view === state.currentView) return state
      return {
        ...state,
        currentView: action.view,
        history: [...state.history, state.currentView],
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
      return { ...state, currentView: 'home', history: [] }
    case 'SEND_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.message, action.response],
      }
    case 'SEND_TEXT':
    case 'SEND_RESOLVED':
      return {
        ...state,
        messages: [...state.messages, action.userMessage, action.response],
      }
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] }
    case 'TRACK_ACTION': {
      const filtered = state.recentActions.filter(
        (a) => a.view !== action.action.view,
      )
      return {
        ...state,
        recentActions: [action.action, ...filtered].slice(0, 5),
      }
    }
    default:
      return state
  }
}

const initialState: AssistantState = {
  isOpen: false,
  currentView: 'home',
  history: [],
  messages: [],
  recentActions: [],
}

interface AssistantContextType {
  state: AssistantState
  open: () => void
  close: () => void
  navigateTo: (view: AssistantView) => void
  goBack: () => void
  resetToHome: () => void
  canGoBack: boolean
  sendQuestion: (faqId: string) => void
  sendText: (content: string) => void
  sendResolvedMessage: (content: string, answer: string, action?: { label: string; view: AssistantView }) => void
  clearMessages: () => void
}

const AssistantContext = createContext<AssistantContextType | null>(null)

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(assistantReducer, initialState)

  const open = useCallback(() => dispatch({ type: 'OPEN' }), [])
  const close = useCallback(() => dispatch({ type: 'CLOSE' }), [])
  const navigateTo = useCallback(
    (view: AssistantView) => {
      dispatch({ type: 'NAVIGATE', view })
      if (view !== 'home' && view !== 'conversation') {
        dispatch({ type: 'TRACK_ACTION', action: { view, label: getLabelForView(view) } })
      }
    },
    [],
  )
  const goBack = useCallback(() => dispatch({ type: 'GO_BACK' }), [])
  const resetToHome = useCallback(() => dispatch({ type: 'RESET' }), [])
  const clearMessages = useCallback(() => dispatch({ type: 'CLEAR_MESSAGES' }), [])

  const sendQuestion = useCallback(
    (faqId: string) => {
      const faq = getFAQResponse(faqId)
      if (!faq) return

      const userMsg = {
        id: nextMessageId(),
        role: 'user' as const,
        content: faq.question,
      }

      const assistantMsg = {
        id: nextMessageId(),
        role: 'assistant' as const,
        content: faq.answer,
        action: faq.action,
      }

      dispatch({ type: 'SEND_MESSAGE', message: userMsg, response: assistantMsg })
      dispatch({ type: 'NAVIGATE', view: 'conversation' })
    },
    [],
  )

  const sendText = useCallback(
    (content: string) => {
      const userMsg = {
        id: nextMessageId(),
        role: 'user' as const,
        content,
      }

      const assistantMsg = {
        id: nextMessageId(),
        role: 'assistant' as const,
        content: 'Procesando tu pregunta...',
      }

      dispatch({ type: 'SEND_TEXT', userMessage: userMsg, response: assistantMsg })
      dispatch({ type: 'NAVIGATE', view: 'conversation' })
    },
    [],
  )

  const sendResolvedMessage = useCallback(
    (content: string, answer: string, action?: { label: string; view: AssistantView }) => {
      const userMsg = {
        id: nextMessageId(),
        role: 'user' as const,
        content,
      }

      const assistantMsg = {
        id: nextMessageId(),
        role: 'assistant' as const,
        content: answer,
        action,
      }

      dispatch({ type: 'SEND_RESOLVED', userMessage: userMsg, response: assistantMsg })
      dispatch({ type: 'NAVIGATE', view: 'conversation' })
    },
    [],
  )

  return (
    <AssistantContext.Provider
      value={{
        state,
        open,
        close,
        navigateTo,
        goBack,
        resetToHome,
        canGoBack: state.history.length > 0,
        sendQuestion,
        sendText,
        sendResolvedMessage,
        clearMessages,
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

const VIEW_LABELS_MAP: Record<string, string> = {
  cash: 'Caja',
  reports: 'Reportes',
  settings: 'Configuración',
  'create-sale': 'Crear venta',
  'add-product': 'Agregar producto',
  categories: 'Categorías',
  users: 'Usuarios',
  business: 'Mi negocio',
}

function getLabelForView(view: AssistantView): string {
  return VIEW_LABELS_MAP[view] ?? view
}
