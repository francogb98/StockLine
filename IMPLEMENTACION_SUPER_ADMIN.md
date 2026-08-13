# Implementación — Super Admin para StockLine

> Roadmap operativo basado en el plan técnico de Super Admin.
> Cada fase es **independiente y mergeable**. No se arranca la fase N+1 sin la N mergeada.
> El proyecto usa SDD con `strict_tdd: true` (`openspec/config.yaml`). Las fases que tocan modelo/UI/API deben pasar por el flujo `propose → spec → design → tasks → apply → verify`.

---

## Convenciones generales

- **Branch naming:** `feature/super-admin-fase-N` (donde N = 1..8).
- **PR:** un PR por fase. Tocar como máximo la fase actual.
- **Tests:** Vitest unit + Playwright e2e. Cobertura obligatoria para todo servicio nuevo.
- **Migraciones:** una por fase que toque schema. Nombre: `super_admin_fase_N`.
- **Audit:** a partir de la FASE 3, TODA acción sensible emite `recordAuditEvent`.
- **No romper nada existente:** después de cada fase correr `pnpm test` + `pnpm test:e2e` + smoke test manual del flujo de tienda.

---

## FASE 1 — Seguridad y rol Super Admin

**Objetivo:** un usuario SA puede loguearse y ver un panel dedicado; un admin de tienda NO puede acceder a nada de SA. Cero feature de negocio todavía.

**Entregable:** `/super-admin` carga, `/app` redirige para SA, `/api/super-admin/*` rechaza con 401/403 a no-SA.

### 1.1 Migración Prisma

- [ ] Editar `prisma/schema.prisma` — agregar al modelo `User`:
  ```prisma
  isSuperAdmin     Boolean  @default(false)
  superAdminScope  String?  // futuro: región/segmento
  ```
- [ ] `pnpm prisma migrate dev --name super_admin_fase_1`
- [ ] Verificar que la app existente arranca (`pnpm dev`) y que un admin normal sigue entrando a `/app`.

### 1.2 Activar el primer SA

Dos opciones, elegí una:

- **Opción A — Seed (recomendado, repetible):**
  - [ ] Crear `prisma/seeds/super-admin.ts` que toma `SUPER_ADMIN_EMAILS` de `.env` y setea `isSuperAdmin = true` en los usuarios que matcheen.
  - [ ] Agregar script en `package.json`: `"seed:super-admin": "tsx prisma/seeds/super-admin.ts"`.

- **Opción B — UPDATE manual:**
  - [ ] `psql $DATABASE_URL -c "UPDATE users SET is_super_admin = true WHERE email = 'tu@email.com';"`

- [ ] Agregar a `.env.example`:
  ```
  # Coma-separado, opcional, usado solo por el seed
  SUPER_ADMIN_EMAILS="tu@email.com"
  ```

### 1.3 Guard de autorización

- [ ] Crear `lib/super-admin/guard.ts`:
  ```ts
  import { errorResponse } from "@/lib/api-helpers";
  import {
    requireAuthenticatedSession,
    type AuthenticatedSession,
  } from "@/lib/auth-session";
  import { prisma } from "@/lib/prisma";

  export type SuperAdminResult =
    | { auth: AuthenticatedSession & { isSuperAdmin: true }; response?: never }
    | { auth?: never; response: Response };

  export async function requireSuperAdmin(): Promise<SuperAdminResult> {
    const auth = await requireAuthenticatedSession();
    if ("response" in auth) return auth;

    if (!auth.auth.user.isSuperAdmin) {
      return { response: errorResponse("Acceso restringido a Super Admin", 403) };
    }
    return { auth: { ...auth.auth, isSuperAdmin: true } };
  }
  ```
- [ ] Actualizar `lib/auth-session.ts` — `SessionUser` no necesita cambios (no exponemos `isSuperAdmin` por sesión hasta que se necesite; el guard hace su propia query o se agrega al select de `getAuthenticatedSession`).
  - Decisión: agregar `isSuperAdmin` al `select` de `getAuthenticatedSession` para no hacer doble query en cada request SA.

### 1.4 API auth helper

- [ ] Editar `lib/api-auth.ts` — agregar al final:
  ```ts
  export async function requireSuperAdminSessionUser() {
    // reexport desde lib/super-admin/guard o implementar acá
  }
  ```
  **Decisión:** mantener el guard en `lib/super-admin/guard.ts` y exportar `requireSuperAdmin` desde `lib/api-auth.ts` para no romper la convención actual.

### 1.5 Middleware

- [ ] Editar `middleware.ts`:
  - Agregar prefijo `/api/super-admin` a `PROTECTED_API_PREFIXES`.
  - Para ese prefijo, si la cookie existe pero el token decodificado/lookup rápido no es SA, devolver `403`. **Limitación del middleware Edge:** no podemos consultar Prisma ahí. Solución pragmática: el middleware deja pasar al route handler si hay cookie, y el `requireSuperAdmin` del handler es la barrera real. Para FASE 1 dejamos el middleware como está (sólo chequea cookie); el gate de rol se hace en el guard.
  - Agregar `/super-admin/:path*` al `matcher` para que la app entera de tienda siga funcionando (hoy el matcher ya cubre `/app/:path*` y `/api/:path*`).
