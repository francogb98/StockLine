# SUBSCRIPTION_SYNC_STRATEGY.md

> Estrategia de sincronizacion para mantener consistencia entre DB local y Mercado Pago.

## Objetivo

Evitar drift de estado entre `Subscription` local y `preapproval` de Mercado Pago, manteniendo simplicidad e idempotencia.

## Flujo de sincronizacion

1. Fuente webhook (push):
- Mercado Pago notifica `POST /api/webhooks/mercadopago`.
- Backend valida secreto (`x-webhook-secret`).
- Backend consulta `GET /preapproval/{id}`.
- Backend sincroniza por `markSubscriptionFromWebhook(...)`.

2. Fuente runtime (pull lazy):
- Cualquier lectura de estado via `resolveSubscriptionSnapshot` puede disparar revalidacion.
- Se consulta Mercado Pago solo en casos gatillo:
  - `past_due`
  - `active` vencido
  - inconsistencia local
- Si MP difiere, se sincroniza con la misma logica del webhook.

3. Persistencia idempotente:
- Si MP y DB coinciden, no se escribe DB.
- Si difieren, se aplica una unica transicion de estado.

## Orden de resolucion runtime

1. Leer estado local desde DB.
2. Aplicar expiraciones locales (`trial` y `active` vencidos -> `past_due`).
3. Consultar Mercado Pago si aplica.
4. Corregir estado local si hay diferencia.

## Edge cases

### 1) Webhook fallido

Situacion:
- El webhook falla por red, timeout o error temporal.

Resultado:
- DB puede quedar desactualizada temporalmente.

Mitigacion actual:
- Revalidacion runtime en lecturas de estado corrige drift cuando hay trafico.

### 2) Estado desactualizado en DB

Situacion:
- DB queda `past_due` pero MP ya esta `approved`.

Resultado:
- Sincronizacion runtime detecta diferencia y pasa a `active`.

Mitigacion actual:
- `resolveSubscriptionSnapshot` consulta MP y reutiliza `markSubscriptionFromWebhook(...)`.

### 3) Mercado Pago caido o no disponible

Situacion:
- `GET /preapproval/{id}` falla.

Resultado:
- Se conserva estado local actual.
- Se registra log de error para trazabilidad.

Mitigacion actual:
- No se rompe endpoint de estado por la falla de MP.
- La siguiente lectura/webhook puede reintentar sincronizacion.

## Logging minimo recomendado

Eventos:
- webhook recibido
- intento de sync con MP
- transicion de estado
- no-op por estado ya sincronizado

Formato:

```ts
[Subscription] storeId=... status: past_due -> active (source=webhook)
```

## Decisiones de diseno

- Sin cron jobs en esta etapa.
- Sin cambios de esquema Prisma.
- Sin estados nuevos.
- Sin duplicar mapeo MP -> estado local.

## Futuras mejoras (fuera de alcance)

- Firma criptografica avanzada de webhook.
- Reintentos con backoff para runtime sync.
- Job de reconciliacion periodico opcional para stores sin trafico.
