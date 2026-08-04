# UI Structure — Frontend Mobile & Desktop

Este documento describe la organización de componentes, las convenciones de nomenclatura y los tokens de layout que rigen la interfaz de StockLine. Su objetivo es servir como referencia rápida para mantener la consistencia visual entre vistas desktop y mobile.
---
## 1. Organización de `/components`

La carpeta `components/` se divide en tres grandes grupos:

- **Globales**: componentes reutilizables en cualquier página o feature.
- **Layout**: elementos estructurales de la aplicación (headers, navegación, sidebars, shells).
- **Por feature**: componentes específicos de un dominio de negocio (stock, POS, caja, etc.).

```
components/
│
├── # Globales / cross-cutting
├── brand-logo.tsx
├── force-light-mode.tsx
├── landing-features.tsx
├── landing-navbar.tsx
├── promo-bar.tsx
├── responsive-shell.tsx
├── theme-provider.tsx
├── whatsapp-button.tsx
│
├── # Layout (estructura de la app)
├── app-header.tsx              # Header desktop con menú hamburguesa + caja + usuario
├── app-shell.tsx               # Shell alternativo con sidebar colapsable (legacy/respaldo)
├── email-brand-header.tsx      # Header de emails
├── mobile-bottom-navigation.tsx # Navegación inferior mobile (Productos, Reportes, Vender, Asistente, Ajustes)
├── mobile-header.tsx           # Header mobile fijo (perfil + notificaciones + indicador de caja)
├── mobile-layout.tsx           # Wrapper que monta header, bottom nav y main con offsets
├── page-container.tsx          # Contenedor de página con padding y max-width
├── sidebar-nav.tsx             # Sidebar lateral desktop
│
├── mobile-assistant/           # Asistente de acciones rápidas (mobile + desktop)
│   ├── index.ts
│   ├── context.tsx
│   ├── panel.tsx
│   ├── desktop-panel.tsx
│   ├── floating-assistant.tsx
│   ├── trigger.tsx
│   ├── header.tsx
│   ├── navigation.tsx
│   ├── content.tsx
│   ├── home.tsx
│   ├── card.tsx
│   ├── animation-variants.ts
│   └── views/
│       ├── add-product-view.tsx
│       ├── add-stock-view.tsx
│       ├── low-stock-products-view.tsx
│       ├── today-sales-view.tsx
│       ├── cash-status-view.tsx
│       ├── make-return-view.tsx
│       ├── change-price-view.tsx
│       └── search-product-view.tsx
│
├── # Features
├── auth/                       # Login, registro, layouts de autenticación
├── cash/                       # Indicadores y diálogos de caja
├── dashboard/                  # Reportes y métricas
├── ingredients/
├── offline/                    # Sync offline
├── onboarding/                 # Wizard de primera configuración
├── pos/                        # Punto de venta
├── products/
├── recipes/
├── settings/                   # Configuración de la cuenta/negocio
├── stock/                      # Gestión de productos, categorías e importación
│   └── import/
├── subscription/               # Estado de suscripción y pagos
├── users/                      # Gestión de usuarios
│
└── ui/                         # Componentes base de shadcn/ui
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    ├── drawer.tsx
    ├── sheet.tsx
    ├── sidebar.tsx
    ├── toast.tsx / toaster.tsx / sonner.tsx
    └── ...
```

### Notas sobre la estructura

- `ui/` contiene los primitivos de shadcn/ui. No deben incluirse lógicas de negocio.
- Cada feature (ej. `stock/`, `pos/`, `cash/`) agrupa sus propios diálogos, tablas y formularios.
- `mobile-assistant/` es una feature transversal: se consume tanto en mobile (drawer inferior) como en desktop (panel flotante).

---

## 2. Convenciones de nomenclatura: Mobile vs Desktop

### 2.1. Separación por breakpoint

El punto de corte mobile/desktop está definido en:

```ts
// hooks/use-mobile.tsx
const MOBILE_BREAKPOINT = 768
```

A partir de los `768px` la app se considera desktop; por debajo, mobile.

### 2.2. Componentes duplicados por viewport

Cuando una pieza de UI tiene una estructura visual muy diferente entre mobile y desktop, se crean dos componentes con prefijo explícito:

