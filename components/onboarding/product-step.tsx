'use client'

import { useState } from 'react'
import { Plus, Sparkles, ArrowRight, X } from 'lucide-react'
import { type OnboardingProduct, EXAMPLE_PRODUCTS, createEmptyProduct } from '@/lib/types/onboarding'

interface ProductStepProps {
  categories: { id: string; name: string; isCustom: boolean }[]
  products: OnboardingProduct[]
  onProductsChange: (products: OnboardingProduct[]) => void
  onNext: () => void
  onBack: () => void
}

export function ProductStep({
  categories,
  products,
  onProductsChange,
  onNext,
  onBack,
}: ProductStepProps) {
  const [ejemplosCargados, setEjemplosCargados] = useState(false)

  const loadExampleProducts = () => {
    const exampleWithIds: OnboardingProduct[] = EXAMPLE_PRODUCTS.map((p) => {
      const matchingCategory = categories.find(
        (c) => c.name.toLowerCase() === p.categoryId.toLowerCase()
      )
      return {
        ...p,
        id: crypto.randomUUID(),
        categoryId: matchingCategory?.id || '',
      }
    })
    onProductsChange(exampleWithIds)
    setEjemplosCargados(true)
  }

  const handleManualSelect = () => {
    if (products.length === 0 || ejemplosCargados) {
      onProductsChange([createEmptyProduct()])
    }
    setEjemplosCargados(false)
  }

  const updateProduct = (id: string, field: keyof OnboardingProduct, value: string) => {
    onProductsChange(products.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const addRow = () => {
    onProductsChange([...products, createEmptyProduct()])
  }

  const removeRow = (id: string) => {
    if (products.length > 1) {
      onProductsChange(products.filter((p) => p.id !== id))
    }
  }

  const validProducts = products.filter(
    (p) => p.name.trim() && p.categoryId && p.price && p.stock
  )

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl font-bold text-slate-900">
          Cargá tus productos
        </h2>
        <p className="text-slate-500 text-sm">
          Podés cargar productos de ejemplo para probar el sistema o agregar los tuyos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleManualSelect}
          className={`p-3.5 rounded-2xl border text-left transition-all group ${
            !ejemplosCargados
              ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <Plus className="w-5 h-5 text-slate-500 mb-1.5 group-hover:scale-110 transition-transform" />
          <div className="text-sm font-semibold text-slate-800">Agregar manual</div>
          <div className="text-[11px] text-slate-400">Crear uno a uno</div>
        </button>

        <button
          type="button"
          onClick={loadExampleProducts}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            ejemplosCargados
              ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <Sparkles className="w-5 h-5 text-blue-600 mb-1.5" />
          <div className="text-sm font-semibold text-slate-800">Cargar ejemplos</div>
          <div className="text-[11px] text-blue-600 font-semibold">8 productos listos</div>
        </button>
      </div>

      {ejemplosCargados && (
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 animate-fadeIn">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>8 Productos de ejemplo listos</span>
            <button
              onClick={() => setEjemplosCargados(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {products.map((prod) => {
              const cat = categories.find((c) => c.id === prod.categoryId)
              return (
                <div
                  key={prod.id}
                  className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100 text-xs"
                >
                  <span className="font-semibold text-slate-800">{prod.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium text-[11px]">
                      {cat?.name || ''}
                    </span>
                    <span className="font-bold text-slate-900">
                      ${Number(prod.price).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!ejemplosCargados && (
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Nombre *</label>
                <input
                  type="text"
                  placeholder="Producto"
                  value={product.name}
                  onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Categoría *</label>
                <select
                  value={product.categoryId}
                  onChange={(e) => updateProduct(product.id, 'categoryId', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Seleccionar</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Precio *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={product.price}
                  onChange={(e) => updateProduct(product.id, 'price', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="col-span-1">
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Stock *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={product.stock}
                  onChange={(e) => updateProduct(product.id, 'stock', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => removeRow(product.id)}
                  disabled={products.length === 1}
                  className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar fila
          </button>
        </div>
      )}

      {validProducts.length > 0 && !ejemplosCargados && (
        <div className="text-xs text-slate-500 text-center">
          {validProducts.length} producto{validProducts.length !== 1 ? 's' : ''} listo{validProducts.length !== 1 ? 's' : ''}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-all"
        >
          Volver
        </button>
        <button
          onClick={onNext}
          className="w-2/3 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
        >
          <span>Finalizar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
