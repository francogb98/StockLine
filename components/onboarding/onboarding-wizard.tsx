'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { Button } from '@/components/ui/button'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { StepIndicator } from './step-indicator'
import { CategoryStep } from './category-step'
import { ProductStep } from './product-step'
import { CompletionStep } from './completion-step'
import { type OnboardingProduct, createEmptyProduct } from '@/lib/types/onboarding'

const STEPS = [
  { label: 'Categorías' },
  { label: 'Productos' },
  { label: 'Finalizar' },
]

interface OnboardingWizardProps {
  onComplete: () => void
  onDismiss?: () => void
}

export function OnboardingWizard({ onComplete, onDismiss }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [categories, setCategories] = useState<{ id: string; name: string; isCustom: boolean }[]>([])
  const [products, setProducts] = useState<OnboardingProduct[]>([createEmptyProduct()])
  const [isExiting, setIsExiting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const saveState = useCallback(async (step: number, cats: typeof categories, prods: OnboardingProduct[]) => {
    setIsSaving(true)
    try {
      await fetch('/api/onboarding/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStep: step,
          draftOnboardingState: { categories: cats, products: prods },
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
            const restored = data.draftOnboardingState as { categories: typeof categories; products: OnboardingProduct[] }
            setCategories(restored.categories || [])
            setProducts(restored.products?.length > 0 ? restored.products : [createEmptyProduct()])
            setCurrentStep(data.currentStep ?? 0)
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
      saveState(currentStep, categories, products)
    }
  }, [currentStep, categories, products, isLoading, saveState])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsExiting(true)
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
        setIsExiting(false)
        setIsSaving(false)
        return
      }

      setTimeout(() => {
        onComplete()
      }, 300)
    } catch (error) {
      console.error('Error completing onboarding:', error)
      setIsExiting(false)
      setIsSaving(false)
    }
  }

  const handleAddMoreProducts = () => {
    setCurrentStep(1)
  }

  const handleDismiss = () => {
    if (onDismiss) {
      setIsExiting(true)
      setTimeout(() => {
        onDismiss()
      }, 300)
    }
  }

  if (isLoading) {
    return <LoadingScreen messages={["Cargando configuración guardada..."]} />
  }

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl"
          >
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BrandLogo showText={false} className="h-7 w-7" />
                  <div>
                    <h1 className="font-semibold text-foreground">StockLine</h1>
                    <p className="text-xs text-muted-foreground">
                      Configuración inicial
                    </p>
                  </div>
                </div>
                {onDismiss && currentStep < 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    disabled={isSaving}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {currentStep === 0 && (
                <div className="text-center mb-8">
                  <motion.h2
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl sm:text-2xl font-semibold text-foreground mb-2"
                  >
                    Bienvenido a tu tienda
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-muted-foreground"
                  >
                    Vamos a configurar tu catálogo para que puedas comenzar a
                    vender y controlar tu stock.
                  </motion.p>
                </div>
              )}

              <StepIndicator currentStep={currentStep} steps={STEPS} />

              <AnimatePresence mode="wait">
                {currentStep === 0 && (
                  <CategoryStep
                    key="categories"
                    categories={categories}
                    onCategoriesChange={setCategories}
                    onNext={handleNext}
                  />
                )}
                {currentStep === 1 && (
                  <ProductStep
                    key="products"
                    categories={categories}
                    products={products}
                    onProductsChange={setProducts}
                    onNext={handleNext}
                    onBack={handleBack}
                  />
                )}
                {currentStep === 2 && (
                  <CompletionStep
                    key="completion"
                    categories={categories}
                    products={products}
                    onGoToPanel={handleComplete}
                    onAddMoreProducts={handleAddMoreProducts}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
