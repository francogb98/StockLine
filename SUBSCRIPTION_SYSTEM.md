# SUBSCRIPTION_SYSTEM.md

> Estado real del sistema de suscripciones segun codigo actual. Ultima verificacion: 2026-03-31.

---

## 1) Overview del sistema

El sistema de suscripciones en VendePro se implementa sobre:

- Modelo `Subscription` en Prisma (1:1 con `Store`).
- API interna para estado y creacion de suscripcion.
- Integracion con Mercado Pago usando `preapproval`.
- Webhook para sincronizar estado desde Mercado Pago.
- Gate de acceso a ventas en backend (`POST /api/sales`).

Flujo end-to-end actual:

1. Creacion de store -> trial:
- En `POST /api/auth/register` se crea, dentro de transaccion, `Store` + `User admin` + `Subscription`.
- La suscripcion se crea con:
  - `status = "trial"`
  - `plan = "monthly"`
  - `trialEndsAt = now + 15 dias`
  - `currentPeriodStart = now`
  - `currentPeriodEnd = trialEndsAt`

2. Seleccion de plan:
- Admin entra a UI de suscripcion y elige `monthly` o `annual`.
- Frontend llama `POST /api/subscription/create`.

3. Pago con Mercado Pago:
- Backend crea un `preapproval` en Mercado Pago.
- Guarda `mercadoPagoPreapprovalId` en DB.
- Devuelve `initPoint` o `sandboxInitPoint`.
- Frontend redirige al usuario a ese link.

4. Webhook:
- Mercado Pago llama `POST /api/webhooks/mercadopago`.
- El backend toma el `preapprovalId`, consulta Mercado Pago y sincroniza estado local.

5. Activacion de suscripcion:
- Si Mercado Pago reporta `approved`, se pasa a `active`.
- Se actualizan `currentPeriodStart/currentPeriodEnd` con datos del preapproval.
- `trialEndsAt` se limpia (`null`) cuando queda `active`.

6. Bloqueo por vencimiento:
- Si trial vence, en lectura de estado (`resolveSubscriptionSnapshot`) se migra a `past_due` automaticamente.
- Si esta `past_due` o `canceled`, `POST /api/sales` responde 403 y bloquea ventas.

---

## 2) Modelo de datos (Prisma)

Modelo final implementado:

```prisma
model Subscription {
  id                       String    @id @default(uuid())
  storeId                  String    @unique
  store                    Store     @relation(fields: [storeId], references: [id])
  status                   String
  plan                     String
  currentPeriodStart       DateTime
  currentPeriodEnd         DateTime
  trialEndsAt              DateTime?
  mercadoPagoPreapprovalId String?
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt

  @@map("subscriptions")
}
```

Campos y uso real:

- `status`
  - Estados esperados: `trial`, `active`, `past_due`, `canceled`.
  - Se escribe en:
    - alta inicial (`trial`)
    - vencimiento de trial (`past_due`)
    - webhook Mercado Pago (`active/past_due/canceled`).

- `plan`
  - Valores: `monthly`, `annual`.
  - Alta: `monthly` por defecto en registro.
  - Cambio: en `POST /api/subscription/create` y en webhook (inferido por `frequency_type`).

- `trialEndsAt`
  - Solo se usa durante trial.
  - Se setea al registrar la tienda.
  - Se mantiene en no-activa; al pasar a `active` se limpia (`null`).

- `currentPeriodEnd`
  - En trial: coincide con `trialEndsAt`.
  - En create subscription: se setea tentativamente a `now + intervalo plan`.
  - En webhook: se actualiza con `next_payment_date` (si viene); si no viene, se calcula por intervalo.

- `mercadoPagoPreapprovalId`
  - Se guarda al crear preapproval.
  - Es la clave de correlacion para que webhook encuentre la suscripcion local.

---

## 3) Logica de estados

Estados soportados:

- `trial`
- `active`
- `past_due`
- `canceled`

Transiciones implementadas:

1. Inicio de trial:
- Trigger: registro (`/api/auth/register`) o autocreacion (`getOrCreateSubscription`).
- Resultado: `trial` con 15 dias.

2. Trial vencido -> `past_due`:
- Trigger: lectura de estado (`resolveSubscriptionSnapshot`) cuando `trialEndsAt < now`.
- Resultado: update automatico a `past_due`.

