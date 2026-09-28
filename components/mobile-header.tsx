"use client";

import { useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/store-context";
import { useCashControl } from "@/lib/cash-control-context";
import { MobileCashIndicator } from "@/components/cash/mobile-cash-indicator";
import { DailySalesBanner } from "@/components/daily-sales-banner";

interface MobileHeaderProps {
  onHeightChange?: (height: number) => void;
}

export function MobileHeader({ onHeightChange }: MobileHeaderProps) {
  const { store } = useAuth();
  const { cashControlEnabled } = useCashControl();
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
      className="fixed top-0 z-40 w-full bg-primary"
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
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/30"
          aria-label="Nuevo Producto"
          onClick={() => window.dispatchEvent(new CustomEvent("open-product-dialog"))}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Fila inferior: Indicador de caja o ventas del día */}
      <div className="flex items-center justify-center border-t border-white/10 bg-primary px-4 py-1.5">
        {cashControlEnabled ? <MobileCashIndicator /> : <DailySalesBanner variant="mobile" />}
      </div>
    </header>
  );
}
