import type { Store, User, Category, Product, Sale, SaleItem, CashSession, StockMovement } from './types'

const CLOUD = 'https://res.cloudinary.com/qfey9iwh/image/upload/v1'

// Demo Store — Kiosco de barrio
export const demoStore: Store = {
  id: 'store-1',
  name: 'Kiosco Don Carlos',
  address: 'Av. San Martín 1847, Lanús, Buenos Aires',
  phone: '+54 11 4234-5678',
  createdAt: new Date('2024-03-01'),
}

// Demo Users
export const demoUsers: User[] = [
  {
    id: 'user-1',
    storeId: 'store-1',
    email: 'admin@kioscocarlos.com',
    name: 'Carlos Dueño',
    role: 'admin',
    hasCompletedOnboarding: true,
    createdAt: new Date('2024-03-01'),
  },
  {
    id: 'user-2',
    storeId: 'store-1',
    email: 'maria@kioscocarlos.com',
    name: 'María Vendedora',
    role: 'employee',
    hasCompletedOnboarding: true,
    createdAt: new Date('2024-04-15'),
  },
]

// Demo Categories
export const demoCategories: Category[] = [
  { id: 'cat-1', storeId: 'store-1', name: 'Bebidas', description: 'Gaseosas, aguas y jugos' },
  { id: 'cat-2', storeId: 'store-1', name: 'Alimentos', description: 'Yerba, huevos, pan rallado' },
  { id: 'cat-3', storeId: 'store-1', name: 'Golosinas', description: 'Alfajores, chocolates, snacks' },
  { id: 'cat-4', storeId: 'store-1', name: 'Limpieza', description: 'Detergentes y limpieza del hogar' },
  { id: 'cat-5', storeId: 'store-1', name: 'Fiambres & Lácteos', description: 'Leche, fiambres y lácteos' },
  { id: 'cat-6', storeId: 'store-1', name: 'Panadería', description: 'Pan lactal y panadería' },
]