3. Preapproval aprobado -> `active`:
- Trigger: webhook y consulta de estado MP `approved`.
- Resultado: `active`, actualiza periodo, limpia `trialEndsAt`.

4. Preapproval rechazado -> `past_due`:
- Trigger: webhook y estado MP `rejected`.
- Resultado: `past_due`.

5. Preapproval cancelado -> `canceled`:
- Trigger: webhook y estado MP `cancelled`.
- Resultado: `canceled`.

6. Cualquier estado MP no reconocido -> `past_due`:
- Trigger: normalizacion defensiva.
- Resultado: `past_due`.

Ejemplos reales:

- Ejemplo A (alta normal):
  - Dia 0: registro -> `trial`.
  - Dia 16: primer `GET /api/subscription/status` despues del vencimiento -> pasa a `past_due`.

- Ejemplo B (pago aprobado):
  - Admin crea preapproval desde UI.
  - Usuario completa flujo MP.
  - Webhook llega con id.
  - DB queda `active`.

- Ejemplo C (pago fallido/rechazado):
  - Webhook reporta `rejected`.
  - DB queda `past_due`.

Nota importante:

- No hay proceso automatico que degrade `active` a `past_due` solo por fecha vencida.
- El cambio periodico depende de webhooks/estados de Mercado Pago.

---

## 4) Integracion con Mercado Pago

Creacion de suscripcion (preapproval):

- Endpoint interno: `POST /api/subscription/create`.
- Funcion usada: `createMercadoPagoPreapproval()`.
- Endpoint externo MP: `POST https://api.mercadopago.com/preapproval`.

Datos que se envian a MP:

```json
{
  "reason": "VendePro Mensual|Anual",
  "external_reference": "<storeId>",
  "payer_email": "<email_admin>",
  "back_url": "<NEXT_PUBLIC_APP_URL>/app",
  "status": "pending",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months|years",
    "transaction_amount": 15000|150000,
    "currency_id": "ARS",
    "start_date": "<ISO now>"
  }
}
```

Respuesta usada por la app:

- `id` (preapproval id)
- `init_point`
- `sandbox_init_point`

La app devuelve al frontend:

- `preapprovalId`
- `initPoint`
- `sandboxInitPoint`
- `plan`
- `amountArs`

---

## 5) Webhooks (critico)

Endpoint implementado:

- `POST /api/webhooks/mercadopago`

Como identifica el preapproval:

- `body.data.id`
- o `body.id`
- o query param `?id=`

Validacion de seguridad actual:

- En desarrollo, si no existe `MERCADO_PAGO_WEBHOOK_SECRET`, se permite webhook sin header.
- En produccion, `MERCADO_PAGO_WEBHOOK_SECRET` es obligatorio y la app falla al iniciar si falta.
- Si el header `x-webhook-secret` falta, responde `401`.
- Si el header existe pero no coincide, responde `403`.

Que hace al recibir webhook:

1. Loguea el payload completo recibido (incluye `type`, `topic`, `action`).
2. Filtra eventos no relacionados a suscripciones:
   - Si `body.type === "payment"` se ignora y responde `{ ok: true, ignored: true, reason: "not-subscription" }`.
   - Si `body.topic` o `body.resource` esta en `{ subscription_preapproval, preapproval, preapproval_plan }` se procesa.
3. Extrae `preapprovalId` (de `body.data.id` / `body.id` / `?id=`).
4. Si no hay id, responde `{ ok: true, ignored: true }`.
5. Consulta MP: `GET /preapproval/{id}`.
6. Loguea el resultado completo de MP y el estado mapeado.
7. Llama a `markSubscriptionFromWebhook(...)` para actualizar DB.

Mapeo de estado MP -> local (preapproval):

| Estado MP (preapproval) | Estado interno | Notas |
| --- | --- | --- |
| `authorized` | `active` | Preapproval con metodo de pago valido. Pago aprobado, suscripcion activa y recurrente. |
| `approved` | `active` | Compatibilidad legacy / payments puntuales. |
| `canceled` (US) | `canceled` | Preapproval terminado (irreversible). |
| `cancelled` (UK) | `canceled` | Aceptado por tolerancia. |
| `paused` | `past_due` | Suscripcion pausada por el usuario. Se bloquea acceso a ventas. |
| `rejected` | `past_due` | Pago rechazado. |
| `pending` | (ignorado) | Preapproval sin pago todavia. NO degrada el estado local. |
| desconocido | `past_due` | Default defensivo. |

