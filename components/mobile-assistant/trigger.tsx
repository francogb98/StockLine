'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAssistant } from './context'

export function AssistantTrigger() {
  const { state, open, badgeVisible } = useAssistant()

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
          aria-label="Abrir acciones rápidas"
        >
          <Image
            src="/robot.jpg"
            alt="Asistente"
            width={56}
            height={56}
            className="h-full w-full rounded-full object-cover"
          />
          {badgeVisible && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold leading-none text-white ring-2 ring-background" />
          )}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
