import type { Store, User, Category, Product, Sale, SaleItem, CashSession, StockMovement } from './types'

// Demo Store
export const demoStore: Store = {
  id: 'store-1',
  name: 'TechMart Store',
  address: 'Av. Corrientes 1234, CABA',
  phone: '+54 11 1234-5678',
  createdAt: new Date('2024-01-01'),
}

// Demo Users
export const demoUsers: User[] = [
  {
    id: 'user-1',
    storeId: 'store-1',
    email: 'admin@techmart.com',
    name: 'Carlos Administrador',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'user-2',
    storeId: 'store-1',
    email: 'empleado@techmart.com',
    name: 'María Vendedora',
    role: 'employee',
    createdAt: new Date('2024-01-15'),
  },
]

// Demo Categories
export const demoCategories: Category[] = [
  { id: 'cat-1', storeId: 'store-1', name: 'Electrónica', description: 'Dispositivos electrónicos' },
  { id: 'cat-2', storeId: 'store-1', name: 'Accesorios', description: 'Accesorios y periféricos' },
  { id: 'cat-3', storeId: 'store-1', name: 'Audio', description: 'Equipos de audio' },
  { id: 'cat-4', storeId: 'store-1', name: 'Gaming', description: 'Productos gaming' },
  { id: 'cat-5', storeId: 'store-1', name: 'Cables', description: 'Cables y conectores' },
]

