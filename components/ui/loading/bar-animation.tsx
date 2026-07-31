"use client";

import { motion } from "framer-motion";

const BARS = [
  { x: 2000, y: 2500, width: 220, height: 800, delay: 0.4 },
  { x: 2390, y: 2100, width: 220, height: 1200, delay: 0.52 },
  { x: 2780, y: 1700, width: 220, height: 1600, delay: 0.64 },
];

export function BarAnimation() {
  return (
    <>
      {BARS.map((bar) => (
        <motion.g
          key={bar.x}
          style={{
            transformOrigin: `${bar.x + bar.width / 2}px ${bar.y + bar.height}px`,
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{
            duration: 0.4,
            delay: bar.delay,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx="60"
            fill="#00C853"
          />
        </motion.g>
      ))}
    </>
  );
}
