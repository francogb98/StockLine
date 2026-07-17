'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Plus, Tag, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OnboardingProduct } from '@/lib/types/onboarding'

interface CompletionStepProps {
  categories: { id: string; name: string; isCustom: boolean }[]
  products: OnboardingProduct[]
  onGoToPanel: () => void
  onAddMoreProducts: () => void
}

export function CompletionStep({
  categories,
  products,
  onGoToPanel,
  onAddMoreProducts,
}: CompletionStepProps) {
  const validProducts = products.filter(
    (p) => p.name.trim() && p.categoryId && p.price && p.stock
  )

  const stats = [
    {
      icon: Tag,
      value: categories.length,
      label: categories.length === 1 ? 'categoría creada' : 'categorías creadas',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: Package,
      value: validProducts.length,
      label: validProducts.length === 1 ? 'producto cargado' : 'productos cargados',
      color: 'text-chart-2',
      bg: 'bg-chart-2/10',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: 0.2,
        }}
        className="relative"
      >
        <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 500, damping: 30 }}
          >
            <CheckCircle2 className="w-12 h-12 text-success" />
          </motion.div>
        </div>
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
          ¡Todo listo!
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Tu tienda está configurada. Podés empezar a vender ahora o agregar más productos después.
        </p>
      </div>

      <div className="flex justify-center gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="text-center"
            >
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2', stat.bg)}>
                <Icon className={cn('w-6 h-6', stat.color)} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Button variant="outline" onClick={onAddMoreProducts}>
          <Plus className="w-4 h-4 mr-1" />
          Agregar más productos
        </Button>
        <Button onClick={onGoToPanel} size="lg">
          Ir al panel
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}
