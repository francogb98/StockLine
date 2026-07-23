'use client'

import { motion } from 'framer-motion'
import {
  Bell,
  Shield,
  Printer,
  Globe,
  Palette,
  Keyboard,
  ChevronRight,
} from 'lucide-react'
import { staggerContainer } from '../animation-variants'

const settingsItems = [
  { icon: Bell, label: 'Notificaciones', description: 'Alertas y recordatorios' },
  { icon: Shield, label: 'Permisos', description: 'Roles y accesos' },
  { icon: Printer, label: 'Impresión', description: 'Configurar impresora térmica' },
  { icon: Globe, label: 'Idioma', description: 'Español (Argentina)' },
  { icon: Palette, label: 'Apariencia', description: 'Tema claro / oscuro' },
  { icon: Keyboard, label: 'Atajos', description: 'Atajos de teclado' },
]

export function SettingsView() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-1 px-5 py-4"
    >
      {settingsItems.map((item, i) => {
        const Icon = item.icon
        return (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-muted"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </motion.button>
        )
      })}
    </motion.div>
  )
}
