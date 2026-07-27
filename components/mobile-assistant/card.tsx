'use client'

import { motion } from 'framer-motion'
import { cardVariants } from './animation-variants'
import type { AssistantCardAction } from './types'

interface AssistantCardProps {
  action: AssistantCardAction
  index: number
  onSelect: () => void
  highlighted?: boolean
}

export function AssistantCard({ action, index, onSelect, highlighted }: AssistantCardProps) {
  const Icon = action.icon

  return (
    <motion.button
      variants={cardVariants}
      initial="initial"
      animate={highlighted ? 'highlighted' : 'animate'}
      whileHover="hover"
      whileTap="tap"
      custom={index}
      onClick={onSelect}
      className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        highlighted
          ? 'border-amber-400 bg-amber-50/70 dark:border-amber-500/60 dark:bg-amber-950/20 hover:border-amber-500 hover:bg-amber-100/70 dark:hover:bg-amber-950/30'
          : 'bg-card hover:border-primary/30 hover:bg-accent/50'
      }`}
    >
      {highlighted && (
        <>
          <span className="absolute -right-2 -top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold leading-tight text-white shadow-sm z-10">
            Atención
          </span>
          <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-400/50 dark:ring-amber-500/40 ring-inset pointer-events-none animate-pulse" />
        </>
      )}
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
        highlighted ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'
      }`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <span className={`block text-sm font-semibold leading-tight ${
          highlighted ? 'text-amber-800 dark:text-amber-300' : 'text-card-foreground'
        }`}>
          {action.label}
        </span>
        <span className={`block text-xs leading-tight ${
          highlighted ? 'text-amber-600/70 dark:text-amber-400/70' : 'text-muted-foreground'
        }`}>
          {action.description}
        </span>
      </div>
    </motion.button>
  )
}
