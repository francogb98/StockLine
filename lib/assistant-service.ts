import type { Product, Sale, Store, CashSession } from './types'

export interface AssistantAnswer {
  text: string
  action?: { label: string; view: string }
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function isToday(date: Date): boolean {
  const now = new Date()
  const d = new Date(date)
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function getTodaySales(sales: Sale[]): AssistantAnswer {
  const todaySales = sales.filter((s) => isToday(new Date(s.createdAt)))
  const total = todaySales.reduce((sum, s) => sum + s.total, 0)
  const count = todaySales.length
  const items = todaySales.reduce((sum, s) => sum + s.items.length, 0)
  const avg = count > 0 ? total / count : 0

  const text =
    count === 0
      ? 'Hoy no se registraron ventas todavía.'
      : `Hoy vendiste ${formatCurrency(total)} en total.\n\nSe vendieron ${items} productos en ${count} transacciones.\n\nEl ticket promedio fue de ${formatCurrency(avg)}.`

  return { text, action: { label: 'Ver Reportes', view: 'reports' } }
}

export function getLowStockProducts(products: Product[]): AssistantAnswer {
  const low = products.filter((p) => p.stock <= p.minStock)

  if (low.length === 0) {
    return { text: 'No hay productos con stock bajo. Todo en orden.' }
  }

  const list = low
    .map((p) => `• ${p.name}: ${p.stock} uds. (mín: ${p.minStock})`)
    .join('\n')

  return {
    text: `Hay ${low.length} producto${low.length !== 1 ? 's' : ''} con stock bajo:\n\n${list}`,
    action: { label: 'Ver Productos', view: 'add-product' },
  }
}

export function getProductStats(products: Product[]): AssistantAnswer {
  const total = products.length
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
  const avgPrice =
    total > 0
      ? products.reduce((sum, p) => sum + p.price, 0) / total
      : 0

  return {
    text: `Tenés ${total} producto${total !== 1 ? 's' : ''} cargados.\n\nStock total: ${totalStock} unidades.\nPrecio promedio: ${formatCurrency(avgPrice)}.`,
    action: { label: 'Agregar Producto', view: 'add-product' },
  }
}

export function getCashStatus(
  cashSession: { currentTotal: number; salesCount: number; openingAmount: number } | null,
): AssistantAnswer {
  if (!cashSession) {
    return {
      text: 'No hay una sesión de caja abierta en este momento.',
      action: { label: 'Ir a Caja', view: 'cash' },
    }
  }

  return {
    text: `Caja abierta:\n\n• Apertura: ${formatCurrency(cashSession.openingAmount)}\n• Total actual: ${formatCurrency(cashSession.currentTotal)}\n• Ventas registradas: ${cashSession.salesCount}`,
    action: { label: 'Ir a Caja', view: 'cash' },
  }
}

export function getStoreInfo(store: Store | null): AssistantAnswer {
  if (!store) {
    return { text: 'No hay información del negocio disponible.' }
  }

  return {
    text: `**${store.name}**\n\n${store.address ? `Dirección: ${store.address}\n` : ''}${store.phone ? `Teléfono: ${store.phone}` : ''}`,
    action: { label: 'Mi negocio', view: 'business' },
  }
}

export function getCategoryStats(
  categories: { id: string; name: string; _count?: { products: number } }[],
  products: Product[],
): AssistantAnswer {
  const count = categories.length
  const productCount = products.length

  return {
    text: `Tenés ${count} categoría${count !== 1 ? 's' : ''} y ${productCount} producto${productCount !== 1 ? 's' : ''}.\n\n${count > 0 ? 'Agrupás tus productos en categorías para mejor organización.' : 'Creá tu primera categoría desde el menú.'}`,
    action: { label: 'Ver Categorías', view: 'categories' },
  }
}

export function getTopProducts(products: Product[], sales: Sale[]): AssistantAnswer {
  const todaySales = sales.filter((s) => isToday(new Date(s.createdAt)))
  const productCount: Record<string, { name: string; qty: number }> = {}

  for (const sale of todaySales) {
    for (const item of sale.items) {
      if (!productCount[item.productId]) {
        productCount[item.productId] = { name: item.productName, qty: 0 }
      }
      productCount[item.productId].qty += item.quantity
    }
  }

  const sorted = Object.entries(productCount)
    .sort(([, a], [, b]) => b.qty - a.qty)
    .slice(0, 5)

  if (sorted.length === 0) {
    return { text: 'No hay ventas hoy para calcular productos más vendidos.' }
  }

  const list = sorted
    .map(([, v], i) => `${i + 1}. ${v.name} (${v.qty} uds.)`)
    .join('\n')

  return {
    text: `Productos más vendidos hoy:\n\n${list}`,
    action: { label: 'Ver Reportes', view: 'reports' },
  }
}

export function getUsersSummary(userCount: number): AssistantAnswer {
  return {
    text: `Actualmente hay ${userCount} usuario${userCount !== 1 ? 's' : ''} registrados en el sistema.`,
    action: { label: 'Ver Usuarios', view: 'users' },
  }
}

type IntentHandler = (
  text: string,
  data: AssistantContextData,
) => AssistantAnswer | null

interface AssistantContextData {
  sales: Sale[]
  products: Product[]
  categories: { id: string; name: string; _count?: { products: number } }[]
  store: Store | null
  cashSession: { currentTotal: number; salesCount: number; openingAmount: number } | null
  userCount: number
}

const INTENT_HANDLERS: IntentHandler[] = [
  (t) =>
    /vend[ií] hoy|ventas hoy|venta.*hoy|cuanto.*vend|total.*hoy/i.test(t)
      ? { text: '', action: undefined }
      : null,
  (t) =>
    /stock bajo|productos.*stock|sin stock|repone|faltante/i.test(t)
      ? { text: '', action: undefined }
      : null,
  (t) =>
    /producto|cantos producto|cu.*ntos producto|listar producto/i.test(t)
      ? { text: '', action: undefined }
      : null,
  (t) =>
    /caja|efectivo|cuanto.*caja|saldo.*caja/i.test(t)
      ? { text: '', action: undefined }
      : null,
  (t) =>
    /negocio|tienda|local|informaci.n/i.test(t)
      ? { text: '', action: undefined }
      : null,
  (t) =>
    /categor|cu.*ntas categor/i.test(t)
      ? { text: '', action: undefined }
      : null,
  (t) =>
    /m.s vendido|top|popular|qu.*.*vend|ranking/i.test(t)
      ? { text: '', action: undefined }
      : null,
  (t) =>
    /usuario|empleado|cuanta.*gente|vendedor/i.test(t)
      ? { text: '', action: undefined }
      : null,
]

const ANSWER_BUILDERS: Record<string, (data: AssistantContextData) => AssistantAnswer> = {
  'sales-today': (d) => getTodaySales(d.sales),
  'low-stock': (d) => getLowStockProducts(d.products),
  'product-stats': (d) => getProductStats(d.products),
  'cash-status': (d) => getCashStatus(d.cashSession),
  'store-info': (d) => getStoreInfo(d.store),
  'category-stats': (d) => getCategoryStats(d.categories, d.products),
  'top-products': (d) => getTopProducts(d.products, d.sales),
  'users-summary': (d) => getUsersSummary(d.userCount),
}

export function resolveAnswer(
  faqId: string,
  data: AssistantContextData,
): AssistantAnswer | null {
  const builder = ANSWER_BUILDERS[faqId]
  if (!builder) return null
  return builder(data)
}

export function processFreeText(
  input: string,
  data: AssistantContextData,
): AssistantAnswer {
  const text = input.trim()
  if (!text) {
    return { text: 'Escribí una pregunta para que pueda ayudarte.' }
  }

  const matchedIntents: string[] = []

  if (/vend[ií] hoy|ventas hoy|venta.*hoy|cuanto.*vend|total.*hoy/i.test(text))
    matchedIntents.push('sales-today')
  if (/stock bajo|productos.*stock|sin stock|repone|faltante/i.test(text))
    matchedIntents.push('low-stock')
  if (/producto|cantos producto|cu.*ntos producto|listar producto/i.test(text))
    matchedIntents.push('product-stats')
  if (/caja|efectivo|cuanto.*caja|saldo.*caja|apertura/i.test(text))
    matchedIntents.push('cash-status')
  if (/negocio|tienda|local|informaci.n|direcci.n/i.test(text))
    matchedIntents.push('store-info')
  if (/categor|cu.*ntas categor/i.test(text))
    matchedIntents.push('category-stats')
  if (/m.s vendido|top|popular|qu.*.*vend|ranking/i.test(text))
    matchedIntents.push('top-products')
  if (/usuario|empleado|cuanta.*gente|vendedor/i.test(text))
    matchedIntents.push('users-summary')

  if (matchedIntents.length === 0) {
    return {
      text: 'No entendí tu pregunta. Probá con:\n\n• ¿Cuánto vendí hoy?\n• ¿Hay productos con stock bajo?\n• ¿Cuántos productos tengo?\n• ¿Cómo está la caja?\n• ¿Cuáles son los más vendidos?',
    }
  }

  const answers = matchedIntents
    .map((id) => resolveAnswer(id, data))
    .filter(Boolean) as AssistantAnswer[]

  if (answers.length === 1) return answers[0]

  const combined = answers
    .map((a) => a.text)
    .join('\n\n---\n\n')

  const firstAction = answers.find((a) => a.action)?.action

  return { text: combined, action: firstAction }
}