- [ ] Test: `middleware.test.ts` si no existe (ver si el repo ya lo testea — si no, saltamos a e2e).

### 1.6 Layout y página de SA

- [ ] Crear `app/super-admin/layout.tsx`:
  - `ThemeProvider` sí (consistencia visual).
  - NO `StoreProvider` (no queremos cargar el contexto de tienda).
  - Sidebar propio con un único ítem: "Dashboard".
  - Header con nombre del SA y botón "Salir".
  - Branding distinto del de tienda (logo, color o etiqueta "Platform Admin").
- [ ] Crear `app/super-admin/page.tsx`:
  - Server component.
  - Llama `getAuthenticatedSession()`.
  - Si no es SA, redirect a `/app` o mostrar 403.
  - Render: "Bienvenido, {name}" + card placeholder "FASE 4: Dashboard global".
- [ ] Crear `components/super-admin/super-admin-shell.tsx` (wrapper desktop + mobile).

### 1.7 Redirección desde `/app`

- [ ] Editar `app/app/(panel)/layout.tsx`:
  - Al inicio del componente, si `user.isSuperAdmin === true`, llamar `router.replace("/super-admin")`.
  - **Cuidado:** no romper el flujo de admin de tienda. El check debe ser exclusivo.

### 1.8 Tests

- [ ] `lib/super-admin/guard.test.ts`:
  - Sin sesión → 401.
  - Sesión de admin de tienda (`isSuperAdmin = false`) → 403.
  - Sesión de SA (`isSuperAdmin = true`) → 200.
- [ ] Si el repo tiene tests para `lib/api-auth.ts`, agregar casos para el path SA.
- [ ] `tests/e2e/super-admin-auth.spec.ts` (Playwright):
  - Login como SA → navega a `/super-admin` → ve "Bienvenido".
  - Login como admin de tienda → intenta `/super-admin` → recibe 403 o redirect.
- [ ] Correr `pnpm test` y `pnpm test:e2e` para confirmar no-regresión.

### 1.9 Smoke test manual

- [ ] Levantar `pnpm dev`.
- [ ] Loguearte como SA → confirmar `/super-admin` carga, `/app` redirige a `/super-admin`.
- [ ] Loguearte como admin de tienda → confirmar `/app` carga normal, intentar `/super-admin` da error.
- [ ] Probar `curl -b "session-token=XXX" http://localhost:3000/api/super-admin/me` con token de admin de tienda → 403.

### 1.10 PR y merge

- [ ] Branch: `feature/super-admin-fase-1`.
- [ ] PR con descripción: qué se agrega, qué se modifica, evidencia de no-regresión.
- [ ] Esperar review y merge.

---

## FASE 2 — Modelo de datos (sin lógica)

**Objetivo:** dejar todas las tablas y columnas nuevas listas para que las fases 3+ construyan encima. Cero cambio funcional.

**Entregable:** `pnpm prisma migrate dev` aplica sin romper nada. App existente corre igual.

### 2.1 Migración

