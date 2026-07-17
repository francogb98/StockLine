"use client"

import { motion } from "framer-motion"

const float1 = {
  y: [0, -3, 0],
  transition: { duration: 8, repeat: Infinity, ease: "easeInOut" as const },
}

const float2 = {
  y: [0, -2, 0],
  transition: { duration: 7, repeat: Infinity, ease: "easeInOut" as const, delay: 1.5 },
}

const float3 = {
  y: [0, -4, 0],
  transition: { duration: 9, repeat: Infinity, ease: "easeInOut" as const, delay: 0.8 },
}

const pulseDot = {
  scale: [1, 1.4, 1],
  opacity: [0.7, 1, 0.7],
  transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
}

const bars = [
  { x: 32, h: 44 },
  { x: 66, h: 62 },
  { x: 100, h: 36 },
  { x: 134, h: 58 },
  { x: 168, h: 70 },
  { x: 202, h: 28 },
  { x: 236, h: 52 },
]

export function AuthIllustration() {
  return (
    <svg viewBox="0 0 500 290" fill="none" className="w-full h-auto max-w-[480px]" aria-hidden="true">
      <defs>
        <filter id="ill-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ill-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* KPI CARD 1 — Ventas */}
      <motion.g animate={float1} initial={false}>
        <rect x="4" y="4" width="156" height="52" rx="10" className="fill-card stroke-border/40" strokeWidth="1" filter="url(#ill-shadow)" />
        <text x="16" y="22" className="fill-muted-foreground/60" fontSize="10" fontWeight="500">Ventas hoy</text>
        <rect x="112" y="9" width="36" height="14" rx="4" className="fill-emerald-400/20" />
        <text x="118" y="19" className="fill-emerald-500/70" fontSize="8" fontWeight="600">+12.5%</text>
        <motion.text
          x="16" y="44" className="fill-foreground/80" fontSize="18" fontWeight="700" letterSpacing="-0.3"
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          $2.458
        </motion.text>
      </motion.g>

      {/* KPI CARD 2 — Productos */}
      <motion.g animate={float2} initial={false}>
        <rect x="172" y="4" width="156" height="52" rx="10" className="fill-card stroke-border/40" strokeWidth="1" filter="url(#ill-shadow)" />
        <text x="184" y="22" className="fill-muted-foreground/60" fontSize="10" fontWeight="500">Productos activos</text>
        <text x="184" y="44" className="fill-foreground/80" fontSize="18" fontWeight="700" letterSpacing="-0.3">1.247</text>
        <rect x="252" y="12" width="8" height="8" rx="2" className="fill-primary/35" />
        <rect x="264" y="12" width="8" height="8" rx="2" className="fill-primary/25" />
        <rect x="276" y="12" width="8" height="8" rx="2" className="fill-primary/20" />
        <rect x="288" y="12" width="8" height="8" rx="2" className="fill-primary/10" />
      </motion.g>

      {/* KPI CARD 3 — Stock bajo */}
      <motion.g animate={float3} initial={false}>
        <rect x="340" y="4" width="156" height="52" rx="10" className="fill-card stroke-border/40" strokeWidth="1" filter="url(#ill-shadow)" />
        <text x="352" y="22" className="fill-muted-foreground/60" fontSize="10" fontWeight="500">Stock bajo</text>
        <text x="352" y="44" className="fill-foreground/80" fontSize="18" fontWeight="700" letterSpacing="-0.3">8</text>
        <rect x="392" y="14" width="48" height="3" rx="1.5" className="fill-border/40" />
        <rect x="392" y="14" width="32" height="3" rx="1.5" className="fill-warning/60" />
        <text x="440" y="17" className="fill-warning/60" fontSize="8">⚠</text>
      </motion.g>

      {/* BAR CHART */}
      <g filter="url(#ill-shadow)">
        <rect x="4" y="72" width="280" height="120" rx="10" className="fill-card/85 stroke-border/30" strokeWidth="1" />
        <text x="18" y="92" className="fill-muted-foreground/50" fontSize="9" fontWeight="500">Ventas semanales</text>

        <line x1="18" y1="150" x2="266" y2="150" className="stroke-border/50" strokeWidth="1" />
        <line x1="18" y1="130" x2="266" y2="130" className="stroke-border/20" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="18" y1="110" x2="266" y2="110" className="stroke-border/20" strokeWidth="1" strokeDasharray="3 3" />

        {bars.map((bar, i) => (
          <motion.rect
            key={i}
            animate={{
              height: [bar.h, bar.h * 1.06, bar.h, bar.h * 0.95, bar.h],
              y: [150 - bar.h, 150 - bar.h * 1.06, 150 - bar.h, 150 - bar.h * 0.95, 150 - bar.h],
            }}
            transition={{
              duration: 10 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3 + i * 0.06,
            }}
            x={bar.x}
            width="20"
            height={bar.h}
            rx="3"
            className={i % 2 === 0 ? "fill-primary/35" : "fill-primary/50"}
          />
        ))}
      </g>

      {/* STOCK DONUT + TREND */}
      <g filter="url(#ill-shadow)">
        <rect x="296" y="72" width="200" height="120" rx="10" className="fill-card/85 stroke-border/30" strokeWidth="1" />
        <text x="310" y="92" className="fill-muted-foreground/50" fontSize="9" fontWeight="500">Distribución de stock</text>

        <motion.g
          animate={{ rotate: [-1, 1, -1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "346px 132px" }}
        >
          <circle cx="346" cy="132" r="28" className="fill-none stroke-border/25" strokeWidth="6" />
          <circle cx="346" cy="132" r="28" className="fill-none stroke-primary/40" strokeWidth="6" strokeDasharray="88 88" strokeDashoffset="-20" />
          <circle cx="346" cy="132" r="28" className="fill-none stroke-emerald-400/30" strokeWidth="6" strokeDasharray="44 132" strokeDashoffset="-60" />
          <text x="346" y="137" textAnchor="middle" className="fill-foreground/45" fontSize="11" fontWeight="600">75%</text>
        </motion.g>

        <rect x="388" y="108" width="8" height="8" rx="2" className="fill-primary/40" />
        <text x="400" y="115" className="fill-muted-foreground/45" fontSize="8">Stock óptimo</text>
        <rect x="388" y="124" width="8" height="8" rx="2" className="fill-emerald-400/30" />
        <text x="400" y="131" className="fill-muted-foreground/45" fontSize="8">Excedente</text>

        <motion.path
          d="M 388 150 Q 408 142, 428 148 T 468 144"
          className="stroke-primary/35"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
        />
        <motion.circle
          animate={{ r: [3, 4.5, 3], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          cx="468" cy="144" r="3" className="fill-primary/60"
        />
      </g>

      {/* PRODUCT CARDS */}
      <g transform="translate(4, 206)">
        <motion.g
          animate={{ opacity: [1, 0.8, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect width="152" height="38" rx="8" className="fill-card/85 stroke-border/30" strokeWidth="1" filter="url(#ill-shadow)" />
          <rect x="8" y="7" width="24" height="24" rx="5" className="fill-primary/25" />
          <rect x="12" y="11" width="16" height="16" rx="3" className="fill-primary/40" />
          <text x="38" y="21" className="fill-foreground/55" fontSize="10" fontWeight="500">Coca-Cola 500ml</text>
          <text x="38" y="32" className="fill-emerald-500/55" fontSize="8" fontWeight="600">$1.200</text>
        </motion.g>

        <motion.g
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
          <rect x="160" width="152" height="38" rx="8" className="fill-card/85 stroke-border/30" strokeWidth="1" filter="url(#ill-shadow)" />
          <rect x="168" y="7" width="24" height="24" rx="5" className="fill-primary/25" />
          <rect x="172" y="11" width="16" height="16" rx="3" className="fill-primary/40" />
          <text x="198" y="21" className="fill-foreground/55" fontSize="10" fontWeight="500">Papas Lay's 120g</text>
          <text x="198" y="32" className="fill-emerald-500/55" fontSize="8" fontWeight="600">$850</text>
        </motion.g>

        <motion.g
          animate={{ opacity: [1, 0.8, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        >
          <rect x="320" width="152" height="38" rx="8" className="fill-card/85 stroke-border/30" strokeWidth="1" filter="url(#ill-shadow)" />
          <rect x="328" y="7" width="24" height="24" rx="5" className="fill-primary/25" />
          <rect x="332" y="11" width="16" height="16" rx="3" className="fill-primary/40" />
          <text x="358" y="21" className="fill-foreground/55" fontSize="10" fontWeight="500">Agua 2L</text>
          <text x="358" y="32" className="fill-emerald-500/55" fontSize="8" fontWeight="600">$600</text>
        </motion.g>
      </g>

      {/* SYNC BADGE */}
      <g transform="translate(4, 256)">
        <rect width="136" height="28" rx="8" className="fill-card/80 stroke-border/30" strokeWidth="1" filter="url(#ill-shadow)" />
        <motion.circle
          animate={pulseDot}
          cx="20" cy="14" r="5" className="fill-emerald-400/80" filter="url(#ill-glow)"
        />
        <text x="32" y="18" className="fill-foreground/45" fontSize="10" fontWeight="500">Sincronizado</text>
      </g>
    </svg>
  )
}
