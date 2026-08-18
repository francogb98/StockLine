'use client'

import { Building2, ArrowRight } from 'lucide-react'

interface CompanyStepProps {
  storeName: string
  onStoreNameChange: (name: string) => void
  onNext: () => void
}

export function CompanyStep({ storeName, onStoreNameChange, onNext }: CompanyStepProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">
          Bienvenido a StockLine
        </h2>
        <p className="text-slate-500 text-sm">
          Para comenzar a personalizar tu espacio, ingresá el nombre de tu comercio.
        </p>
      </div>

      <div className="space-y-2 pt-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Nombre de tu Empresa o Comercio
        </label>
        <div className="relative">
          <Building2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={storeName}
            onChange={(e) => onStoreNameChange(e.target.value)}
            placeholder="Ej. Kiosco Central, Minimarket San José..."
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <button
        disabled={!storeName.trim()}
        onClick={onNext}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
      >
        <span>Continuar</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
