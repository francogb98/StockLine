'use client'

import { motion } from 'framer-motion'
import { cardVariants } from './animation-variants'
import type { AssistantCardAction } from './types'

interface AssistantCardProps {
  action: AssistantCardAction
  index: number
  onSelect: () => void
}

export function AssistantCard({ action, index, onSelect }: AssistantCardProps) {
  const Icon = action.icon

  return (
    <motion.button
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      custom={index}
      onClick={onSelect}
      className="group relative flex flex-col items-start gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-0.5">
        <span className="block text-sm font-semibold leading-tight text-card-foreground">
          {action.label}
        </span>
        <span className="block text-xs leading-tight text-muted-foreground">
          {action.description}
        </span>
      </div>
    </motion.button>
  )
}
