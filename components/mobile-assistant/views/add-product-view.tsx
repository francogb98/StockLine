'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { PackagePlus, Check, Hash, Barcode, ChevronDown } from 'lucide-react'
import { staggerContainer } from '../animation-variants'
import { useData } from '@/lib/store-context'
import { unitsForQuantityType, type QuantityType } from '@/lib/types'
import { formatUnitLabel } from '@/lib/utils'

const inputClass =
  'w-full rounded-xl border bg-background py-2.5 px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/30 focus:ring-1 focus:ring-primary/20'

const labelClass = 'block text-xs font-medium text-muted-foreground mb-1.5'

export function AddProductView() {
  const { categories, addProduct } = useData()

  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [stock, setStock] = useState('')
  const [minStock, setMinStock] = useState('')
  const [quantityType, setQuantityType] = useState<QuantityType>('DISCRETA')
  const [unit, setUnit] = useState<string>('unit')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  )

  const unitOptions = unitsForQuantityType(quantityType)

  const resetForm = () => {
    setName(''); setBarcode(''); setCategoryId('')
    setPrice(''); setCost(''); setStock(''); setMinStock('')
    setQuantityType('DISCRETA')
    setUnit('unit')
    setError('')
  }

  const handleQuantityTypeChange = (value: QuantityType) => {
    setQuantityType(value)
    const allowed = unitsForQuantityType(value)
    if (!allowed.includes(unit as never)) {
      setUnit(allowed[0])
    }
  }

  const handleSubmit = () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!categoryId) { setError('Seleccioná una categoría'); return }

    const priceNum = parseFloat(price.replace(',', '.'))
    const costNum = parseFloat(cost.replace(',', '.')) || 0
    const stockNum = parseFloat(stock.replace(',', '.')) || 0
    const minStockNum = parseFloat(minStock.replace(',', '.')) || 0

    if (isNaN(priceNum) || priceNum < 0) { setError('Ingresá un precio válido'); return }

    addProduct({
      name: name.trim(),
      barcode: barcode.trim() || null,
      description: null,
      categoryId,
      price: priceNum,
      cost: costNum,
      stock: stockNum,
      minStock: minStockNum,
      quantityType,
      unit,
      presentations: [],
    } as never)

    setDone(true)
    setTimeout(() => { setDone(false); resetForm() }, 2000)
  }

  if (done) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center px-5 py-20"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-lg font-semibold text-foreground">Producto creado</p>
        <p className="text-sm text-muted-foreground mt-1">{name}</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4 px-5 py-4"
    >
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <PackagePlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Nuevo producto</h3>
            <p className="text-xs text-muted-foreground">Completá los datos del producto</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className={labelClass}>Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Café con leche"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Código de barras (opcional)</label>
            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Ej: 7791234567890"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          <div className="relative">
            <label className={labelClass}>Categoría</label>
            <button
              type="button"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className={`${inputClass} flex items-center justify-between text-left ${!selectedCategory ? 'text-muted-foreground/60' : ''}`}
            >
              <span>{selectedCategory ? selectedCategory.name : 'Seleccionar categoría'}</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
            </button>
            {showCategoryPicker && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg"
              >
                {categories.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No hay categorías disponibles
                  </p>
                ) : (
                  categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setCategoryId(cat.id); setShowCategoryPicker(false) }}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${cat.id === categoryId ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground'}`}
                    >
                      {cat.name}
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </div>

          {/* Quantity type + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tipo de cantidad</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleQuantityTypeChange('DISCRETA')}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    quantityType === 'DISCRETA'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Discreta
                </button>
                <button
                  type="button"
                  onClick={() => handleQuantityTypeChange('CONTINUA')}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    quantityType === 'CONTINUA'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Continua
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Unidad base</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={inputClass}
              >
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {formatUnitLabel(u)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Precio venta</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Costo</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="text"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0,00"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Stock inicial {quantityType === 'CONTINUA' && `(${formatUnitLabel(unit)})`}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder={quantityType === 'CONTINUA' ? '0,000' : '0'}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Stock mínimo {quantityType === 'CONTINUA' && `(${formatUnitLabel(unit)})`}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder={quantityType === 'CONTINUA' ? '0,000' : '0'}
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground"
          >
            <PackagePlus className="h-4 w-4" />
            Crear producto
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}