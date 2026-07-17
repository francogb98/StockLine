"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface AuthCardProps {
  children: ReactNode
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full rounded-2xl border border-border/20 bg-card/80 p-8 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-md dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.03)_inset] lg:p-12"
    >
      {children}
    </motion.div>
  )
}
