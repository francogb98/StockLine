'use client'

import { motion } from 'framer-motion'
import { Undo2, HelpCircle, ArrowRight } from 'lucide-react'
import { useAssistant } from '../context'
import { staggerContainer, fadeIn, cardVariants } from '../animation-variants'

interface OptionCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  badge?: string
  badgeTone?: 'amber' | 'primary'
  onSelect: () => void
}

function OptionCard({
  icon: Icon,
  title,
  description,
  badge,
  badgeTone = 'amber',
  onSelect,
}: OptionCardProps) {
  const badgeClasses =
    badgeTone === 'amber'
      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
      : 'bg-primary/15 text-primary'

  return (
    <motion.button
      variants={cardVariants}
      whileHover="hover"
      whileTap="tap"
      onClick={onSelect}
      className="group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          badgeTone === 'amber' ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/15 text-primary'
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClasses}`}>
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </motion.button>
  )
}

export function DevolucionesHomeView() {
  const { navigateTo } = useAssistant()

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4 px-5 py-4"
    >
      <motion.div variants={fadeIn} className="rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-950/30 dark:to-orange-950/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
            <Undo2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Devoluciones</h2>
            <p className="text-xs text-muted-foreground">
              Gestioná devoluciones de ventas y productos
            </p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-2">
        <OptionCard
          icon={Undo2}
          title="Hacer devolución"
          description="Registrar una devolución de venta o productos"
          badge="Acción"
          onSelect={() => navigateTo('make-return')}
        />
        <OptionCard
          icon={HelpCircle}
          title="Cómo funciona"
          description="Aprendé paso a paso cómo usar el flujo de devoluciones"
          badgeTone="primary"
          onSelect={() => navigateTo('how-return-works')}
        />
      </div>
    </motion.div>
  )
}