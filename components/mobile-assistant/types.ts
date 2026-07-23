export type AssistantView =
  | 'home'
  | 'cash'
  | 'reports'
  | 'settings'
  | 'create-sale'
  | 'add-product'
  | 'categories'
  | 'users'
  | 'business'
  | 'conversation'

export interface AssistantCardAction {
  id: AssistantView
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  action?: AssistantNavAction
}

export interface AssistantNavAction {
  label: string
  view: AssistantView
}

export interface FAQItem {
  id: string
  question: string
  answer: string
  action?: AssistantNavAction
}

export interface RecentAction {
  view: AssistantView
  label: string
}

export interface AssistantState {
  isOpen: boolean
  currentView: AssistantView
  history: AssistantView[]
  messages: AssistantMessage[]
  recentActions: RecentAction[]
}

export type AssistantAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'NAVIGATE'; view: AssistantView }
  | { type: 'GO_BACK' }
  | { type: 'RESET' }
  | { type: 'SEND_MESSAGE'; message: AssistantMessage; response: AssistantMessage }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'TRACK_ACTION'; action: RecentAction }
  | { type: 'SEND_TEXT'; userMessage: AssistantMessage; response: AssistantMessage }
  | { type: 'SEND_RESOLVED'; userMessage: AssistantMessage; response: AssistantMessage }
