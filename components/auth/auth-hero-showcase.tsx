"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function AuthHeroShowcase() {
  return (
    <div className="flex flex-col flex-1 w-full max-w-xl mx-auto">
      {/* Encabezado con Logo Centrado */}
      <div className="text-center">
        <Link
          href="/"
          className="inline-block mb-6 hover:opacity-90 transition-opacity"
        >
          <BrandLogo className="w-36 sm:w-40 h-auto mx-auto" />
        </Link>

        <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          Todo lo que necesitás para gestionar tu negocio
        </h2>
        <p className="text-sm text-slate-600 max-w-sm text-center mx-auto">
          Controlá ventas, inventario y reportes en tiempo real desde cualquier
          dispositivo.
        </p>
      </div>

      {/* Showcase de Imágenes (Desktop + Mobile) */}
      <div className="flex-1 flex items-center justify-center min-h-0 pt-6">
        <div className="relative w-full flex items-center justify-center">
          {/* Resplandor suave de fondo (Glow) */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-blue-600/20 via-blue-500/10 to-emerald-500/20 blur-2xl opacity-70 pointer-events-none" />

          {/* MARCO DE NAVEGADOR (Desktop Showcase) */}
          <div className="relative w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden group">
            {/* Barra superior estilo macOS */}
            <div className="h-9 bg-slate-950/90 px-4 flex items-center gap-2 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="mx-auto bg-slate-900/90 text-slate-400 text-[11px] px-3 py-0.5 rounded-md border border-slate-800/60 font-mono tracking-tight flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                app.stockline.com
              </div>
            </div>

            {/* Captura de Pantalla Desktop */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
              <img
                src="/imagen-reportes.png"
                alt="StockLine Desktop Dashboard"
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.01]"
              />
            </div>
          </div>

          {/* MARCO DE CELULAR FLOTANTE (Mobile Showcase) */}
          <div className="absolute -bottom-6 -right-2 sm:-bottom-8 sm:-right-4 w-[145px] sm:w-[180px] bg-slate-950 rounded-[2rem] p-1.5 border-2 border-slate-700/80 shadow-2xl z-20 transition-transform duration-300 hover:-translate-y-1">
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-800 rounded-full z-10" />
            <div className="relative aspect-[9/18] w-full rounded-[1.5rem] overflow-hidden bg-slate-900 border border-slate-800">
              <img
                src="/imagen-mobile.png"
                alt="StockLine Mobile Point of Sale"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
