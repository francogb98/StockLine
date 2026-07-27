# Smart Action Center — StockLine

The assistant is NOT an AI chatbot. It is a proactive Action Center that gives the merchant quick access to the most common business operations while highlighting urgent situations.

No conversations. No AI responses. No message history. No typing indicators. Everything is component-driven.

---

## Pantalla principal

Al abrir, muestra:

**"¿Qué necesitás hacer?"**

Grilla de 6 acciones grandes (orden dinámico si hay alertas de stock):

| Acción | Descripción |
|---|---|
| ↩️ Hacer devolución | Devolver productos de una venta |
| 📦 Agregar stock | Sumar unidades a un producto |
| 💲 Cambiar precio | Actualizar precio de un producto |
| 📊 Ventas de hoy | Resumen del día |
| ⚠️ Poco stock | Productos con stock crítico |
| 💵 Estado de caja | Control diario de caja |

### Acciones eliminadas del asistente
- ~~Crear venta~~ — Eliminada del asistente. Las ventas se gestionan desde el POS principal.
- ~~Buscar producto~~ — Eliminada del asistente. La búsqueda está disponible desde la gestión de stock.

Las vistas subyacentes (`search-product-view.tsx`) no se eliminaron del código por si se reutilizan en otro contexto.

---

## Sistema proactivo de alertas de stock

El asistente monitorea automáticamente el stock de productos.

### Disparo
Apenas la aplicación termina de cargar los productos, se verifica:
- productos sin stock (`stock === 0`)
- productos por debajo del mínimo (`stock > 0 && stock <= minStock`)

### Notificación flotante
Si hay productos afectados, aparece un mensaje flotante del asistente:

```
🤖 Tenés 4 productos sin stock.
```

o

```
🤖 7 productos están por agotarse. Considerá reponerlos.
```

Requisitos:
- Aparece automáticamente al cargar productos.
- Animación slide-in suave (spring).
- Visible ~5 segundos.
- Se puede descartar manualmente (botón X).
- No se repite a menos que el estado del stock cambie.
- No es un modal — es una burbuja liviana flotante pegada al asistente.
- Incluye botón "Ver acciones rápidas" que abre el panel.

### Badge en el botón flotante
Si existen problemas de stock, aparece un punto rojo de notificación sobre el botón flotante del asistente.

El badge desaparece al abrir el asistente. Si el estado del stock cambia después, puede volver a aparecer.

---

## Home dinámico

### Card de stock bajo destacada
Cuando el asistente se abre y existen alertas de stock, la card "Poco stock" se destaca inmediatamente:

- Borde ámbar/naranja
- Fondo ligeramente teñido
- Badge "Atención" en la esquina superior derecha
- Brillo suave alrededor del borde (`ring` + `animate-pulse`)

### Resumen mejorado
En lugar de solo el título, muestra un resumen rápido con números reales del inventario:

```
⚠ Poco stock
3 sin stock    6 por agotarse    Revisar →
```

### Prioridad dinámica
Si existen problemas de stock, la card "Poco stock" se mueve automáticamente a la primera posición de la grilla. Si no hay problemas, mantiene el orden normal.

### Header dinámico
Cuando hay problemas de stock, el subtítulo del header cambia a:

"4 productos requieren atención."

Caso contrario mantiene el subtítulo default.

---

## Secciones adicionales

### Usados recientemente
- Muestra las últimas 5 acciones ejecutadas desde el asistente
- Permite volver rápidamente

### Enviar sugerencia
- Al tocar se despliega un formulario simple
- Campo de texto + botón Enviar
- No tiene backend — listo para integrar

---

## UX Philosophy

El asistente nunca debe sentirse como un chatbot:
- No hay conversaciones.
- No hay respuestas de IA.
- No hay historial de mensajes.
- No hay indicadores de escritura.

El asistente simplemente detecta situaciones importantes y dirige al usuario hacia la acción correcta.

Todo es component-driven.

---

## Arquitectura

```
components/mobile-assistant/
├── floating-assistant.tsx   → Punto de entrada: provider + trigger + notificación + panel
├── context.tsx              → Estado global (useReducer) + monitoreo de stock (useData)
├── types.ts                 → Tipos TypeScript
├── home.tsx                 → Pantalla principal: grilla dinámica + stock destacado + sugerencias
├── content.tsx              → Router de vistas
├── panel.tsx                → Drawer mobile (vaul)
├── desktop-panel.tsx        → Ventana flotante desktop
├── trigger.tsx              → Botón flotante con badge de notificación
├── header.tsx               → Header con título dinámico según alertas
├── navigation.tsx           → Barra de navegación (volver)
├── card.tsx                 → Componente de tarjeta de acción (soporta highlighted)
├── animation-variants.ts    → Animaciones Framer Motion (incluye highlighted variant)
├── index.ts                 → Barrel export
└── views/
    ├── add-stock-view.tsx        → Agregar stock
    ├── change-price-view.tsx     → Cambiar precio
    ├── today-sales-view.tsx      → Ventas de hoy
    ├── low-stock-products-view.tsx → Productos con poco stock
    ├── cash-status-view.tsx      → Estado de caja
    └── make-return-view.tsx      → Hacer devolución
```

---

## Provider tree

```
<StoreProvider> (auth + datos + POS)
  <AssistantProvider> (estado del asistente + monitoreo de stock)
    <StockAlertNotification />  → burbuja flotante de alerta
    <AssistantTrigger />         → botón flotante con badge 🔴
    <AssistantPanel />           → mobile drawer / desktop ventana
```

Montado en `app/app/(full)/layout.tsx`, `app/app/(panel)/layout.tsx` y `components/mobile-layout.tsx`.

---

## Diseño

- Tarjetas grandes con ícono + label + descripción
- Grilla de 2 columnas
- Mucho espacio en blanco
- Animaciones suaves (Framer Motion)
- Sin sensación de chatbot
- Sin respuestas tipo texto — todo son componentes visuales
- Card de stock bajo destacada con borde ámbar, pulso suave y badge "Atención"
- Notificación flotante automática con auto-dismiss
- Badge rojo en botón flotante cuando hay alertas activas