Referencia: documentacion oficial de MP
(`https://www.mercadopago.com.ar/developers/en/reference/online-payments/subscriptions/get-preapproval/get`).
Estados validos de un preapproval: `pending`, `authorized`, `paused`, `canceled`.

> Importante: el sistema NO usa `approved`/`rejected` para preapprovals. Si en
> logs ves `rawMpStatus=authorized mappedStatus=active`, el mapeo es correcto.
> Si ves `rawMpStatus=authorized mappedStatus=past_due` es porque se esta
> corriendo una version vieja del codigo.

Si falla webhook:

- Devuelve 500.
- No hay cola/retry interno en la app.
- La consistencia depende de reintentos de Mercado Pago o reprocesamiento manual.

---

## 6) Control de acceso

Donde se valida suscripcion:

- Backend: `POST /api/sales` llama `enforceSubscriptionAccess(storeId, "sales")`.
- Compatibilidad: `enforceSalesAccess(storeId)` sigue existiendo como wrapper hacia el guard central.
- Si status es `past_due` o `canceled`, responde 403 con mensaje de bloqueo.

Endpoints hoy afectados por suscripcion:

- Protegido por suscripcion:
  - `POST /api/sales`

- No protegido por suscripcion (si autenticado/segun ruta):
  - Lectura de estado (`/api/subscription/status`)
  - Creacion de suscripcion (`/api/subscription/create`, solo admin)
  - Otras rutas no usan `enforceSalesAccess`.

Comportamiento en frontend:

- `PaymentPanel` deshabilita boton cobrar cuando `past_due` o `canceled`.
- Se muestra mensaje "Suscripcion vencida...".

---

## 7) Frontend

Pagina de suscripcion:

- Componente: `SubscriptionManagement`.
- Muestra:
  - estado
  - plan
  - fecha de vencimiento
  - dias restantes
- Permite elegir plan y disparar `POST /api/subscription/create`.
- Si recibe URL de MP, redirige en navegador.

Sidebar/Header (estado):

- `SubscriptionStatusBadge` se muestra en header de app y POS.
- Etiquetas:
  - `active`: "Suscripcion activa"
  - `trial`: "Trial - X dias restantes"
  - resto: "Suscripcion vencida"

Landing (planes):

- Muestra precios y trial de 15 dias en seccion comercial.
- Es informativa (no crea suscripcion directamente).

Como obtiene estado desde backend:

- `store-context` llama `GET /api/subscription/status` al tener usuario autenticado.
- Guarda snapshot en `AuthContext.subscription`.
- `refreshSubscription()` se usa tambien luego de crear suscripcion (si no hubo redireccion inmediata).

---

## 8) Variables de entorno (muy importante)

Variables necesarias para que suscripciones funcionen:

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/stockdb?schema=public"

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-..."
MERCADO_PAGO_WEBHOOK_SECRET="tu-secreto-interno-opcional"

# URL publica de la app para back_url
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"

# Modo mock frontend (si esta en 1, no usa backend real)
NEXT_PUBLIC_USE_MOCK_DATA="0"
```

Detalle por variable:

- `DATABASE_URL`
  - Que es: conexion PostgreSQL usada por Prisma.
  - Donde se consigue: proveedor DB (local, Railway, etc.).
  - Obligatoria: si.
  - Ejemplo: `postgresql://postgres:pass@localhost:5432/stockdb?schema=public`.

- `MERCADO_PAGO_ACCESS_TOKEN`
  - Que es: token privado para API server-to-server de MP.
  - Donde se consigue: panel de desarrolladores de Mercado Pago, credenciales de la aplicacion.
  - Obligatoria: si para crear/consultar preapproval.
  - Ejemplo: `APP_USR-123456...`.

- `MERCADO_PAGO_WEBHOOK_SECRET`
  - Que es: secreto propio de esta app para validar header `x-webhook-secret`.
  - Donde se consigue: lo definis vos manualmente (no lo entrega MP automaticamente para este flujo).
  - Obligatoria: si en produccion; opcional en desarrollo.
  - Ejemplo: `vendpro_webhook_2026_supersecret`.

