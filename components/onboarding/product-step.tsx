'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Package, Sparkles, ArrowRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { OnboardingProduct, EXAMPLE_PRODUCTS, createEmptyProduct } from '@/lib/types/onboarding'

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
  const [activeTab, setActiveTab] = useState<'manual' | 'example' | null>(null)
  const lastInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (products.length === 0) {
      onProductsChange([createEmptyProduct()])
    }
  }, [])

  const updateProduct = (id: string, field: keyof OnboardingProduct, value: string) => {
    onProductsChange(
      products.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const addRow = () => {
    onProductsChange([...products, createEmptyProduct()])
    setTimeout(() => lastInputRef.current?.focus(), 100)
  }

  const removeRow = (id: string) => {
    if (products.length > 1) {
      onProductsChange(products.filter((p) => p.id !== id))
    }
  }

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
    setActiveTab(null)
  }

  const validProducts = products.filter(
    (p) => p.name.trim() && p.categoryId && p.price && p.stock
  )

  const canContinue = validProducts.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4"
        >
          <Package className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground text-balance">
          Cargá tus productos
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto text-balance">
          Agregá los productos que vendés. Podés cargarlos manualmente o usar ejemplos.
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        <Button
          variant={activeTab === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab(activeTab === 'manual' ? null : 'manual')}
        >
          <Plus className="w-4 h-4 mr-1" />
          Agregar manual
        </Button>
        <Button
          variant={activeTab === 'example' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            if (activeTab === 'example') {
              setActiveTab(null)
            } else {
              loadExampleProducts()
            }
          }}
        >
          <Sparkles className="w-4 h-4 mr-1" />
          Cargar ejemplos
        </Button>
      </div>

      <AnimatePresence>
        {activeTab === 'manual' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border rounded-lg p-4 space-y-4">
              {products.map((product, index) => (
                <div key={product.id} className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Nombre *</label>
                    <Input
                      ref={index === products.length - 1 ? lastInputRef : undefined}
                      placeholder="Producto"
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Categoría *</label>
                    <select
                      value={product.categoryId}
                      onChange={(e) => updateProduct(product.id, 'categoryId', e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="">Seleccionar</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Precio *</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={product.price}
                      onChange={(e) => updateProduct(product.id, 'price', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Stock *</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={product.stock}
                      onChange={(e) => updateProduct(product.id, 'stock', e.target.value)}
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(product.id)}
                      disabled={products.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar fila
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {products.length > 0 && validProducts.length > 0 && (
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-3">
            {validProducts.length} producto{validProducts.length !== 1 ? 's' : ''} listo{validProducts.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {validProducts.map((p) => {
              const cat = categories.find((c) => c.id === p.categoryId)
              return (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{p.name}</span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{cat?.name}</span>
                    <span>${p.price}</span>
                    <span>×{p.stock}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continuar
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  )
}
