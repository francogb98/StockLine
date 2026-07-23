'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { useAssistant } from './context'
import { AssistantHeader } from './header'
import { AssistantNavigation } from './navigation'
import { AssistantContent } from './content'

export function DesktopAssistantPanel() {
  const { state, close } = useAssistant()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.isOpen) close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [state.isOpen, close])

  return (
    <AnimatePresence>
      {state.isOpen && (
        <motion.div
          key="desktop-assistant"
          initial={{ opacity: 0, scale: 0.95, y: 10, x: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10, x: 10 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[380px] flex-col rounded-2xl border bg-background shadow-2xl"
        >
          <AssistantHeader />
          <AssistantNavigation />
          <div className="flex-1 overflow-y-auto">
            <AssistantContent />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
