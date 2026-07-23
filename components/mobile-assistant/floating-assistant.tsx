'use client'

import { AssistantProvider } from './context'
import { AssistantTrigger } from './trigger'
import { AssistantPanel } from './panel'
import { DesktopAssistantPanel } from './desktop-panel'
import { useIsMobile } from '@/hooks/use-mobile'

export function FloatingAssistant() {
  const isMobile = useIsMobile()

  return (
    <AssistantProvider>
      <AssistantTrigger />
      {isMobile ? <AssistantPanel /> : <DesktopAssistantPanel />}
    </AssistantProvider>
  )
}
