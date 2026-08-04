"use client";

import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/store-context";
import { MobileCashIndicator } from "@/components/cash/mobile-cash-indicator";

interface MobileHeaderProps {
  onHeightChange?: (height: number) => void;
}

export function MobileHeader({ onHeightChange }: MobileHeaderProps) {
  const { store } = useAuth();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el || !onHeightChange) return;
    const report = () =>
      onHeightChange(Math.ceil(el.getBoundingClientRect().height));
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <header
      ref={headerRef}
      className="fixed top-0 z-40 w-full bg-primary shadow-sm"
    >
      {/* Fila superior: Perfil + Notificaciones */}
      <div className="flex h-[52px] items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2 pr-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
            {(store?.name || "S")[0].toUpperCase()}
          </div>
          <span className="truncate text-sm font-semibold text-white">
            {store?.name || "Mi Negocio"}
          </span>
        </div>

        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>

      {/* Fila inferior: Indicador de caja */}
      <div className="flex items-center justify-center border-t border-white/10 bg-primary/95 px-4 py-1.5">
        <MobileCashIndicator />
      </div>
    </header>
  );
}
