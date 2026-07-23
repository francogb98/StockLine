"use client";

import { Settings } from "lucide-react";
import { useAuth } from "@/lib/store-context";
import { useRouter } from "next/navigation";
import { MobileCashIndicator } from "@/components/cash/mobile-cash-indicator";

export function MobileHeader() {
  const { store } = useAuth();
  const router = useRouter();

  return (
    <header className="fixed top-0 z-40 grid h-[52px] w-full grid-cols-3 items-center bg-primary px-4 shadow-sm">
      <div className="flex items-center gap-2 min-w-0 justify-self-start">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
          {(store?.name || "S")[0].toUpperCase()}
        </div>
        <span className="truncate text-sm font-semibold text-white">
          {store?.name || "Mi Negocio"}
        </span>
      </div>

      <div className="justify-self-center">
        <MobileCashIndicator />
      </div>

      <div className="flex items-center justify-self-end">
        <button
          type="button"
          onClick={() => router.push("/app/settings")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Configuración"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
