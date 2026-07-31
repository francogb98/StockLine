"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BAR_CENTERS = [2110, 2500, 2890];
const BAR_TOPS = [2500, 2100, 1700];
const BAR_BOTTOMS = [3300, 3300, 3300];
const CLOUD_Y = 800;
const MAX_PARTICLES_PER_BAR = 2;

interface Particle {
  id: number;
  barIndex: number;
  startY: number;
  size: number;
}

export function ParticlesAnimation() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const barCounts = useRef([0, 0, 0]);
  const idCounter = useRef(0);

  const removeParticle = useCallback((id: number, barIndex: number) => {
    barCounts.current[barIndex]--;
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    const spawnTimeout = setTimeout(() => {
      const spawn = () => {
        const barIndex = Math.floor(Math.random() * 3);
        if (barCounts.current[barIndex] >= MAX_PARTICLES_PER_BAR) return;

        const startY =
          BAR_TOPS[barIndex] +
          Math.random() * (BAR_BOTTOMS[barIndex] - BAR_TOPS[barIndex]);
        const size = 4 + Math.random() * 4;
        const id = idCounter.current++;

        barCounts.current[barIndex]++;
        setParticles((prev) => [...prev, { id, barIndex, startY, size }]);
      };

      const interval = setInterval(spawn, 3000 + Math.random() * 1000);

      return () => clearInterval(interval);
    }, 3000);

    return () => clearTimeout(spawnTimeout);
  }, []);

  return (
    <AnimatePresence>
      {particles.map((p) => (
        <motion.circle
          key={p.id}
          cx={BAR_CENTERS[p.barIndex]}
          r={p.size}
          fill="#00C853"
          initial={{ opacity: 0, cy: p.startY }}
          animate={{
            opacity: [0, 0.4, 0.3, 0],
            cy: CLOUD_Y,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.5, ease: "linear" }}
          onAnimationComplete={() => removeParticle(p.id, p.barIndex)}
        />
      ))}
    </AnimatePresence>
  );
}
