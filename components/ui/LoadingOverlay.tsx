"use client"

import { motion, AnimatePresence } from "framer-motion"
import { StockLineLoader } from "./StockLineLoader"
import { cn } from "@/lib/utils"

interface LoadingOverlayProps {
  isLoading: boolean
  progress?: number
  text?: string
  size?: number
  className?: string
  showProgress?: boolean
  onComplete?: () => void
}

export function LoadingOverlay({
  isLoading,
  progress,
  text,
  size = 80,
  className,
  showProgress = false,
  onComplete,
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center",
            "bg-white/70 dark:bg-gray-950/70 backdrop-blur-md",
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <StockLineLoader
            progress={progress}
            text={text}
            size={size}
            onComplete={onComplete}
          />

          {showProgress && progress !== undefined && (
            <motion.p
              className="mt-5 text-xs tabular-nums text-muted-foreground/50 select-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
            >
              {Math.round(progress)}%
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
