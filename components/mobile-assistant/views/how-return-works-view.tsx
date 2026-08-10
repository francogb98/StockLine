'use client'

import { motion } from 'framer-motion'
import {
  Search,
  ListChecks,
  Undo2,
  Check,
  Info,
  ArrowLeft,
  Wallet,
  Recycle,
  Trash2,
} from 'lucide-react'
import { useAssistant } from '../context'
import { staggerContainer, fadeIn } from '../animation-variants'

interface StepItem {
  number: number
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

const STEPS: StepItem[] = [
  {
    number: 1,
    icon: Search,
    title: 'Buscá la venta',
    description:
      'Tocá "Hacer devolución" y escribí el nombre de un producto o el ID de la venta. Aparecerán las ventas del día que coincidan.',
  },
  {
    number: 2,
    icon: ListChecks,
    title: 'Elegí qué devolver',
    description:
      'Tocá "Devolver" en cada producto que quieras incluir. Ajustá la cantidad con + y -. Para anular la venta entera, activá "Devolución total".',
  },
  {
    number: 3,
    icon: Recycle,
    title: 'Decidí la disposición',
    description:
      'Para cada item elegí "Reingresar" (vuelve al stock) o "Mermar" (se descarta). Esto se registra en el historial de stock.',
  },
  {
    number: 4,
    icon: Info,
    title: 'Agregá un motivo (opcional)',
    description:
      'En el paso final podés escribir el motivo de la devolución, por ejemplo "producto defectuoso" o "cliente arrepentido".',
  },
  {
    number: 5,
    icon: Undo2,
    title: 'Confirmá la devolución',
    description:
      'Revisá el total a devolver y confirmá. El sistema registra la devolución, ajusta el stock y descuenta el monto de la caja abierta.',
  },
]

const FAQ: { icon: React.ComponentType<{ className?: string }>; question: string; answer: string }[] = [
  {
    icon: Wallet,
    question: '¿Cómo se devuelve el dinero?',
    answer:
      'Si tenés una caja abierta, el monto se descuenta automáticamente del efectivo esperado. Si no hay caja abierta, la devolución queda registrada pero el reintegro se hace fuera del sistema.',
  },
  {
    icon: Recycle,
    question: '¿Puedo devolver solo parte de los productos?',
    answer:
      'Sí. Devolución parcial: elegís productos y cantidades específicas. Devolución total: marcá "Devolución total" y se devuelven todos los items de la venta.',
  },
  {
    icon: Trash2,
    question: '¿Qué pasa si el producto ya no se vende?',
    answer:
      'Marcá "Mermar". El producto sale del stock sin reingresar y queda registrado en el historial de devoluciones para tu trazabilidad.',
  },
  {
    icon: Check,
    question: '¿Puedo hacer varias devoluciones de la misma venta?',
    answer:
      'Sí, siempre que quede saldo por devolver. Cada devolución descuenta lo que se devolvió antes, así que el sistema no te deja pasarte.',
  },
]

export function HowReturnWorksView() {
  const { navigateTo } = useAssistant()

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-5 px-5 py-4"
    >
      <motion.button
        variants={fadeIn}
        onClick={() => navigateTo('devoluciones-home')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </motion.button>

      <motion.div variants={fadeIn} className="rounded-2xl border bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <h2 className="text-base font-semibold text-foreground">Cómo hacer una devolución</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Te explicamos el flujo paso a paso para que registres devoluciones sin errores.
        </p>
      </motion.div>

      <motion.div variants={fadeIn} className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pasos
        </h3>
        <ol className="space-y-2">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <li
                key={step.number}
                className="flex gap-3 rounded-xl border bg-card p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {step.number}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {step.title}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </motion.div>

      <motion.div variants={fadeIn} className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preguntas frecuentes
        </h3>
        <div className="space-y-2">
          {FAQ.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.question} className="rounded-xl border bg-card p-3">
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.question}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      <motion.button
        variants={fadeIn}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigateTo('make-return')}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
      >
        <Undo2 className="h-4 w-4" />
        Empezar una devolución
      </motion.button>
    </motion.div>
  )
}