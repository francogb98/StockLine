export interface OnboardingProduct {
  id: string
  name: string
  categoryId: string
  price: string
  cost: string
  stock: string
  minStock: string
  barcode: string
}

export interface OnboardingState {
  currentStep: number
  categories: { id: string; name: string; isCustom: boolean }[]
  products: OnboardingProduct[]
}

export const SUGGESTED_CATEGORIES = [
  'Bebidas',
  'Alimentos',
  'Limpieza',
  'Electrónica',
  'Ferretería',
  'Indumentaria',
  'Perfumería',
  'Librería',
  'Mascotas',
  'Hogar',
]

export const EXAMPLE_PRODUCTS: Omit<OnboardingProduct, 'id'>[] = [
  { name: 'Coca Cola 500ml', categoryId: 'bebidas', price: '1500', cost: '1000', stock: '50', minStock: '10', barcode: '' },
  { name: 'Sprite 500ml', categoryId: 'bebidas', price: '1500', cost: '1000', stock: '30', minStock: '10', barcode: '' },
  { name: 'Fanta 500ml', categoryId: 'bebidas', price: '1500', cost: '1000', stock: '25', minStock: '10', barcode: '' },
  { name: 'Galletitas Oreo', categoryId: 'alimentos', price: '2500', cost: '1800', stock: '40', minStock: '15', barcode: '' },
  { name: 'Arroz 1kg', categoryId: 'alimentos', price: '1800', cost: '1200', stock: '60', minStock: '20', barcode: '' },
  { name: 'Azúcar 1kg', categoryId: 'alimentos', price: '1200', cost: '800', stock: '45', minStock: '15', barcode: '' },
]

export function createEmptyProduct(): OnboardingProduct {
  return {
    id: crypto.randomUUID(),
    name: '',
    categoryId: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    barcode: '',
  }
}