- [ ] Editar `prisma/schema.prisma`:
  - **`User`** — ya está en FASE 1, no tocar.
  - **`Store`** — agregar:
    ```prisma
    suspendedAt        DateTime?
    suspendedReason    String?
    suspendedByUserId  String?
    internalNotes      String?
    couponRedemptions  CouponRedemption[]
    errors             AppError[]

    enum StoreSuspensionReason {
      MANUAL_ADMIN
      PAYMENT_FRAUD
      POLICY_VIOLATION
      OTHER
    }
    // (opcional) suspender usar el enum en lugar de String?
    ```
  - **`Subscription`** — agregar:
    ```prisma
    cancelledByAdmin        Boolean   @default(false)
    cancelledByAdminUserId  String?
    adminNotes              String?
    previousStatus          String?
    couponRedemptions       CouponRedemption[]
    ```
  - **Nuevos modelos** — agregar:
    ```prisma
    model PlatformConfig {
      key       String   @id
      value     Json
      updatedBy String?
      updatedAt DateTime @updatedAt
      @@map("platform_config")
    }

    enum CouponDiscountType { PERCENTAGE FIXED }

    model Coupon {
      id              String              @id @default(uuid())
      code            String              @unique
      description     String?
      discountType    CouponDiscountType
      discountValue   Decimal             @db.Decimal(12, 2)
      durationDays    Int                 @default(30)
      maxRedemptions  Int?
      redeemedCount   Int                 @default(0)
      applicablePlans String[]            // ["monthly", "annual"], [] = todos
      startsAt        DateTime            @default(now())
      expiresAt       DateTime?
      isActive        Boolean             @default(true)
      createdByUserId String
      createdAt       DateTime            @default(now())
      updatedAt       DateTime            @updatedAt
      redemptions     CouponRedemption[]
      @@index([isActive, expiresAt])
      @@map("coupons")
    }

    model CouponRedemption {
      id                String        @id @default(uuid())
      couponId          String
      coupon            Coupon        @relation(fields: [couponId], references: [id])
      storeId           String
      store             Store         @relation(fields: [storeId], references: [id])
      subscriptionId    String
      subscription      Subscription  @relation(fields: [subscriptionId], references: [id])
      redeemedByUserId  String?
      redeemedAt        DateTime      @default(now())
      discountApplied   Decimal       @db.Decimal(12, 2)
      notes             String?
      @@unique([couponId, subscriptionId])
      @@index([couponId, redeemedAt])
      @@index([storeId])
      @@map("coupon_redemptions")
    }

    enum AuditActorType { SUPER_ADMIN STORE_USER SYSTEM WEBHOOK }

    model AuditLog {
      id          String         @id @default(uuid())
      actorType   AuditActorType
      actorUserId String?
      storeId     String?
      action      String
      targetType  String?
      targetId    String?
      metadata    Json?
      ipAddress   String?
      userAgent   String?
      createdAt   DateTime       @default(now())
      @@index([storeId, createdAt(sort: Desc)])
      @@index([actorUserId, createdAt(sort: Desc)])
      @@index([action, createdAt(sort: Desc)])
      @@index([createdAt(sort: Desc)])
      @@map("audit_logs")
    }

    enum AppErrorSource   { API PRISMA MERCADO_PAGO WEBHOOK POS UNKNOWN }
    enum AppErrorSeverity { INFO WARNING ERROR CRITICAL }

    model AppError {
      id               String           @id @default(uuid())
      storeId          String?
      store            Store?           @relation(fields: [storeId], references: [id])
      source           AppErrorSource
      severity         AppErrorSeverity
      statusCode       Int?
      method           String?
      path             String?
      message          String
      stack            String?          @db.Text
      fingerprint      String
      occurrences      Int              @default(1)
      lastSeenAt       DateTime         @default(now())
      firstSeenAt      DateTime         @default(now())
      resolvedAt       DateTime?
      resolvedByUserId String?
      metadata         Json?
      @@index([fingerprint, lastSeenAt(sort: Desc)])
      @@index([storeId, lastSeenAt(sort: Desc)])
      @@index([source, severity, lastSeenAt(sort: Desc)])
      @@index([resolvedAt, severity])
      @@map("app_errors")
    }
    ```
- [ ] `pnpm prisma migrate dev --name super_admin_fase_2`.
- [ ] Verificar que `prisma generate` se ejecuta en `postinstall` y la app compila.

### 2.2 Tipos TypeScript

- [ ] Editar `lib/types.ts` — agregar tipos espejo (no se usan en frontend todavía, pero dejarlos para evitar drift):
  ```ts
  export type CouponDiscountType = "PERCENTAGE" | "FIXED";
  export type AuditActorType = "SUPER_ADMIN" | "STORE_USER" | "SYSTEM" | "WEBHOOK";
  export type AppErrorSource = "API" | "PRISMA" | "MERCADO_PAGO" | "WEBHOOK" | "POS" | "UNKNOWN";
  export type AppErrorSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

  export interface Coupon { ... }   // espejo del modelo
  export interface CouponRedemption { ... }
  export interface AuditLog { ... }
  export interface AppError { ... }
  ```

### 2.3 Store fantasma "platform-internal"

- [ ] Crear `prisma/seeds/platform-store.ts`:
  ```ts
  // Crea un Store con name = "Platform Admin" si no existe.
  // Devuelve su id. Usado como storeId del primer SA.
  ```
- [ ] Wirearlo en el seed principal o como script aparte.

### 2.4 No-regresión

- [ ] `pnpm test` — verde.
- [ ] `pnpm test:e2e` — verde.
- [ ] Smoke test manual del flujo de tienda (registro, login, venta, suscripción).

### 2.5 PR

- [ ] Branch: `feature/super-admin-fase-2`.
- [ ] PR con: link a la migración, lista de tablas/enums nuevos, evidencia de no-regresión.

---

## FASE 3 — Auditoría y logger central

**Objetivo:** cada acción sensible del sistema queda registrada en `AuditLog`. Toda excepción capturable queda en `AppError`.

**Entregable:** ver audit log con login, logout, alta de empresa, alta de usuario, sync MP, acciones SA. Ver errores agrupados en `/super-admin/errors` (UI todavía no; sólo el endpoint).

### 3.1 Servicios

- [ ] Crear `lib/logger.ts`:
  ```ts
  type Level = "info" | "warn" | "error" | "critical";
  export function log(level: Level, message: string, context?: Record<string, unknown>) {
    const line = { ts: new Date().toISOString(), level, message, ...context };
    // a stdout
    if (level === "error" || level === "critical") {
      // no await: reportError en background
      reportError({ source: "API", severity: level === "critical" ? "CRITICAL" : "ERROR", message, metadata: context }).catch(() => {});
    }
  }
  ```
