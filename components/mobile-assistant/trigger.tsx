'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { useAssistant } from './context'

export function AssistantTrigger() {
  const { state, open } = useAssistant()

  return (
    <AnimatePresence>
      {!state.isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={open}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-shadow hover:shadow-xl active:scale-95 max-md:bottom-20 max-md:right-4"
          type="button"
          aria-label="Abrir asistente"
        >
          <MessageCircle className="h-6 w-6" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
