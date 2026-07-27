'use client'

import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { navigationVariants, fadeIn } from './animation-variants'
import { useAssistant } from './context'
import { useMemo } from 'react'
import { VIEW_LABELS } from './content'

export function AssistantNavigation() {
  const { goBack, canGoBack, state } = useAssistant()

  const title = useMemo(
    () => VIEW_LABELS[state.currentView] ?? 'Acciones rápidas',
    [state.currentView],
  )

  if (!canGoBack) return null

  return (
    <motion.div
      variants={navigationVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex items-center gap-2 border-b px-2 py-2"
    >
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>
      <motion.span
        key={title}
        variants={fadeIn}
        initial="initial"
        animate="animate"
        className="text-sm font-semibold text-foreground"
      >
        {title}
      </motion.span>
    </motion.div>
  )
}