- [ ] Crear `lib/error-reporter.ts`:
  ```ts
  import { prisma } from "@/lib/prisma";
  import { createHash } from "node:crypto";

  function fingerprint(input: { source: string; message: string; path?: string }) {
    return createHash("sha256")
      .update(`${input.source}|${input.message}|${input.path ?? ""}`)
      .digest("hex");
  }

  export async function reportError(input: { source: AppErrorSource; severity?: AppErrorSeverity; message: string; stack?: string; storeId?: string; statusCode?: number; method?: string; path?: string; metadata?: any }) {
    const fp = fingerprint(input);
    const existing = await prisma.appError.findFirst({
      where: { fingerprint: fp, lastSeenAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (existing) {
      await prisma.appError.update({
        where: { id: existing.id },
        data: { occurrences: { increment: 1 }, lastSeenAt: new Date(), message: input.message, stack: input.stack },
      });
      return existing;
    }
    return prisma.appError.create({ data: { ...input, fingerprint: fp, severity: input.severity ?? "ERROR" } });
  }
  ```
- [ ] Crear `lib/audit-service.ts`:
  ```ts
  import { prisma } from "@/lib/prisma";
  import type { AuditActorType } from "@/lib/types";

  export async function recordAuditEvent(input: {
    actorType: AuditActorType;
    actorUserId?: string | null;
    storeId?: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) { ... }
  ```
- [ ] Crear `lib/super-admin/audit-service.ts`:
  - `queryAudit(filters)` con paginación.
  - `getCompanyTimeline(storeId, from, to)`.

### 3.2 Hooks en código existente

Sin modificar la lógica de negocio, solo emitir eventos:

- [ ] `app/api/auth/register/route.ts` — después de crear user:
  ```ts
  await recordAuditEvent({ actorType: "STORE_USER", actorUserId: newUser.id, storeId: newUser.storeId, action: "user.register", targetType: "User", targetId: newUser.id, ipAddress, userAgent });
  ```
- [ ] `app/api/auth/login/route.ts` — emitir en éxito y en fallo (`metadata: { reason }`).
- [ ] `app/api/auth/logout/route.ts` — `action: "user.logout"`.
- [ ] `app/api/auth/users/route.ts`:
  - `POST` → `action: "user.create"`.
  - `PUT` → `action: "user.update"`.
  - `DELETE` → `action: "user.delete"`.
- [ ] `app/api/subscription/create/route.ts`:
  - `action: "subscription.preapproval_created"` con `metadata: { plan, preapprovalId }`.
- [ ] `app/api/webhooks/mercadopago/route.ts`:
  - `actorType: "WEBHOOK"`, `action: "subscription.synced"`, `metadata: { rawMpStatus, mappedStatus, preapprovalId, storeId }`.

### 3.3 Endpoint de lectura de audit

- [ ] Crear `app/api/super-admin/audit/route.ts` (sólo `GET`):
  - Llama `requireSuperAdmin()`.
  - Soporta query params: `actorType`, `action`, `storeId`, `actorUserId`, `from`, `to`, `page`, `limit`.
  - Devuelve `{ items, total, page, limit }`.

### 3.4 UI mínima de audit

- [ ] Crear `app/super-admin/audit/page.tsx`:
  - Server component que llama `/api/super-admin/audit` (o directamente `queryAudit` si estamos en server).
  - Tabla simple: timestamp, actor, store, action, target.
  - Sin filtros avanzados en esta fase (se agregan en FASE 8 con errors).

### 3.5 Tests

- [ ] `lib/audit-service.test.ts` — mocks Prisma.
- [ ] `lib/error-reporter.test.ts` — casos: nuevo error, error repetido en 24h (incrementa occurrences), error viejo (>24h, crea nuevo).
- [ ] `lib/logger.test.ts` — que dispara `reportError` cuando level es error/critical.
- [ ] Verificar en e2e que después de un login, hay un `AuditLog` con `action: "user.login"`.

### 3.6 No-regresión

- [ ] `pnpm test`, `pnpm test:e2e`.

### 3.7 PR

- [ ] Branch: `feature/super-admin-fase-3`.

---

## FASE 4 — Dashboard global

**Objetivo:** el SA ve un panel con métricas reales de toda la plataforma. Sin invents.

**Entregable:** `/super-admin` muestra cards de totales + un chart simple de altas/bajas últimos 30 días.

### 4.1 Servicio de métricas

