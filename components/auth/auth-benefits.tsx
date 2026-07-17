"use client"

import { motion } from "framer-motion"

const benefits = [
  {
    icon: "📦",
    title: "Control total",
    desc: "Gestioná todo tu inventario en un solo lugar.",
  },
  {
    icon: "⚡",
    title: "Ventas rápidas",
    desc: "Registrá ventas al instante desde el POS.",
  },
  {
    icon: "📈",
    title: "Reportes inteligentes",
    desc: "Tomá decisiones con datos reales.",
  },
  {
    icon: "☁️",
    title: "Acceso desde cualquier lugar",
    desc: "Tu negocio siempre disponible en la nube.",
  },
]

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const

export function AuthBenefits() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3"
    >
      {benefits.map((b) => (
        <motion.div
          key={b.title}
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          className="group rounded-xl border border-border/40 bg-card/40 p-3.5 hover:bg-card/70 hover:shadow-sm hover:border-border/60 transition-all duration-300"
        >
          <span className="block text-lg mb-1.5">{b.icon}</span>
          <p className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
            {b.title}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed">
            {b.desc}
          </p>
        </motion.div>
      ))}
    </motion.div>
  )
}