- `NEXT_PUBLIC_APP_URL`
  - Que es: base URL para armar `back_url` que MP usa al volver a la app.
  - Donde se consigue: URL publica de tu deployment.
  - Obligatoria: recomendada en produccion; si falta usa `http://localhost:3000`.
  - Ejemplo: `https://app.vendepro.com`.

- `NEXT_PUBLIC_USE_MOCK_DATA`
  - Que es: flag de frontend para modo demo.
  - Donde se consigue: configuracion local.
  - Obligatoria: no.
  - Ejemplo: `0`.

Aclaracion importante:

- `MERCADO_PAGO_PUBLIC_KEY` no se usa en el codigo actual.
- `APP_URL` tampoco se usa; la variable real utilizada es `NEXT_PUBLIC_APP_URL`.

---

## 9) Configuracion manual (paso a paso)

### A) Mercado Pago

1. Crear aplicacion en Mercado Pago Developers.
2. Obtener `ACCESS_TOKEN` de entorno correspondiente (test/prod).
3. Configurar webhook hacia:
- `https://tu-dominio.com/api/webhooks/mercadopago`
4. Si vas a exigir secreto, configurar envio de header:
- `x-webhook-secret: <MERCADO_PAGO_WEBHOOK_SECRET>`
5. Verificar que MP pueda alcanzar la URL (sin bloqueos de red/firewall).

### B) Base de datos

1. Configurar `DATABASE_URL`.
2. Ejecutar migraciones:

```bash
pnpm prisma:migrate
```

3. (Opcional) Cargar seed:

```bash
pnpm prisma:seed
```

### C) App

1. Completar `.env` con variables necesarias.
2. Instalar dependencias:

```bash
pnpm install
```

3. Levantar servidor:

```bash
pnpm dev
```

4. Crear cuenta nueva desde `/register` para validar flujo trial.

---

## 10) Como testear el sistema

### Trial

Objetivo: validar alta y vencimiento.

1. Registrar nueva tienda/usuario admin.
2. Consultar:

```http
GET /api/subscription/status
```

Esperado inicial:
- `status: "trial"`
- `daysRemaining > 0`

3. Simular vencimiento (DB): poner `trialEndsAt` en fecha pasada.
4. Volver a consultar `GET /api/subscription/status`.
5. Esperado:
- se actualiza a `past_due`.

### Pago aprobado

Objetivo: validar activacion por webhook.

1. Desde UI suscripcion, crear plan (monthly/annual).
2. Completar flujo de MP con usuario de prueba que apruebe.
3. Esperar webhook o dispararlo manualmente con `id` de preapproval.
4. Consultar `GET /api/subscription/status`.
5. Esperado:
- `status: "active"`
- `trialEndsAt: null`

### Pago fallido/rechazado

Objetivo: validar bloqueo.

1. Generar escenario `rejected` en MP (cuenta/tarjeta de test).
2. Verificar webhook procesado.
3. Consultar estado.
4. Esperado:
- `status: "past_due"`

5. Intentar venta:

```http
POST /api/sales
```

Esperado:
- HTTP 403
- mensaje de suscripcion vencida.

Endpoints clave de prueba:

- `POST /api/auth/register`
- `GET /api/subscription/status`
- `POST /api/subscription/create`
- `POST /api/webhooks/mercadopago`
- `POST /api/sales`

---

## 11) Problemas conocidos / consideraciones

1. Dependencia fuerte de webhook:
- Sin webhook exitoso, la DB puede quedar desfasada respecto de MP.

2. Validacion webhook custom:
- No usa validacion criptografica nativa de MP.
- Solo compara header `x-webhook-secret` si se configuro.

3. Validacion webhook custom minima:
- No usa firma criptografica avanzada de Mercado Pago.
- La proteccion actual es por secreto compartido (`x-webhook-secret`).

4. Persistencia optimista de ventas en frontend:
- El frontend agrega venta local antes de confirmar resultado HTTP.
- Si backend rechaza por suscripcion, puede haber inconsistencia visual temporal.

5. Correlacion webhook por `mercadoPagoPreapprovalId`:
- Si no existe ese id en DB, el webhook no actualiza ninguna suscripcion (`return null`).

---

## Sincronizacion y consistencia

El sistema ahora aplica una estrategia de consistencia en runtime para reducir desincronizacion entre DB y Mercado Pago sin depender solo del webhook.

Puntos clave:

