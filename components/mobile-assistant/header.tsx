'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { X } from 'lucide-react'
import { headerVariants } from './animation-variants'
import { useAssistant } from './context'

export function AssistantHeader() {
  const { close, stockAlert } = useAssistant()

  const totalIssues = stockAlert ? stockAlert.outOfStock + stockAlert.lowStock : 0

  return (
    <motion.div
      variants={headerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex items-center gap-3 px-5 pt-5 pb-3"
    >
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10">
        <Image
          src="/robot.jpg"
          alt="Asistente"
          width={40}
          height={40}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold leading-tight text-foreground">
          Acciones rápidas
        </h2>
        {totalIssues > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 leading-tight mt-0.5">
            {totalIssues} producto{totalIssues !== 1 ? 's' : ''} requieren atención.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={close}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}
