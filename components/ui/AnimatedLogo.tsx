"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const VIEWBOX = "0 0 120 120"
const HEX_PATH = "M 104 60 L 82 98.1 L 38 98.1 L 16 60 L 38 21.9 L 82 21.9 Z"

const LINES = [
  { y: 47, x1: 26, x2: 48 },
  { y: 59, x1: 22, x2: 52 },
  { y: 71, x1: 28, x2: 46 },
]

const CUBE_FACES = [
  { d: "M 82 48 L 82 66 L 89 59 L 89 41 Z", fill: "#2563EB" },
  { d: "M 64 48 L 82 48 L 89 41 L 71 41 Z", fill: "#60A5FA" },
  { d: "M 64 48 L 82 48 L 82 66 L 64 66 Z", fill: "#3B82F6" },
]

interface AnimatedLogoProps {
  progress?: number
  size?: number
  className?: string
}

export function AnimatedLogo({ progress, size = 80, className }: AnimatedLogoProps) {
  const isIndeterminate = progress === undefined
  const normalizedProgress = progress !== undefined ? Math.min(progress, 100) / 100 : 0

  const [mountPhase, setMountPhase] = useState(0)

  useEffect(() => {
    if (!isIndeterminate) return
    setMountPhase(0)
    const t1 = setTimeout(() => setMountPhase(1), 600)
    const t2 = setTimeout(() => setMountPhase(2), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isIndeterminate])

  const isPastLineThreshold = normalizedProgress >= 0.7
  const isPastCubeThreshold = normalizedProgress >= 0.9

  const showLines = isIndeterminate ? mountPhase >= 1 : isPastLineThreshold
  const showCube = isIndeterminate ? mountPhase >= 2 : isPastCubeThreshold

  const linesPulse = showLines && (isIndeterminate || (progress !== undefined && progress < 100))

  const [pulseActive, setPulseActive] = useState(false)

  useEffect(() => {
    if (!linesPulse) {
      setPulseActive(false)
      return
    }
    const t = setTimeout(() => setPulseActive(true), 500)
    return () => clearTimeout(t)
  }, [linesPulse])

  const isComplete = progress === 100

  return (
    <svg
      viewBox={VIEWBOX}
      width={size}
      height={size}
      className={cn("overflow-visible shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={HEX_PATH}
        stroke="#CBD5E1"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {isIndeterminate ? (
        <motion.path
          d={HEX_PATH}
          stroke="#2563EB"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="55 264"
          animate={{ strokeDashoffset: [319, 0] }}
          transition={{
            duration: 2.5,
            ease: "linear",
            repeat: Infinity,
          }}
        />
      ) : (
        <motion.path
          d={HEX_PATH}
          stroke="#2563EB"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: normalizedProgress }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      )}

      {LINES.map((line, i) => (
        <motion.g key={i}>
          <motion.g
            animate={
              pulseActive
                ? { opacity: [0.7, 1, 0.7] }
                : { opacity: 1 }
            }
            transition={{
              duration: 2,
              repeat: pulseActive ? Infinity : 0,
              ease: "easeInOut",
              delay: pulseActive ? i * 0.15 : 0,
            }}
          >
            <motion.line
              x1={line.x1}
              y1={line.y}
              x2={line.x2}
              y2={line.y}
              stroke="#3B82F6"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#lineGlow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: showLines ? 1 : 0 }}
              transition={{
                opacity: { duration: 0.35, delay: showLines ? i * 0.1 : 0 },
              }}
            />
          </motion.g>
        </motion.g>
      ))}

      {showCube && (
        <motion.g
          initial={{ opacity: 0, scale: 0.85 }}
          animate={
            isIndeterminate
              ? { opacity: 1, scale: [0.85, 1, 1, 1.02, 1] }
              : { opacity: 1, scale: 1 }
          }
          transition={
            isIndeterminate
              ? {
                  opacity: { duration: 0.3 },
                  scale: {
                    duration: 4,
                    times: [0, 0.08, 0.5, 0.75, 1],
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 1,
                  },
                }
              : {
                  opacity: { duration: 0.3 },
                  scale: { type: "spring", stiffness: 400, damping: 20 },
                }
          }
          style={{ originX: 76.5, originY: 53.5 }}
        >
          {CUBE_FACES.map((face, i) => (
            <path key={i} d={face.d} fill={face.fill} />
          ))}
        </motion.g>
      )}

      {isComplete && (
        <motion.path
          d={HEX_PATH}
          stroke="#60A5FA"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lineGlow)"
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: [0, 0.5, 0], pathLength: [0, 1, 1] }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      )}
    </svg>
  )
}