- [ ] Crear `lib/super-admin/dashboard-service.ts`:
  ```ts
  // Métricas que podemos calcular HOY con el modelo actual:
  // - totalStores: count(stores)
  // - suspendedStores: count(stores WHERE suspendedAt IS NOT NULL)
  // - newStoresLast30d: count(stores WHERE createdAt > now - 30d)
  // - inactiveStoresLast30d: stores sin sales últimos 30d (heurística: no sales.createdAt en rango)
  // - activeSubscriptions: count(subscriptions WHERE status='active')
  // - trialSubscriptions: count WHERE status='trial'
  // - pastDueSubscriptions: count WHERE status='past_due'
  // - canceledSubscriptions: count WHERE status='canceled'
  // - mrrArs: sum(plan='monthly' -> 15000, plan='annual' -> 150000) WHERE status='active'
  // - totalRevenueArs: sum(sales.total WHERE status='completed') — métrica histórica
  // - totalSales: count(sales WHERE status='completed')
  // - totalProducts: count(products)
  // - totalUsers: count(users) (excluir platform-internal)
  // - newSignupsLast30dTimeseries: array de { date, count } para el chart
  // - churnLast30dTimeseries: array de { date, count } (subscriptions que pasaron a canceled/past_due ese día)
  export async function getGlobalMetrics(): Promise<GlobalMetrics> { ... }
  export async function getMrrTimeseries(days: number): Promise<{ date: string; mrrArs: number }[]> { ... }
  export async function getNewSignupsTimeseries(days: number): Promise<{ date: string; count: number }[]> { ... }
  ```

### 4.2 Endpoint

- [ ] Crear `app/api/super-admin/dashboard/metrics/route.ts` (GET):
  - `requireSuperAdmin()`.
  - Query param: `?days=30` (default 30, max 365).
  - Devuelve `{ metrics, signupsTimeseries, churnTimeseries }`.

### 4.3 UI

- [ ] Editar `app/super-admin/page.tsx`:
  - Server component que llama `getGlobalMetrics()` directamente (server-side).
  - Layout: grid de 4 cards de totales principales + 4 cards secundarios + un chart de líneas de "altas vs bajas" últimos 30 días.
  - Reutilizar `recharts` (ya está).
  - Estados: loading skeleton, error, empty.
- [ ] Crear `components/super-admin/metric-card.tsx` (basado en la `StatCard` de `components/dashboard/sales-dashboard.tsx`).

### 4.4 Lo que NO se mete en esta fase

- "Usuarios activos últimos 7 días" (no hay tracking de activity → se agrega en FASE 5 con `lastActivityAt`).
- "Tickets de soporte" (no existe el concepto → futuro).
- "Cohort retention" (no hay base → futuro).

### 4.5 Tests

- [ ] `lib/super-admin/dashboard-service.test.ts` — mocks Prisma, verificar cálculos contra fixtures.
- [ ] `app/api/super-admin/dashboard/metrics/route.test.ts` — auth 401/403, happy path.

### 4.6 No-regresión + PR

- [ ] Smoke test: ver el dashboard con datos reales.
- [ ] Branch: `feature/super-admin-fase-4`.

---

## FASE 5 — Gestión de empresas

**Objetivo:** el SA puede listar, buscar, filtrar y suspender/unsuspender empresas.

**Entregable:** tabla paginada con filtros + página de detalle + acciones de suspensión.

### 5.1 Servicio

- [ ] Crear `lib/super-admin/companies-service.ts`:
  - `listCompanies(filters)` — paginado.
  - `getCompanyDetail(id)` — incluye suscripción actual, métricas históricas (última venta, total ventas, total productos, total usuarios), último admin activo.
  - `suspendCompany({ id, reason, adminUserId, notes })` — setea `Store.suspendedAt`, `suspendedReason`, `suspendedByUserId`, `internalNotes`. Emite audit event.
  - `unsuspendCompany({ id, adminUserId, notes })` — limpia los campos. Emite audit event.

### 5.2 Update del flujo de suscripción

- [ ] Editar `lib/subscription-service.ts` — modificar `enforceSubscriptionAccess`:
  ```ts
  export async function enforceSubscriptionAccess(storeId, feature) {
    // NUEVO: chequear Store.suspendedAt
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { suspendedAt: true } });
    if (store?.suspendedAt) {
      return { allowed: false, reason: "STORE_SUSPENDED", snapshot: await resolveSubscriptionSnapshot(storeId) };
    }
    // resto igual
  }
  ```
- [ ] Editar `app/api/sales/route.ts` — manejar el nuevo `reason` en el 403 (mensaje claro "Tienda suspendida por el administrador").

### 5.3 Endpoints

- [ ] `app/api/super-admin/companies/route.ts` (GET).
- [ ] `app/api/super-admin/companies/[id]/route.ts` (GET).
- [ ] `app/api/super-admin/companies/[id]/suspend/route.ts` (POST).
- [ ] `app/api/super-admin/companies/[id]/unsuspend/route.ts` (POST).

### 5.4 UI

- [ ] `app/super-admin/companies/page.tsx`:
  - Server component con searchParams (`?q=`, `?status=`, `?plan=`, `?suspended=`, `?subscriptionStatus=`, `?from=`, `?to=`, `?page=`).
  - Tabla: name, plan, sub status, suspended, total sales, last activity, created at.
  - Filtros en la parte superior.
  - Paginación.
- [ ] `app/super-admin/companies/[id]/page.tsx`:
  - Detalle: datos de empresa, admin principal, suscripción, métricas (totales, last 30d), botones de acción.
