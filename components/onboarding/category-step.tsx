'use client'

import { useState } from 'react'
import { Tag, Check, Plus, ArrowRight } from 'lucide-react'
import { SUGGESTED_CATEGORIES } from '@/lib/types/onboarding'

interface Category {
  id: string
  name: string
  isCustom: boolean
}

interface CategoryStepProps {
  categories: Category[]
  onCategoriesChange: (categories: Category[]) => void
  onNext: () => void
  onBack: () => void
}

export function CategoryStep({ categories, onCategoriesChange, onNext, onBack }: CategoryStepProps) {
  const [nuevaCategoria, setNuevaCategoria] = useState('')

  const allCategories = [
    ...SUGGESTED_CATEGORIES.map((name) => ({
      name,
      isSelected: categories.some((c) => c.name.toLowerCase() === name.toLowerCase()),
    })),
    ...categories
      .filter((c) => c.isCustom)
      .map((c) => ({ name: c.name, isSelected: true })),
  ]

  const toggleCategoria = (name: string) => {
    const exists = categories.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (exists) {
      onCategoriesChange(categories.filter((c) => c.id !== exists.id))
    } else {
      onCategoriesChange([...categories, { id: crypto.randomUUID(), name, isCustom: false }])
    }
  }

  const handleAgregarCategoria = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaCategoria.trim()) return
    const catLimpia = nuevaCategoria.trim()
    if (!categories.some((c) => c.name.toLowerCase() === catLimpia.toLowerCase())) {
      onCategoriesChange([...categories, { id: crypto.randomUUID(), name: catLimpia, isCustom: true }])
    }
    setNuevaCategoria('')
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl font-bold text-slate-900">
          Elegí tus categorías
        </h2>
        <p className="text-slate-500 text-sm">
          Seleccioná las categorías con las que trabajás o agregá las tuyas propias.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
          {allCategories.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => toggleCategoria(cat.name)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                cat.isSelected
                  ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Tag className={`w-3.5 h-3.5 ${cat.isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{cat.name}</span>
              {cat.isSelected ? (
                <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3] ml-1" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-slate-400 ml-1" />
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleAgregarCategoria} className="flex gap-2 pt-1">
          <input
            type="text"
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            placeholder="Agregar nueva categoría personalizada..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={!nuevaCategoria.trim()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        </form>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-all"
        >
          Volver
        </button>
        <button
          disabled={categories.length === 0}
          onClick={onNext}
          className="w-2/3 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
        >
          <span>Siguiente ({categories.length})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
