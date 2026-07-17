'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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
}

export function CategoryStep({ categories, onCategoriesChange, onNext }: CategoryStepProps) {
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const toggleSuggestedCategory = (name: string) => {
    const exists = categories.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (exists) {
      onCategoriesChange(categories.filter((c) => c.id !== exists.id))
    } else {
      onCategoriesChange([...categories, { id: crypto.randomUUID(), name, isCustom: false }])
    }
  }

  const addCustomCategory = () => {
    if (customCategory.trim() && !categories.find((c) => c.name.toLowerCase() === customCategory.toLowerCase())) {
      onCategoriesChange([...categories, { id: crypto.randomUUID(), name: customCategory.trim(), isCustom: true }])
      setCustomCategory('')
      setShowCustomInput(false)
    }
  }

  const removeCategory = (id: string) => {
    onCategoriesChange(categories.filter((c) => c.id !== id))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomCategory()
    }
  }

  const isSelected = (name: string) => categories.some((c) => c.name.toLowerCase() === name.toLowerCase())
  const canContinue = categories.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4"
        >
          <Tag className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground text-balance">
          Creá tus categorías
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto text-balance">
          Las categorías te ayudan a organizar tus productos y encontrarlos más rápido.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Categorías sugeridas</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_CATEGORIES.map((name, index) => (
              <motion.button
                key={name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => toggleSuggestedCategory(name)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                  'border hover:shadow-sm',
                  isSelected(name)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:border-primary/50'
                )}
              >
                {name}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">Categorías personalizadas</p>
            {!showCustomInput && (
              <Button variant="ghost" size="sm" onClick={() => setShowCustomInput(true)} className="text-primary hover:text-primary/80">
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            )}
          </div>

          <AnimatePresence>
            {showCustomInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 mb-4"
              >
                <Input
                  placeholder="Nombre de la categoría"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  onKeyDown={handleKeyPress}
                  autoFocus
                  className="flex-1"
                />
                <Button onClick={addCustomCategory} disabled={!customCategory.trim()}>
                  Agregar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomCategory('')
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {categories.filter((c) => c.isCustom).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.filter((c) => c.isCustom).map((category) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Badge variant="secondary" className="pl-3 pr-1 py-1.5 gap-1">
                    {category.name}
                    <button
                      onClick={() => removeCategory(category.id)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continuar
        </Button>
      </div>
    </motion.div>
  )
}
