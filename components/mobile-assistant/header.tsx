'use client'

import { motion } from 'framer-motion'
import { X, Bot } from 'lucide-react'
import { headerVariants } from './animation-variants'
import { useAssistant } from './context'

export function AssistantHeader() {
  const { close } = useAssistant()

  return (
    <motion.div
      variants={headerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex items-center gap-3 px-5 pt-5 pb-3"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
        <Bot className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold leading-tight text-foreground">
          Asistente
        </h2>
        <p className="text-xs leading-tight text-muted-foreground">
          ¿Qué querés hacer?
        </p>
      </div>
      <button
        type="button"
        onClick={close}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Cerrar asistente"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}
