'use client'

import { motion } from 'framer-motion'
import {
  Store,
  MapPin,
  Phone,
  Clock,
  Mail,
  CreditCard,
  Calendar,
  FileText,
} from 'lucide-react'
import { staggerContainer } from '../animation-variants'

const infoItems = [
  { icon: Store, label: 'Nombre', value: 'StockLine' },
  { icon: MapPin, label: 'Dirección', value: 'Av. Corrientes 1234, CABA' },
  { icon: Phone, label: 'Teléfono', value: '+54 11 1234-5678' },
  { icon: Mail, label: 'Email', value: 'info@stockline.com' },
  { icon: Clock, label: 'Horario', value: 'Lun a Sáb 9:00 - 21:00' },
  { icon: CreditCard, label: 'Plan', value: 'Premium' },
  { icon: Calendar, label: 'Miembro desde', value: 'Enero 2025' },
  { icon: FileText, label: 'CUIT', value: '30-12345678-9' },
]

export function BusinessView() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4 px-5 py-4"
    >
      <div className="flex flex-col items-center rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
          <Store className="h-8 w-8 text-primary" />
        </div>
        <p className="text-lg font-bold text-card-foreground">StockLine</p>
        <p className="text-xs text-muted-foreground">Tu negocio, un solo lugar</p>
      </div>

      <div className="space-y-2">
        {infoItems.map((item, i) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.035, duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
              className="flex items-center gap-3 rounded-xl px-3 py-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground truncate">{item.value}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
