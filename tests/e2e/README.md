# E2E Testing (Playwright)

## Requisitos

1. Crear una base dedicada para E2E y exportar `TEST_DATABASE_URL`.
2. Tener instaladas dependencias del proyecto (`pnpm install`).
3. Tener Chromium instalado para Playwright (`pnpm exec playwright install chromium`).

## Variables de entorno recomendadas

Puedes copiar `.env.example` y agregar:

- `TEST_DATABASE_URL=postgresql://user:password@localhost:5432/stockdb_e2e?schema=public`
- `E2E_ADMIN_EMAIL=admin@techmart.com` (opcional)
- `E2E_ADMIN_PASSWORD=password123` (opcional)

## Ejecutar tests

- `pnpm test:e2e`
- `pnpm test:e2e:headed`
- `pnpm test:e2e:ui`

## Qué cubre la suite

- Login admin
- Creación de categorías
- Creación de productos
- Flujo completo de venta con validación en DB
- Verificación de métricas de dashboard

## Aislamiento de datos

Cada test hace reset completo de DB y re-seed mínimo (store + admin + employee).
No se usan mocks en el flujo E2E.