- [ ] `components/super-admin/companies-table.tsx`.
- [ ] `components/super-admin/company-detail.tsx`.
- [ ] `components/super-admin/suspend-company-dialog.tsx` (AlertDialog + form: reason, notes).

### 5.5 Última actividad

- [ ] Definir "última actividad" como `MAX(sale.createdAt)`. Para no agregar columna nueva. (Alternativa: agregar `Store.lastActivityAt` y actualizar en cada venta. Decisión recomendada: **agregar la columna** en FASE 5, actualizarla en `lib/sales-service.ts` después de cada venta atómica. Es barato y acelera queries del dashboard de empresa.)
- [ ] Si se agrega columna, incluir en la migración de FASE 2 retroactivamente (o nueva migración aditiva en FASE 5).

### 5.6 Tests

- [ ] `lib/super-admin/companies-service.test.ts` — list, suspend, unsuspend, 404, audit emitido.
- [ ] `route.test.ts` para cada endpoint nuevo.
- [ ] e2e: SA suspende empresa → admin de tienda intenta vender → 403 con mensaje correcto.

### 5.7 No-regresión + PR

- [ ] Branch: `feature/super-admin-fase-5`.

---

## FASE 6 — Suscripciones administrativas

**Objetivo:** el SA puede ver, cancelar, reactivar, extender y forzar sync de cualquier suscripción. Sin tocar MP.

**Entregable:** tabla de suscripciones + detalle con comparación estado local vs MP + acciones.

### 6.1 Funciones en `lib/subscription-service.ts`

- [ ] Agregar (sin tocar lo existente):
  ```ts
  export async function cancelSubscriptionByAdmin({ storeId, adminUserId, reason, notes }) {
    const sub = await prisma.subscription.findUnique({ where: { storeId } });
    if (!sub) throw new Error("No subscription");
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "canceled",
        previousStatus: sub.status,
        cancelledByAdmin: true,
        cancelledByAdminUserId: adminUserId,
        adminNotes: notes ?? null,
      },
    });
    invalidateSubscriptionCache(storeId);
    return updated;
  }

  export async function reactivateSubscriptionByAdmin({ storeId, adminUserId, notes }) {
    // status -> active, currentPeriodStart = now, currentPeriodEnd = now + intervalDays, trialEndsAt = null
    // NO tocar preapproval en MP
  }

  export async function extendSubscriptionByAdmin({ storeId, adminUserId, extraDays, reason }) {
    // nueva currentPeriodEnd = currentPeriodEnd + extraDays
  }

  export async function forceSyncWithMp(storeId) {
    return resolveSubscriptionSnapshot(storeId); // ya existe, lo invocamos
  }
  ```
- **Importante:** `cancelSubscriptionByAdmin` NO cancela el preapproval en MP. Documentar en UI con warning.

### 6.2 Servicio SA

- [ ] Crear `lib/super-admin/subscriptions-service.ts`:
  - `listSubscriptions(filters)` — join a Store, MP status (consultando MP si hay `mercadoPagoPreapprovalId`, cacheando 5 min).
  - `getSubscriptionDetail(id)` — local + MP snapshot + historial (audit).
  - Wrappers que llaman a las funciones de `subscription-service.ts` y emiten audit.

### 6.3 Endpoints

- [ ] `app/api/super-admin/subscriptions/route.ts` (GET).
- [ ] `app/api/super-admin/subscriptions/[id]/route.ts` (GET).
- [ ] `app/api/super-admin/subscriptions/[id]/cancel/route.ts` (POST).
- [ ] `app/api/super-admin/subscriptions/[id]/reactivate/route.ts` (POST).
- [ ] `app/api/super-admin/subscriptions/[id]/extend/route.ts` (POST, body: `{ extraDays, reason }`).
- [ ] `app/api/super-admin/subscriptions/[id]/sync-with-mp/route.ts` (POST).

### 6.4 UI

- [ ] `app/super-admin/subscriptions/page.tsx` — tabla con: store, plan, local status, MP status (badge con color), period end, last sync.
- [ ] `app/super-admin/subscriptions/[id]/page.tsx` — detalle + acciones.
- [ ] `components/super-admin/subscription-detail.tsx`.
- [ ] `components/super-admin/cancel-subscription-dialog.tsx` — con warning explícito sobre MP.
- [ ] `components/super-admin/extend-subscription-dialog.tsx`.

### 6.5 Cache

- [ ] Si el endpoint lista muchas suscripciones y consulta MP, agregar cache en memoria o reusar `subscriptionCache` (ya existe, TTL 5 min).

### 6.6 Tests

- [ ] `lib/subscription-service.test.ts` — agregar tests para las 4 funciones nuevas.
- [ ] `lib/super-admin/subscriptions-service.test.ts`.
- [ ] e2e: SA cancela → empresa intenta cobrar → 403.

### 6.7 No-regresión + PR

- [ ] Branch: `feature/super-admin-fase-6`.