// Demo Products — Kiosco de barrio
export const demoProducts: Product[] = [
  {
    id: 'prod-1',
    storeId: 'store-1',
    barcode: '7790360001017',
    name: 'Coca Cola 500ml',
    description: 'Gaseosa Coca Cola botella 500ml',
    categoryId: 'cat-1',
    price: 1500,
    cost: 900,
    stock: 24,
    minStock: 6,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/coca-cola-500ml.jpg`,
    cloudinaryPublicId: 'products/coca-cola-500ml',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-2',
    storeId: 'store-1',
    barcode: '7790360001024',
    name: 'Sprite 500ml',
    description: 'Gaseosa Sprite botella 500ml',
    categoryId: 'cat-1',
    price: 1500,
    cost: 900,
    stock: 18,
    minStock: 6,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/sprite-500ml.jpg`,
    cloudinaryPublicId: 'products/sprite-500ml',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-3',
    storeId: 'store-1',
    barcode: '7790360001031',
    name: 'Fanta 500ml',
    description: 'Gaseosa Fanta naranja botella 500ml',
    categoryId: 'cat-1',
    price: 1500,
    cost: 900,
    stock: 12,
    minStock: 6,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/fanta-500ml.jpg`,
    cloudinaryPublicId: 'products/fanta-500ml',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-4',
    storeId: 'store-1',
    barcode: '7790360001048',
    name: 'Agua Villavicencio 500ml',
    description: 'Agua mineral sin gas 500ml',
    categoryId: 'cat-1',
    price: 800,
    cost: 450,
    stock: 30,
    minStock: 10,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/agua-villavicencio.jpg`,
    cloudinaryPublicId: 'products/agua-villavicencio',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-5',
    storeId: 'store-1',
    barcode: '7790360001055',
    name: 'Cepita Durazno 200ml',
    description: 'Jugo de durazno Cepita 200ml',
    categoryId: 'cat-1',
    price: 600,
    cost: 350,
    stock: 15,
    minStock: 5,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/cepita-durazno.jpg`,
    cloudinaryPublicId: 'products/cepita-durazno',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-6',
    storeId: 'store-1',
    barcode: '7790360001062',
    name: 'Alfajor Havanna x2',
    description: 'Alfajor Havanna dulce de leche x2 unidades',
    categoryId: 'cat-3',
    price: 1800,
    cost: 1100,
    stock: 20,
    minStock: 5,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/alfajor-havanna.jpg`,
    cloudinaryPublicId: 'products/alfajor-havanna',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-7',
    storeId: 'store-1',
    barcode: '7790360001079',
    name: 'Yerba Mate Rosamonte 500g',
    description: 'Yerba mate Rosamonte 500g',
    categoryId: 'cat-2',
    price: 3200,
    cost: 2200,
    stock: 10,
    minStock: 4,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/yerba-rosamonte.jpg`,
    cloudinaryPublicId: 'products/yerba-rosamonte',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-8',
    storeId: 'store-1',
    barcode: '7790360001086',
    name: 'Papas Lays Original 100g',
    description: 'Papas fritas Lays sabor original 100g',
    categoryId: 'cat-3',
    price: 2500,
    cost: 1500,
    stock: 15,
    minStock: 5,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/papas-lays.jpg`,
    cloudinaryPublicId: 'products/papas-lays',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-9',
    storeId: 'store-1',
    barcode: '7790360001093',
    name: 'Oreo Pack 118g',
    description: 'Galletitas Oreo paquete 118g',
    categoryId: 'cat-3',
    price: 2200,
    cost: 1300,
    stock: 12,
    minStock: 4,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/oreo-pack.jpg`,
    cloudinaryPublicId: 'products/oreo-pack',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-10',
    storeId: 'store-1',
    barcode: '7790360001109',
    name: 'Chocolate Milka 100g',
    description: 'Chocolate con leche Milka 100g',
    categoryId: 'cat-3',
    price: 2800,
    cost: 1700,
    stock: 8,
    minStock: 3,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/chocolate-milka.jpg`,
    cloudinaryPublicId: 'products/chocolate-milka',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-11',
    storeId: 'store-1',
    barcode: '7790360001116',
    name: 'Pan Lactal Bimbo 500g',
    description: 'Pan de molde Bimbo original 500g',
    categoryId: 'cat-6',
    price: 2600,
    cost: 1600,
    stock: 6,
    minStock: 3,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/pan-lactal-bimbo.jpg`,
    cloudinaryPublicId: 'products/pan-lactal-bimbo',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-12',
    storeId: 'store-1',
    barcode: '7790360001123',
    name: 'Leche La Serenísima 1L',
    description: 'Leche entera La Serenísima 1 litro',
    categoryId: 'cat-5',
    price: 1400,
    cost: 950,
    stock: 10,
    minStock: 4,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/leche-serenisima.jpg`,
    cloudinaryPublicId: 'products/leche-serenisima',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-13',
    storeId: 'store-1',
    barcode: '7790360001130',
    name: 'Huevos x12',
    description: 'Maple de huevos docena',
    categoryId: 'cat-2',
    price: 3500,
    cost: 2500,
    stock: 8,
    minStock: 3,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/huevos-x12.jpg`,
    cloudinaryPublicId: 'products/huevos-x12',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-14',
    storeId: 'store-1',
    barcode: '7790360001147',
    name: 'Detergente Magistral 500ml',
    description: 'Detergente para platos Magistral 500ml',
    categoryId: 'cat-4',
    price: 1800,
    cost: 1100,
    stock: 10,
    minStock: 4,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/detergente-magistral.jpg`,
    cloudinaryPublicId: 'products/detergente-magistral',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'prod-15',
    storeId: 'store-1',
    barcode: '7790360001154',
    name: 'Pan Rallado Favorita 200g',
    description: 'Pan rallado Favorita 200g',
    categoryId: 'cat-2',
    price: 900,
    cost: 500,
    stock: 14,
    minStock: 5,
    quantityType: 'DISCRETA',
    unit: 'unit',
    presentations: [],
    imageUrl: `${CLOUD}/products/pan-rallado-favorita.jpg`,
    cloudinaryPublicId: 'products/pan-rallado-favorita',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
]

// Generate mock sales — realistic for a small kiosco
function generateMockSales(): Sale[] {
  const sales: Sale[] = []
  const now = new Date()

  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const salesCount = Math.floor(Math.random() * 11) + 10 // 10-20 sales per day

    for (let i = 0; i < salesCount; i++) {
      const saleDate = new Date(now)
      saleDate.setDate(saleDate.getDate() - dayOffset)
      saleDate.setHours(Math.floor(Math.random() * 12) + 9) // 9am to 9pm
      saleDate.setMinutes(Math.floor(Math.random() * 60))

      const itemCount = Math.floor(Math.random() * 3) + 1 // 1-3 items per sale
      const items: SaleItem[] = []
      let subtotal = 0

      const usedProducts = new Set<string>()

      for (let j = 0; j < itemCount; j++) {
        let product: Product
        do {
          product = demoProducts[Math.floor(Math.random() * demoProducts.length)]
        } while (usedProducts.has(product.id))

        usedProducts.add(product.id)

        const quantity = Math.floor(Math.random() * 3) + 1 // 1-3 units
        const itemTotal = product.price * quantity
        subtotal += itemTotal

        items.push({
          id: `sale-item-${sales.length}-${j}`,
          saleId: `sale-${sales.length}`,
          productId: product.id,
          productName: product.name,
          quantity,
          unitPrice: product.price,
          total: itemTotal,
        })
      }

      const tax = 0
      const total = subtotal

      // Kiosco payment distribution: mostly cash
      const roll = Math.random()
      let paymentMethod: 'cash' | 'card' | 'transfer'
      if (roll < 0.60) {
        paymentMethod = 'cash'
      } else if (roll < 0.85) {
        paymentMethod = 'transfer'
      } else {
        paymentMethod = 'card'
      }

      sales.push({
        id: `sale-${sales.length}`,
        storeId: 'store-1',
        userId: Math.random() > 0.5 ? 'user-1' : 'user-2',
        cashSessionId: dayOffset < 2 ? 'cs-1' : 'cs-2',
        items,
        subtotal,
        tax,
        total,
        paymentMethod,
        status: "completed",
        createdAt: saleDate,
      })
    }
  }

  return sales.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export const demoSales: Sale[] = generateMockSales()

export const demoCashSessions: CashSession[] = [
  {
    id: 'cs-1',
    storeId: 'store-1',
    userId: 'user-1',
    userName: 'Carlos Dueño',
    openingAmount: 15000,
    expectedAmount: 47800,
    closingAmount: 47500,
    difference: -300,
    notes: 'Cierre turno mañana — faltó cobrar una gaseosa',
    closedAt: new Date('2024-12-01T13:00:00'),
    createdAt: new Date('2024-12-01T08:00:00'),
  },
  {
    id: 'cs-2',
    storeId: 'store-1',
    userId: 'user-2',
    userName: 'María Vendedora',
    openingAmount: 15000,
    expectedAmount: 53200,
    closingAmount: 53200,
    difference: 0,
    notes: 'Cierre turno tarde — cuadra perfecto',
    closedAt: new Date('2024-12-01T20:00:00'),
    createdAt: new Date('2024-12-01T13:30:00'),
  },
]

export const demoStockMovements: StockMovement[] = [
  {
    id: 'sm-1',
    storeId: 'store-1',
    productId: 'prod-1',
    userId: 'user-1',
    userName: 'Carlos Dueño',
    type: 'PRODUCT_CREATION',
    quantity: 24,
    previousStock: 0,
    newStock: 24,
    referenceId: null,
    reason: 'Carga inicial de stock',
    createdAt: new Date('2024-03-05'),
  },
  {
    id: 'sm-2',
    storeId: 'store-1',
    productId: 'prod-1',
    userId: 'user-2',
    userName: 'María Vendedora',
    type: 'SALE',
    quantity: -2,
    previousStock: 24,
    newStock: 22,
    referenceId: 'sale-1',
    reason: null,
    createdAt: new Date('2024-12-01T10:00:00'),
  },
  {
    id: 'sm-3',
    storeId: 'store-1',
    productId: 'prod-1',
    userId: 'user-1',
    userName: 'Carlos Dueño',
    type: 'STOCK_CORRECTION',
    quantity: 2,
    previousStock: 22,
    newStock: 24,
    referenceId: null,
    reason: 'Ajuste por mercadería que no se registró',
    createdAt: new Date('2024-12-05'),
  },
]

// Helper to format currency (ARS)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount)
}

// Helper to format date
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

// Helper to format time only
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeStyle: 'short',
  }).format(date)
}

// Helper to format date + time
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date))
}
