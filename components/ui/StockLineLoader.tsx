"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { AnimatedLogo } from "./AnimatedLogo"
import { cn } from "@/lib/utils"

type CompletionPhase = "idle" | "pulse-up" | "pulse-down" | "fade" | "done"

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

interface StockLineLoaderProps {
  progress?: number
  text?: string
  size?: number
  className?: string
  onComplete?: () => void
}

export function StockLineLoader({
  progress,
  text,
  size = 80,
  className,
  onComplete,
}: StockLineLoaderProps) {
  const [phase, setPhase] = useState<CompletionPhase>("idle")
  const doneRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (progress !== undefined && progress < 100) {
      doneRef.current = false
      setPhase("idle")
    }
  }, [progress])

  useEffect(() => {
    if (progress !== 100 || doneRef.current) return
    doneRef.current = true

    const run = async () => {
      await delay(600)
      if (!mountedRef.current) return
      setPhase("pulse-up")

      await delay(300)
      if (!mountedRef.current) return
      setPhase("pulse-down")

      await delay(400)
      if (!mountedRef.current) return
      setPhase("fade")

      await delay(500)
      if (!mountedRef.current) return
      setPhase("done")
      onComplete?.()
    }

    run()
  }, [progress, onComplete])

  const isDone = phase === "done"

  return (
    <motion.div
      className={cn("flex flex-col items-center gap-5", className)}
      animate={{
        scale:
          phase === "pulse-up"
            ? 1.04
            : phase === "pulse-down" || phase === "idle"
              ? 1
              : phase === "fade"
                ? 0.96
                : 0.96,
        opacity: phase === "fade" || isDone ? 0 : 1,
      }}
      transition={{
        scale: { duration: 0.3, ease: "easeOut" },
        opacity: { duration: 0.45, ease: "easeIn" },
      }}
    >
      <AnimatedLogo progress={isDone ? undefined : progress} size={size} />

      {text && (
        <motion.p
          className="text-sm text-muted-foreground select-none"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  )
}
