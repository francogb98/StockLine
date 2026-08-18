'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { StepIndicator } from './step-indicator'
import { CompanyStep } from './company-step'
import { CategoryStep } from './category-step'
import { ProductStep } from './product-step'
import { CompletionStep } from './completion-step'
import { type OnboardingProduct, createEmptyProduct } from '@/lib/types/onboarding'

const STEPS = [
  { label: 'Empresa' },
  { label: 'Categorías' },
  { label: 'Productos' },
  { label: 'Finalizar' },
]

interface OnboardingWizardProps {
  initialStoreName?: string
  onComplete: () => void
  onDismiss?: () => void
}

export function OnboardingWizard({ initialStoreName = '', onComplete, onDismiss }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [storeName, setStoreName] = useState(initialStoreName)
  const [categories, setCategories] = useState<{ id: string; name: string; isCustom: boolean }[]>([])
  const [products, setProducts] = useState<OnboardingProduct[]>([createEmptyProduct()])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const saveState = useCallback(async (step: number, name: string, cats: typeof categories, prods: OnboardingProduct[]) => {
    setIsSaving(true)
    try {
      await fetch('/api/onboarding/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStep: step,
          draftOnboardingState: { storeName: name, categories: cats, products: prods },
        }),
      })
    } catch (error) {
      console.error('Error saving onboarding state:', error)
    } finally {
      setIsSaving(false)
    }
  }, [])

  useEffect(() => {
    async function loadState() {
      try {
        const res = await fetch('/api/onboarding/state')
        if (res.ok) {
          const data = await res.json()
          if (data.draftOnboardingState) {
            const restored = data.draftOnboardingState as {
              storeName?: string
              categories: typeof categories
              products: OnboardingProduct[]
            }
            if (restored.storeName) setStoreName(restored.storeName)
            setCategories(restored.categories || [])
            setProducts(restored.products?.length > 0 ? restored.products : [createEmptyProduct()])
            setCurrentStep(data.currentStep ?? 1)
          }
        }
      } catch (error) {
        console.error('Error loading onboarding state:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadState()
  }, [])

  useEffect(() => {
    if (!isLoading) {
      saveState(currentStep, storeName, categories, products)
    }
  }, [currentStep, storeName, categories, products, isLoading, saveState])

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsSaving(true)
    try {
      const validProducts = products.filter(
        (p) => p.name.trim() && p.categoryId && p.price && p.stock
      )

      const productCategoryMap: Record<string, string> = {}
      for (const cat of categories) {
        productCategoryMap[cat.id] = cat.name
      }

      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          categories: categories.map((c) => ({ name: c.name })),
          products: validProducts.map((p) => ({
            name: p.name,
            categoryId: p.categoryId,
            price: parseFloat(p.price) || 0,
            cost: parseFloat(p.cost) || 0,
            stock: parseInt(p.stock) || 0,
            minStock: parseInt(p.minStock) || 0,
            barcode: p.barcode || undefined,
          })),
          productCategoryMap,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        let errData: Record<string, unknown> | null = null
        try {
          errData = JSON.parse(text)
        } catch {
          errData = null
        }
        console.error(
          `Onboarding complete failed: ${res.status} ${res.statusText}`,
          errData || text,
        )
        setIsSaving(false)
        return
      }

      setTimeout(() => {
        onComplete()
      }, 300)
    } catch (error) {
      console.error('Error completing onboarding:', error)
      setIsSaving(false)
    }
  }

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss()
    }
  }

  if (isLoading) {
    return <LoadingScreen messages={['Cargando configuración guardada...']} />
  }

  return (
    <div className="min-h-screen bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 relative font-sans">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 border border-slate-100 relative overflow-hidden transition-all">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              S
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-base leading-none">StockLine</h1>
              <span className="text-[11px] text-slate-400 font-medium">Configuración inicial</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-[10px] text-slate-400 font-medium">Guardando...</span>
            )}
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Paso {currentStep} de 4
            </span>
            {onDismiss && currentStep < 4 && (
              <button
                onClick={handleDismiss}
                disabled={isSaving}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <StepIndicator currentStep={currentStep} steps={STEPS} />

        {currentStep === 1 && (
          <CompanyStep
            storeName={storeName}
            onStoreNameChange={setStoreName}
            onNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <CategoryStep
            categories={categories}
            onCategoriesChange={setCategories}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <ProductStep
            categories={categories}
            products={products}
            onProductsChange={setProducts}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && (
          <CompletionStep
            storeName={storeName}
            categories={categories}
            products={products}
            onGoToPanel={handleComplete}
          />
        )}
      </div>
    </div>
  )
}
