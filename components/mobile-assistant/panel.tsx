'use client'

import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useAssistant } from './context'
import { AssistantHeader } from './header'
import { AssistantNavigation } from './navigation'
import { AssistantContent } from './content'

export function AssistantPanel() {
  const { state, close } = useAssistant()

  return (
    <Drawer open={state.isOpen} onOpenChange={(v) => { if (!v) close() }}>
      <DrawerContent className="flex h-[calc(100dvh-2.5rem)] flex-col rounded-t-2xl border-t border-border bg-background px-0 pb-0">
        <div className="mx-auto mt-3 mb-1 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" />
        <AssistantHeader />
        <AssistantNavigation />
        <AssistantContent />
      </DrawerContent>
    </Drawer>
  )
}
