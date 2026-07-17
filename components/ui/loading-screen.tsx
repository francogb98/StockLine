"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const STARTUP_MESSAGES = [
  "Cargando tu espacio de trabajo...",
  "Restaurando sesión...",
  "Cargando productos...",
  "Preparando tu panel...",
  "Casi listo...",
];

interface LoadingScreenProps {
  messages?: string[];
}

export function LoadingScreen({ messages }: LoadingScreenProps) {
  const msgs = messages ?? STARTUP_MESSAGES;
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    if (msgs.length <= 1) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % msgs.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [msgs.length]);

  useEffect(() => {
    const startTime = Date.now();
    let rafId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const decay = 0.965;
      const factor = 1 - Math.pow(decay, elapsed / 1000);
      const currentProgress = Math.min(5 + 87 * factor, 92);

      setProgress(currentProgress);

      if (currentProgress < 92) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background">
      <div className="animate-fade-in flex flex-col items-center gap-4">
        <div className="animate-[spin_4s_ease-in-out_infinite] opacity-80">
          <BrandLogo showText={false} className="h-14 w-14" />
        </div>
      </div>

      <Loader2 className="h-10 w-10 animate-spin text-primary" />

      <p className="h-5 text-sm text-muted-foreground transition-opacity duration-300">
        {msgs[messageIndex]}
      </p>

      <div className="h-1.5 w-64 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