// Demo Products with realistic barcodes
export const demoProducts: Product[] = [
  {
    id: 'prod-1',
    storeId: 'store-1',
    barcode: '7790001000011',
    name: 'Mouse Inalámbrico Logitech M170',
    description: 'Mouse inalámbrico compacto',
    categoryId: 'cat-2',
    price: 15000,
    cost: 9000,
    stock: 25,
    minStock: 5,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-2',
    storeId: 'store-1',
    barcode: '7790001000028',
    name: 'Teclado USB Genius KB-116',
    description: 'Teclado USB español',
    categoryId: 'cat-2',
    price: 12000,
    cost: 7000,
    stock: 18,
    minStock: 5,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-3',
    storeId: 'store-1',
    barcode: '7790001000035',
    name: 'Auriculares JBL Tune 510BT',
    description: 'Auriculares Bluetooth on-ear',
    categoryId: 'cat-3',
    price: 45000,
    cost: 28000,
    stock: 8,
    minStock: 3,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-4',
    storeId: 'store-1',
    barcode: '7790001000042',
    name: 'Pendrive Kingston 32GB USB 3.0',
    description: 'Memoria USB de alta velocidad',
    categoryId: 'cat-1',
    price: 8500,
    cost: 5000,
    stock: 45,
    minStock: 10,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-5',
    storeId: 'store-1',
    barcode: '7790001000059',
    name: 'Cable HDMI 2.0 1.5m',
    description: 'Cable HDMI alta definición',
    categoryId: 'cat-5',
    price: 5500,
    cost: 2500,
    stock: 30,
    minStock: 10,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-6',
    storeId: 'store-1',
    barcode: '7790001000066',
    name: 'Cargador USB-C 20W',
    description: 'Cargador rápido USB-C',
    categoryId: 'cat-2',
    price: 9500,
    cost: 5500,
    stock: 22,
    minStock: 8,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-7',
    storeId: 'store-1',
    barcode: '7790001000073',
    name: 'Parlante Bluetooth JBL Go 3',
    description: 'Parlante portátil resistente al agua',
    categoryId: 'cat-3',
    price: 38000,
    cost: 24000,
    stock: 2,
    minStock: 3,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-8',
    storeId: 'store-1',
    barcode: '7790001000080',
    name: 'Gamepad USB para PC',
    description: 'Control USB compatible con PC',
    categoryId: 'cat-4',
    price: 18000,
    cost: 11000,
    stock: 12,
    minStock: 4,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-9',
    storeId: 'store-1',
    barcode: '7790001000097',
    name: 'Webcam HD 720p',
    description: 'Cámara web con micrófono',
    categoryId: 'cat-1',
    price: 22000,
    cost: 13000,
    stock: 1,
    minStock: 3,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-10',
    storeId: 'store-1',
    barcode: '7790001000104',
    name: 'Cable USB-C a USB-C 1m',
    description: 'Cable de carga y datos',
    categoryId: 'cat-5',
    price: 4500,
    cost: 2000,
    stock: 50,
    minStock: 15,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-11',
    storeId: 'store-1',
    barcode: '7790001000111',
    name: 'Mouse Pad Gamer XL',
    description: 'Mouse pad grande antideslizante',
    categoryId: 'cat-4',
    price: 7500,
    cost: 3500,
    stock: 20,
    minStock: 5,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-12',
    storeId: 'store-1',
    barcode: '7790001000128',
    name: 'Hub USB 4 Puertos',
    description: 'Hub USB 3.0 compacto',
    categoryId: 'cat-2',
    price: 11000,
    cost: 6500,
    stock: 0,
    minStock: 5,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
]

// Generate mock sales for the last 7 days
function generateMockSales(): Sale[] {
  const sales: Sale[] = []
  const now = new Date()
  
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const salesCount = Math.floor(Math.random() * 15) + 8 // 8-22 sales per day
    
    for (let i = 0; i < salesCount; i++) {
      const saleDate = new Date(now)
      saleDate.setDate(saleDate.getDate() - dayOffset)
      saleDate.setHours(Math.floor(Math.random() * 12) + 9) // 9am to 9pm
      saleDate.setMinutes(Math.floor(Math.random() * 60))
      
      const itemCount = Math.floor(Math.random() * 4) + 1 // 1-4 items per sale
      const items: SaleItem[] = []
      let subtotal = 0
      
      const usedProducts = new Set<string>()
      
      for (let j = 0; j < itemCount; j++) {
        let product: Product
        do {
          product = demoProducts[Math.floor(Math.random() * demoProducts.length)]
        } while (usedProducts.has(product.id))
        
        usedProducts.add(product.id)
        
        const quantity = Math.floor(Math.random() * 3) + 1
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
      
      const paymentMethods: ('cash' | 'card' | 'transfer')[] = ['cash', 'card', 'transfer']
      
      sales.push({
        id: `sale-${sales.length}`,
        storeId: 'store-1',
        userId: Math.random() > 0.5 ? 'user-1' : 'user-2',
        cashSessionId: dayOffset < 2 ? 'cs-1' : 'cs-2',
        items,
        subtotal,
        tax,
        total,
        paymentMethod: paymentMethods[Math.floor(Math.random() * 3)],
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
    userName: 'Carlos Administrador',
    openingAmount: 50000,
    expectedAmount: 185000,
    closingAmount: 185500,
    difference: 500,
    notes: 'Cierre turno mañana',
    closedAt: new Date('2024-12-01T13:00:00'),
    createdAt: new Date('2024-12-01T08:00:00'),
  },
  {
    id: 'cs-2',
    storeId: 'store-1',
    userId: 'user-2',
    userName: 'María Vendedora',
    openingAmount: 50000,
    expectedAmount: 210000,
    closingAmount: 210000,
    difference: 0,
    notes: 'Cierre turno tarde',
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
    userName: 'Carlos Administrador',
    type: 'PRODUCT_CREATION',
    quantity: 25,
    previousStock: 0,
    newStock: 25,
    referenceId: null,
    reason: 'Creación inicial',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'sm-2',
    storeId: 'store-1',
    productId: 'prod-1',
    userId: 'user-2',
    userName: 'María Vendedora',
    type: 'SALE',
    quantity: -2,
    previousStock: 25,
    newStock: 23,
    referenceId: 'sale-1',
    reason: null,
    createdAt: new Date('2024-12-01T10:00:00'),
  },
  {
    id: 'sm-3',
    storeId: 'store-1',
    productId: 'prod-1',
    userId: 'user-1',
    userName: 'Carlos Administrador',
    type: 'STOCK_CORRECTION',
    quantity: 5,
    previousStock: 23,
    newStock: 28,
    referenceId: null,
    reason: 'Ajuste por inventario',
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
