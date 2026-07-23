import type { FAQItem } from './types'

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'sales-today',
    question: '¿Cuánto vendí hoy?',
    answer:
      'Hoy vendiste $7.450,00 en total.\n\nSe vendieron 48 productos en 32 transacciones.\n\nEl ticket promedio fue de $155,00.',
    action: { label: 'Ver Reportes', view: 'reports' },
  },
  {
    id: 'add-product',
    question: '¿Cómo agrego un producto?',
    answer:
      'Para agregar un producto nuevo:\n\n1. Andá a Agregar Producto desde el menú\n2. Completá los datos del producto (nombre, precio, categoría)\n3. Opcional: agregá código de barras y stock inicial\n4. Tocá Guardar producto\n\n¡Listo! El producto ya estará disponible en el POS.',
    action: { label: 'Agregar Producto', view: 'add-product' },
  },
  {
    id: 'close-cash',
    question: '¿Cómo cierro la caja?',
    answer:
      'Para cerrar la caja del día:\n\n1. Andá a Caja desde el menú\n2. Verificá que todas las ventas estén registradas\n3. Tocá Cerrar caja\n4. Confirmá el monto final\n\nLa caja quedará cerrada y se generará un resumen.',
    action: { label: 'Ir a Caja', view: 'cash' },
  },
  {
    id: 'returns',
    question: '¿Cómo hago una devolución?',
    answer:
      'Para hacer una devolución:\n\n1. Andá a Reportes y buscá la venta\n2. Tocá la venta para ver el detalle\n3. Seleccioná Devolver\n4. Elegí los productos a devolver\n5. Confirmá la devolución\n\nEl stock se actualizará automáticamente.',
    action: { label: 'Ver Reportes', view: 'reports' },
  },
  {
    id: 'change-price',
    question: '¿Cómo cambio el precio de un producto?',
    answer:
      'Para cambiar el precio de un producto:\n\n1. Andá a Productos desde el menú\n2. Buscá el producto que querés modificar\n3. Tocá los 3 puntos al lado del producto\n4. Seleccioná Editar\n5. Cambiá el precio\n6. Tocá Guardar',
    action: { label: 'Ir a Productos', view: 'add-product' },
  },
  {
    id: 'view-reports',
    question: '¿Cómo veo mis reportes?',
    answer:
      'Podés ver tus reportes desde la sección Reportes.\n\nAhí encontrás:\n- Ventas del día\n- Productos más vendidos\n- Ticket promedio\n- Crecimiento vs. días anteriores\n\nLos datos se actualizan en tiempo real.',
    action: { label: 'Ver Reportes', view: 'reports' },
  },
  {
    id: 'manage-users',
    question: '¿Cómo administrar usuarios?',
    answer:
      'Para administrar usuarios:\n\n1. Andá a Usuarios desde el menú\n2. Tocá el botón + para agregar un nuevo usuario\n3. Completá: nombre, email y rol (Administrador / Vendedor)\n4. El usuario recibirá un enlace para crear su contraseña\n\nTambién podés editar o desactivar usuarios existentes.',
    action: { label: 'Ir a Usuarios', view: 'users' },
  },
]

export function getFAQResponse(faqId: string): FAQItem | undefined {
  return FAQ_ITEMS.find((item) => item.id === faqId)
}