| Vista      | Componente                       | Ubicación                          |
|------------|----------------------------------|-------------------------------------|
| Desktop    | `AppHeader`                      | `components/app-header.tsx`         |
| Mobile     | `MobileHeader`                   | `components/mobile-header.tsx`      |
| Desktop    | `SidebarNav`                     | `components/sidebar-nav.tsx`        |
| Mobile     | `MobileBottomNavigation`         | `components/mobile-bottom-navigation.tsx` |
| Desktop    | `DesktopAssistantPanel`          | `components/mobile-assistant/desktop-panel.tsx` |
| Mobile     | `AssistantPanel` (Drawer)        | `components/mobile-assistant/panel.tsx` |

### 2.3. Componentes unificados con modificadores responsive

Cuando la diferencia es menor, se usa un único componente y se condiciona con clases de Tailwind o con el hook `useIsMobile`:

```tsx
import { useIsMobile } from '@/hooks/use-mobile'

export function SomeFeature() {
  const isMobile = useIsMobile()

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  )
}
```

### 2.4. Reglas de naming

- **PascalCase** para archivos de componentes de React (`MobileHeader.tsx`).
- **kebab-case** para archivos de utilidades, hooks y estilos (`use-mobile.tsx`, `animation-variants.ts`).
- **Prefijo `Mobile`** para componentes que solo se renderizan en viewport mobile.
- **Sufijo `-dialog` / `-sheet`** para modales y drawers (`product-dialog.tsx`, `import-sheet.tsx`).
- **Sufijo `-view`** para vistas internas del asistente mobile (`add-product-view.tsx`).
- **Archivo `index.ts`** en features complejas para exportar el API pública del módulo.

---

## 3. Tokens de layout

### 3.1. Alturas de headers y navegación

| Elemento                         | Valor                            | Archivo de referencia                                  |
|----------------------------------|----------------------------------|--------------------------------------------------------|
| Header mobile fijo               | `52px` (fila superior) + `~28px` (fila de caja) ≈ `~80px` total | `components/mobile-header.tsx`                         |
| Offset superior del `<main>` mobile | `pt-[72px]`                      | `components/mobile-layout.tsx`                         |
| Header desktop                   | `h-14` = `56px`                  | `components/app-header.tsx`                            |
| Sidebar desktop                  | `w-[235px]`                      | `components/sidebar-nav.tsx`                           |
| Bottom navigation mobile         | variable (mínimo `72px`)         | `components/mobile-bottom-navigation.tsx`              |
| Botón primario flotante del bottom nav | `h-14 w-14` = `56px`, sobresale `-18px` | `components/mobile-bottom-navigation.tsx`       |
| FAB de venta mobile              | `h-14` + `px-5`                  | `components/pos/sell-fab.tsx`                          |

### 3.2. Paddings y safe areas

| Elemento                         | Valor                                           | Notas                                                   |
|----------------------------------|-------------------------------------------------|---------------------------------------------------------|
| Contenido mobile                 | `px-4` (Tailwind)                               | Aplicado en la mayoría de páginas; evitar márgenes laterales duros. |
| Padding inferior del main        | `paddingBottom: var(--bottom-nav-height)`       | Se sincroniza dinámicamente con la altura real de la bottom nav. |
| Safe area inferior               | `pb-[max(env(safe-area-inset-bottom),0.25rem)]` | Evita que la nav quede bajo el home indicator en iOS.   |
| Contenedor de página             | `p-4` + `max-w-7xl`                             | `components/ui/page-container.tsx`                      |

### 3.3. Escala de z-index

La app no utiliza un sistema de tokens de z-index centralizado, pero los valores recurrentes siguen esta escala:

| Valor  | Uso típico                                                                 |
|--------|------------------------------------------------------------------------------|
| `z-10` | Elementos relativos dentro de un contenedor (badges, gradientes, indicadores). |
| `z-20` | Superposiciones internas (ej. badge de producto rápido en POS).              |
| `z-40` | Navegación fija mobile (`MobileHeader`, `MobileBottomNavigation`, `AssistantTrigger`, `whatsapp-button`). |
| `z-50` | Modales, drawers, toasts, loading screens, notificaciones flotantes, panel desktop del asistente. |
| `z-[60]` | `PromoBar` (aviso promocional superior).                                    |
| `z-[80]` | Menú móvil full-screen (`AppHeader` mobile overlay).                        |
| `z-[100]` | Toaster global (`components/ui/toast.tsx`).                                |

> **Regla de oro**: si se agrega un nuevo elemento fijo o modal, debe evaluarse contra esta escala para no romper la navegación o los overlays existentes.

---

## 4. Checklist para depurar fallos visuales en mobile

