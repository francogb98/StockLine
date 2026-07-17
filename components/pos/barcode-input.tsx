'use client'

import React from "react"

import { useRef, useEffect, useState, useCallback } from 'react'
import { Search, Barcode } from 'lucide-react'
import { useData, usePOS } from '@/lib/store-context'
import { cn } from '@/lib/utils'

interface BarcodeInputProps {
  className?: string
}

export function BarcodeInput({ className }: BarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { getProductByBarcode, products } = useData()
  const { addToCart } = usePOS()

  // Keep input focused for barcode scanner only when nothing else demands focus
  useEffect(() => {
    const focusInput = () => {
      if (!inputRef.current) return;
      const active = document.activeElement;
      if (!active) { inputRef.current.focus(); return; }
      // Don't steal focus if user is in another input
      if (active.tagName === 'INPUT') return;
      // Don't steal focus if user is navigating via keyboard in a zone
      if (active.closest('[data-keyboard-zone]')) return;
      inputRef.current.focus()
    }
    
    const interval = setInterval(focusInput, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = useCallback((searchValue: string) => {
    const trimmedValue = searchValue.trim()
    if (!trimmedValue) return

    // First try exact barcode match
    let product = getProductByBarcode(trimmedValue)
    
    // If not found, try searching by name
    if (!product) {
      product = products.find(p => 
        p.name.toLowerCase().includes(trimmedValue.toLowerCase()) ||
        (p.barcode ?? "").includes(trimmedValue)
      )
    }

    if (product) {
      if (product.stock <= 0) {
        setError(`Sin stock: ${product.name}`)
        setTimeout(() => setError(null), 2000)
      } else {
        addToCart(product, 1)
        setError(null)
      }
    } else {
      setError('Producto no encontrado')
      setTimeout(() => setError(null), 2000)
    }

    setValue('')
  }, [getProductByBarcode, products, addToCart])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(value)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative flex items-center">
        <Barcode className="absolute left-3 h-5 w-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escanear código de barras o buscar producto..."
          className={cn(
            'h-14 w-full rounded-lg border-2 bg-card pl-11 pr-12 text-lg font-medium transition-colors',
            'placeholder:text-muted-foreground/60',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            error ? 'border-destructive' : 'border-input'
          )}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          onClick={() => handleSubmit(value)}
          className="absolute right-2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          type="button"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
      {error && (
        <p className="absolute -bottom-6 left-0 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
