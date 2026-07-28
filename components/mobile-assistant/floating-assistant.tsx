'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useAssistant } from './context'
import { AssistantTrigger } from './trigger'
import { DesktopAssistantPanel } from './desktop-panel'
import { useIsMobile } from '@/hooks/use-mobile'

function StockAlertNotification() {
  const { notifVisible, stockAlert, dismissNotif, open } = useAssistant()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!notifVisible) return
    const timer = setTimeout(dismissNotif, 5000)
    return () => clearTimeout(timer)
  }, [notifVisible, dismissNotif])

  if (!notifVisible || !stockAlert) return null

  const hasOutOfStock = stockAlert.outOfStock > 0
  const message = hasOutOfStock
    ? `Tenés ${stockAlert.outOfStock} producto${stockAlert.outOfStock !== 1 ? 's' : ''} sin stock.`
    : `${stockAlert.lowStock} producto${stockAlert.lowStock !== 1 ? 's' : ''} están por agotarse. Considerá reponerlos.`

  const subMessage = hasOutOfStock && stockAlert.lowStock > 0
    ? `Además, ${stockAlert.lowStock} más están por agotarse.`
    : null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`fixed z-50 max-w-[260px] rounded-2xl border bg-card p-3.5 shadow-xl ${isMobile ? 'bottom-36 right-4' : 'bottom-24 right-6'}`}
      >
        <div className="mb-1.5 flex items-start gap-2.5">
          <span className="mt-0.5 text-lg leading-none" role="img" aria-label="robot">🤖</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-card-foreground leading-tight">
              {message}
            </p>
            {subMessage && (
              <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
                {subMessage}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); dismissNotif() }}
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors -mr-0.5 -mt-0.5"
            aria-label="Cerrar notificación"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { dismissNotif(); open() }}
          className="mt-1.5 w-full rounded-xl bg-primary/10 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          Ver acciones rápidas
        </motion.button>
      </motion.div>
    </AnimatePresence>
  )
}

export function FloatingAssistant() {
  const isMobile = useIsMobile()

  if (isMobile) return null

  return (
    <>
      <StockAlertNotification />
      <AssistantTrigger />
      <DesktopAssistantPanel />
    </>
  )
}