---

## FASE 7 — Cupones / promociones

**Objetivo:** CRUD de cupones, redenciones, integración con `POST /api/subscription/create`.

**Entregable:** gestión completa + aplicar cupón al crear suscripción.

### 7.1 Servicio

- [ ] Crear `lib/super-admin/coupons-service.ts`:
  - `listCoupons(filters)`.
  - `getCouponDetail(id)`.
  - `createCoupon(input)`.
  - `updateCoupon(id, input)` — sólo metadata; si ya hay redenciones, NO permitir cambiar `discountValue` ni `discountType` (deprecation policy).
  - `toggleCoupon(id, isActive)`.
  - `getRedemptions(couponId)`.
  - `validateAndRedeemCoupon({ code, storeId, subscriptionId, plan, redeemedByUserId })`:
    - Valida: activo, no expirado, `redeemedCount < maxRedemptions`, plan ∈ `applicablePlans` (o todas).
    - Calcula `discountApplied` y `durationDays` para extender suscripción.
    - Crea `CouponRedemption` con `@@unique([couponId, subscriptionId])` que evita doble uso.
    - Incrementa `redeemedCount` atómicamente.
    - Devuelve `{ discountApplied, newPeriodEnd }`.
- [ ] Si el cupón es `FIXED` con `durationDays`, la suscripción se extiende con `extendSubscriptionByAdmin` (de FASE 6) usando `notes: "cupón {code}"`. Esto da una traza clara.

### 7.2 Integración con suscripción existente

- [ ] Editar `app/api/subscription/create/route.ts`:
  - Body ahora acepta `couponCode?: string`.
  - Si viene, llama `validateAndRedeemCoupon` después de crear el preapproval pero antes de persistir.
  - Si cupón es válido, pasa el `newPeriodEnd` al upsert de `Subscription`.
  - Si cupón es inválido, **rechaza la request** (no aplica parcialmente).

### 7.3 Endpoints

- [ ] `app/api/super-admin/coupons/route.ts` (GET, POST).
- [ ] `app/api/super-admin/coupons/[id]/route.ts` (GET, PATCH).
- [ ] `app/api/super-admin/coupons/[id]/toggle/route.ts` (POST).
- [ ] `app/api/super-admin/coupons/[id]/redemptions/route.ts` (GET).

### 7.4 UI

- [ ] `app/super-admin/coupons/page.tsx` — tabla con code, type, value, active, redeemed/max, expires.
- [ ] `app/super-admin/coupons/new/page.tsx` y `[id]/edit/page.tsx`.
- [ ] `app/super-admin/coupons/[id]/page.tsx` — detalle + redenciones.
- [ ] `components/super-admin/coupon-form.tsx`, `coupons-table.tsx`.
- [ ] Editar `components/subscription/subscription-management.tsx` (cliente de tienda) — agregar input opcional de `couponCode`.

### 7.5 Tests

- [ ] `lib/super-admin/coupons-service.test.ts`:
  - Cupón expirado → reject.
  - Cupón agotado → reject.
  - Plan no aplicable → reject.
  - Doble redención (misma subscription) → reject.
  - Cupón válido → redemption creada, `redeemedCount` incrementado.
- [ ] e2e: admin de tienda aplica cupón válido → suscripción se crea extendida → SA ve la redención en `/super-admin/coupons/[id]`.

### 7.6 No-regresión + PR

- [ ] Branch: `feature/super-admin-fase-7`.

---

## FASE 8 — Errores y monitoreo

**Objetivo:** el SA ve errores importantes agrupados y puede resolverlos.

**Entregable:** `/super-admin/errors` con tabla agrupada por fingerprint + acción "resolver".

### 8.1 Hooks `reportError`

Sin tocar la lógica, agregar al `catch` de:

- [ ] `lib/mercadopago.ts` (ambas funciones).
- [ ] `app/api/webhooks/mercadopago/route.ts`.
- [ ] `app/api/sales/route.ts` (POST).
- [ ] `lib/sales-service.ts` (función `createSale`).
- [ ] `app/api/subscription/create/route.ts`.
- [ ] Cualquier endpoint de auth.

Patrón recomendado:
```ts
} catch (error) {
  reportError({ source: "API", severity: "ERROR", message: error?.message ?? "Unknown", stack: error?.stack, storeId, path: req.url, method: req.method, statusCode: 500 }).catch(() => {});
  return errorResponse(...);
}
```

### 8.2 Servicio

- [ ] Crear `lib/super-admin/errors-service.ts`:
  - `queryErrors(filters)` — paginado, filtros por source/severity/storeId/resolved/fecha/fingerprint.
  - `markResolved({ id, adminUserId })`.
  - `getErrorStats()` — top fingerprints, counts por severity, etc.

### 8.3 Endpoints

- [ ] `app/api/super-admin/errors/route.ts` (GET).
- [ ] `app/api/super-admin/errors/[id]/resolve/route.ts` (POST).

### 8.4 UI