Usar este checklist antes de dar por terminada una vista o feature que se renderice en viewport `< 768px`, especialmente en el rango `320px–390px`.

### 4.1. Desbordamientos de texto

- [ ] Ningún texto excede el ancho de pantalla sin truncarse o ajustarse.
- [ ] Los nombres de producto/usuario usan `truncate`, `text-ellipsis` o `break-words` según corresponda.
- [ ] Los montos y cantidades no se cortan en pantallas de `320px`.
- [ ] Se valida el comportamiento con contenido real (nombres largos, precios con decimales, símbolos de moneda).
- [ ] Se evitan `whitespace-nowrap` en textos que pueden crecer.

### 4.2. Flex / Grid en pantallas pequeñas

- [ ] Los botones de acción principales caben en una sola fila o se apilan con `flex-col` en `xs`.
- [ ] Las tablas no generan scroll horizontal inesperado; se prefiere tarjetas o layouts apilados en mobile.
- [ ] Los `grid` de 2+ columnas en desktop se reducen a 1 columna con `grid-cols-1 md:grid-cols-2`.
- [ ] Los contenedores flex usan `min-w-0` para permitir que los hijos se encojan correctamente.
- [ ] No hay combinaciones de `flex-1` + `overflow-hidden` que oculten contenido sin scroll.
- [ ] El `100vw` no genera scroll horizontal por márgenes o paddings laterales.

### 4.3. Áreas táctiles

- [ ] Todos los botones e íconos clickeables tienen al menos `44×44px` de área táctil efectiva.
- [ ] Los ítems de la bottom nav tienen padding táctil suficiente y no quedan tapados por el home indicator.
- [ ] Los inputs y selects son lo suficientemente altos como para tocarlos sin zoom (`min-h-[44px]` recomendado).
- [ ] Los chips/badges pequeños están rodeados de padding o tienen un contenedor táctil mayor.

### 4.4. Layout fijo y safe areas

- [ ] El contenido no queda oculto detrás del `MobileHeader` (`pt-[72px]` presente).
- [ ] El contenido no queda oculto detrás del `MobileBottomNavigation` (`paddingBottom` dinámico presente).
- [ ] Se respeta `env(safe-area-inset-bottom)` en dispositivos con notch/home indicator.
- [ ] Los elementos `fixed` no superponen botones críticos en pantallas de `320px`.
- [ ] El drawer del asistente no excede el viewport en altura (`h-[calc(100dvh-2.5rem)]`).

### 4.5. Verificación visual rápida

- [ ] Probar en emulador a `320px`, `375px` y `390px`.
- [ ] Rotar a landscape y verificar que no se rompa el layout.
- [ ] Activar zoom al 150%–200% para detectar desbordamientos de texto.
- [ ] Revisar modo oscuro: el header mobile (`bg-primary`) y el sidebar mantienen contraste.
- [ ] Confirmar que no hay doble scroll (`overflow-y-auto` anidados en el mismo eje).

---

## 5. Decisiones clave de arquitectura

1. **Dos layouts de app**: `(panel)` y `(full)` comparten la misma estructura (`SidebarNav` + `AppHeader` en desktop, `MobileLayout` en mobile), pero permiten que distintas páginas (POS, dashboard, etc.) decidan su propio contenido sin duplicar el shell.
2. **`useIsMobile` como única fuente de verdad**: todos los switches mobile/desktop leen el mismo breakpoint (`768px`). No se deben hardcodear otros valores en componentes de negocio.
3. **Bottom nav dinámica**: la altura se mide con `ResizeObserver` y se expone como variable CSS `--bottom-nav-height`, lo que permite que el contenido principal se ajuste automáticamente si cambian los íconos o el tamaño de fuente.
4. **Drawer vs Panel**: el asistente usa `Drawer` de shadcn/ui en mobile (`AssistantPanel`) y un panel flotante fijo en desktop (`DesktopAssistantPanel`). La lógica de negocio vive en `views/` y es compartida.

---

## 6. Referencias rápidas

- Breakpoint mobile: `768px` (`hooks/use-mobile.tsx`).
- Layout mobile: `components/mobile-layout.tsx`.
- Layout desktop panel/full: `app/app/(panel)/layout.tsx`, `app/app/(full)/layout.tsx`.
- Header mobile: `components/mobile-header.tsx`.
- Header desktop: `components/app-header.tsx`.
- Navegación inferior: `components/mobile-bottom-navigation.tsx`.
- Sidebar desktop: `components/sidebar-nav.tsx`.
