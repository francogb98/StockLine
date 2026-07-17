# Stock App Store — POS + Control de Stock

Sistema POS moderno para comercios con gestión de stock, caja, reportes y pagos electrónicos.

## Características

- **Punto de Venta** — Interfaz rápida con IVA configurable, descuentos, cálculo automático de vuelto
- **Control de Stock** — Movimientos, historial, alertas de stock mínimo
- **Dashboard** — Ventas reales, facturación, productos más vendidos, ticket promedio
- **Caja** — Sesiones de caja, ingresos/egresos, arqueo completo
- **Múltiples medios de pago** — Efectivo, tarjeta, transferencia, Mercado Pago
- **Multi-usuario** — Roles, permisos, sesiones por comercio
- **Suscripciones** — Planes y facturación recurrente vía Mercado Pago
- **Reportes** — Exportación a Excel, reportes de ventas y stock

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL + Prisma ORM |
| UI | Tailwind CSS + shadcn/ui + Radix UI |
| Formularios | React Hook Form + Zod |
| Gráficos | Recharts |
| Pagos | Mercado Pago (API + Suscripciones) |
| Testing | Vitest + Playwright |
| Paquete | pnpm |

## Instalación

```bash
git clone https://github.com/tu-usuario/stock-app-store.git
cd stock-app-store
pnpm install
cp .env.example .env
# Completar DATABASE_URL y credenciales de Mercado Pago
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

## Variables de Entorno

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
NEXT_PUBLIC_USE_MOCK_DATA=0
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-xxxx-xxxxx-xxxxx"
MERCADO_PAGO_WEBHOOK_SECRET="tu_webhook_secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm lint` | ESLint |
| `pnpm test` | Tests unitarios (Vitest) |
| `pnpm test:e2e` | Tests E2E (Playwright) |
| `pnpm prisma:migrate` | Ejecuta migraciones |
| `pnpm prisma:seed` | Siembra datos iniciales |

## Licencia

MIT
