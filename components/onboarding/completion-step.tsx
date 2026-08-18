'use client'

import { Check, ArrowRight, Tag, Package } from 'lucide-react'
import type { OnboardingProduct } from '@/lib/types/onboarding'

interface CompletionStepProps {
  storeName: string
  categories: { id: string; name: string; isCustom: boolean }[]
  products: OnboardingProduct[]
  onGoToPanel: () => void
}

export function CompletionStep({
  storeName,
  categories,
  products,
  onGoToPanel,
}: CompletionStepProps) {
  const validProducts = products.filter(
    (p) => p.name.trim() && p.categoryId && p.price && p.stock
  )

  return (
    <div className="space-y-6 text-center animate-fadeIn py-2">
      <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
        <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/30 relative z-10 scale-105 transition-transform duration-500">
          <Check className="w-10 h-10 stroke-[3]" />
        </div>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {storeName || 'Tu negocio'} está listo!
        </h2>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Tu tienda fue configurada correctamente. Podés empezar a vender ahora o agregar más productos después.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center">
          <Tag className="w-5 h-5 text-blue-600 mb-1" />
          <span className="text-xl font-bold text-slate-900">{categories.length}</span>
          <span className="text-xs text-slate-500 font-medium">Categorías elegidas</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 flex flex-col items-center justify-center">
          <Package className="w-5 h-5 text-emerald-600 mb-1" />
          <span className="text-xl font-bold text-slate-900">{validProducts.length}</span>
          <span className="text-xs text-slate-500 font-medium">Productos cargados</span>
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={onGoToPanel}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all cursor-pointer hover:scale-[1.01]"
        >
          <span>Ir al panel</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