1. Expiracion automatica de `active` en lectura:
- En `resolveSubscriptionSnapshot`, si `status === "active"` y `currentPeriodEnd < now`, se persiste `past_due` en DB.
- Esto es lazy evaluation (sin cron job) y ocurre al resolver estado.

2. Revalidacion en caliente contra Mercado Pago:
- Si existe `mercadoPagoPreapprovalId`, se consulta `GET /preapproval/{id}` en runtime cuando:
  - `status === "past_due"`
  - `status === "active"` vencido
  - se detecta estado inconsistente local

3. Correccion automatica de drift:
- Si el estado de MP difiere del estado local, se sincroniza reutilizando `markSubscriptionFromWebhook(...)`.
- El mapeo MP -> estado local no se duplica.
- Si coincide, no se escribe DB (idempotencia).

---

## Seguridad del webhook

Seguridad minima implementada:

1. Secreto obligatorio en produccion:
- Si `NODE_ENV === "production"` y falta `MERCADO_PAGO_WEBHOOK_SECRET`, la app lanza error al inicializar.

2. Validacion de request entrante:
- Header `x-webhook-secret` faltante -> `401`.
- Header presente pero invalido -> `403`.

3. Desarrollo vs produccion:
- En desarrollo, se permite webhook sin secreto para facilitar pruebas locales.
- En produccion, no se aceptan requests sin secreto valido.

---

## Resolucion de estado (runtime)

`resolveSubscriptionSnapshot(storeId)` resuelve y corrige estado en este orden:

1. Lee DB:
- Carga (o crea) la suscripcion local para la tienda.

2. Evalua expiraciones:
- Si `trial` vencio, migra a `past_due`.
- Si `active` vencio por `currentPeriodEnd`, migra a `past_due`.

3. Consulta Mercado Pago (si aplica):
- Si hay `mercadoPagoPreapprovalId` y se cumple una condicion de revalidacion, consulta `GET /preapproval/{id}`.

4. Sincroniza estado:
- Si MP y DB difieren, actualiza usando `markSubscriptionFromWebhook(...)`.
- Si no difieren, conserva estado y evita escrituras innecesarias.

Logs minimos de trazabilidad:

- webhook recibido
- intento de sync con MP
- cambios de estado efectivos

Formato de transicion:

```ts
[Subscription] storeId=... status: past_due -> active (source=webhook)
```

---

## 12) Que se puede modificar sin romper el sistema

Cambios seguros (con cuidado normal):

- Cambiar precios:
  - Editar `SUBSCRIPTION_PLANS.amountArs`.

- Cambiar duracion trial:
  - Editar `SUBSCRIPTION_TRIAL_DAYS`.

- Ajustar labels UI:
  - Textos en `SubscriptionManagement` y `SubscriptionStatusBadge`.

- Cambiar intervalos plan:
  - `frequency`, `frequencyType`, `intervalDays` en config.

Cambios que requieren especial cuidado:

- No cambiar nombres de estado sin actualizar todo:
  - `trial|active|past_due|canceled` se usan en backend y frontend.

- No romper mapeo de webhook:
  - conversion MP -> estado local en `markSubscriptionFromWebhook`.

- No quitar `mercadoPagoPreapprovalId`:
  - es clave para encontrar la suscripcion al procesar webhook.

- No cambiar endpoint webhook sin actualizar MP:
  - URL y secreto deben quedar sincronizados con configuracion externa.

- Si cambias estructura Prisma de `Subscription`:
  - crear migracion y revisar `resolveSubscriptionSnapshot`, `create`, `webhook`, y componentes.

---

## Anexo rapido de codigo relevante

- Modelo: `prisma/schema.prisma` (`Subscription`)
- Config planes/trial: `lib/subscription-config.ts`
- Regla negocio: `lib/subscription-service.ts`
- MP API client: `lib/mercadopago.ts`
- Estado suscripcion: `app/api/subscription/status/route.ts`
- Crear preapproval: `app/api/subscription/create/route.ts`
- Webhook MP: `app/api/webhooks/mercadopago/route.ts`
- Bloqueo ventas: `app/api/sales/route.ts`
- Alta con trial: `app/api/auth/register/route.ts`
- UI gestion: `components/subscription/subscription-management.tsx`
- Badge estado: `components/subscription/subscription-status-badge.tsx`
- Context frontend: `lib/store-context.tsx`