- [ ] `app/super-admin/errors/page.tsx` — tabla con: fingerprint (truncado), source, severity, occurrences, last seen, store, message preview, resolved.
- [ ] Click en fila → drawer/dialog con stack, metadata, histograma de occurrences.
- [ ] Botón "Marcar resuelto" por fila.
- [ ] `components/super-admin/errors-table.tsx`, `error-detail-dialog.tsx`.

### 8.5 Tests

- [ ] `lib/error-reporter.test.ts` (ya creado en FASE 3) — verificar nuevos sources.
- [ ] `lib/super-admin/errors-service.test.ts`.
- [ ] e2e: forzar un error en una ruta → SA lo ve en `/super-admin/errors` → marca resuelto → desaparece de la lista de activos.

### 8.6 No-regresión + PR

- [ ] Branch: `feature/super-admin-fase-8`.

---

## Apéndice A — Checklist por fase (plantilla)

Copiá y pegá esto al abrir cada PR:

```markdown
## Fase N — [título]

### Cambios
- [ ] Schema (si aplica)
- [ ] Servicios
- [ ] Endpoints
- [ ] UI
- [ ] Audit hooks
- [ ] Error hooks

### Tests
- [ ] Unit: `pnpm test` (verde)
- [ ] E2E: `pnpm test:e2e` (verde)
- [ ] Cobertura del código nuevo

### Verificación manual
- [ ] Smoke test del flujo de tienda (no-regresión)
- [ ] Smoke test del flujo SA nuevo
- [ ] Edge case: admin de tienda intentando ruta SA → 403
- [ ] Edge case: SA sin sesión → 401

### Auditoría
- [ ] Cada acción sensible emite `recordAuditEvent`
- [ ] Cada error capturable emite `reportError`

### PR
- [ ] Branch: `feature/super-admin-fase-N`
- [ ] Descripción clara
- [ ] Screenshots de la UI nueva (si aplica)
```

---

## Apéndice B — Convenciones de commit

Seguir conventional commits, **sin** Co-Authored-By:

```
feat(super-admin): phase 1 — security guard and role flag
feat(super-admin): phase 2 — schema for coupons, audit, errors
feat(super-admin): phase 3 — audit logger and error reporter
feat(super-admin): phase 4 — global metrics dashboard
feat(super-admin): phase 5 — companies listing and suspension
feat(super-admin): phase 6 — admin subscription actions
feat(super-admin): phase 7 — coupon management
feat(super-admin): phase 8 — error monitoring
test(super-admin): ...
fix(super-admin): ...
refactor(super-admin): ...
```

---

## Apéndice C — Variables de entorno (consolidado)

Agregar a `.env.example` a medida que se necesiten:

```env
# FASE 1
SUPER_ADMIN_EMAILS="tu@email.com"

# FASE 6 (opcional, para sync MP desde SA — reusar las existentes)
MERCADO_PAGO_ACCESS_TOKEN="..."
MERCADO_PAGO_WEBHOOK_SECRET="..."
NEXT_PUBLIC_APP_URL="https://..."
```

---

## Apéndice D — Riesgos y cosas a NO hacer

1. **NO cancelar preapprovals en MP desde el SA en FASE 6.** El plan es cancelación local + flag. Cancelar en MP es FASE futura.
2. **NO modificar `markSubscriptionFromWebhook` ni `mapMercadoPagoStatusToSubscriptionStatus`.** El sync MP se mantiene intacto.
3. **NO mezclar nav de tienda con nav de SA.** Rutas y layouts separados.
4. **NO usar `User.role === "super_admin"`.** Usar `User.isSuperAdmin` (campo nuevo).
5. **NO permitir que un SA se impersone a sí mismo como admin de tienda en FASE 1-8.** Eso es FASE futura.
6. **NO borrar audit logs ni app errors.** Append-only. La única operación permitida es `markResolved` (que sólo cambia `resolvedAt` y `resolvedByUserId`).
7. **NO saltar SDD en fases que tocan schema o servicios grandes** (4, 5, 6, 7). El repo tiene `strict_tdd: true` y la convención es mantener el flujo.
8. **NO agregar dependencias nuevas innecesarias.** Para charts ya está `recharts`. Para tablas, shadcn/ui. Para nada más hace falta.

---

## Apéndice E — Orden recomendado si tenés que paralelizar

Las fases 4 y 5 son relativamente independientes. Si necesitás avanzar en paralelo (vos + otro dev), el orden seguro para worktrees separados:

- **Stream A:** FASE 1 → FASE 4 → FASE 6.
- **Stream B:** FASE 2 → FASE 3 → FASE 5 → FASE 7.
- **FASE 8** la hace quien termine primero.

Pero siempre mergear FASE 1 antes de empezar FASE 2 (porque la fase 1 introduce el campo `isSuperAdmin` que se referencia en la 2 si decidís ponerlo en la misma migración, aunque sea de aditiva).

---

*Fin del documento. Cualquier cambio de scope, abrir issue o actualizar este archivo antes de empezar la fase afectada.*
