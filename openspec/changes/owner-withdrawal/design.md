# Design: owner-withdrawal

## Overview

Admin-only flow for recording an owner withdrawal (gift, personal consumption, off-the-books sale). The change adds a new `OWNER_WITHDRAWAL` value to the existing `MovementType` enum, a single `POST /api/stock-movements/owner-withdrawal` endpoint, and a sibling dialog next to the existing "Ajustar stock" button. The data-access function uses the `prisma.$transaction(async (tx) => …)` callback form to write the real `previousStock` and `newStock` values to the `StockMovement` row — explicitly avoiding the pre-existing array-form bug in `adjustStock`, which is a non-goal of this change. The feature is fully decoupled from cash sessions: no `cashSessionId` is added, and no `CashMovement` is created.

## Data Model Changes

### `prisma/schema.prisma` (line 197–205)

Append one value to the existing `MovementType` enum. Ordering: append at the end to keep the diff minimal and the migration a single `ADD VALUE`.

```prisma
enum MovementType {
  SALE
  RETURN
  MANUAL_ADJUSTMENT
  PRODUCT_CREATION
  IMPORT
  STOCK_CORRECTION
  CANCELLATION
  OWNER_WITHDRAWAL
}
```

No other Prisma model changes. Confirmed:
- No `cashSessionId` on `StockMovement` (decoupled from cash sessions per Q3).
- No new `MovementType`-related model.
- `StockMovement` schema (lines 207–219) stays as-is.

### `lib/types.ts` (line 73–80)

Extend the `MovementType` union:

```ts
export type MovementType =
  | "SALE"
  | "RETURN"
  | "MANUAL_ADJUSTMENT"
  | "PRODUCT_CREATION"
  | "IMPORT"
  | "STOCK_CORRECTION"
  | "CANCELLATION"
  | "OWNER_WITHDRAWAL";
```

### Test store type compatibility (verified)

`lib/session-store.ts:82` declares `StoredStockMovement.type: string` and `createStockMovement` (line 450) accepts `type: string`. The new `"OWNER_WITHDRAWAL"` value passes through without any change to the in-memory store. Verified by reading lines 77–89 and 450–470.

## Database Migration

Exact command:

```bash
npx prisma migrate dev --name add_owner_withdrawal_to_movement_type
```

Expected generated `migration.sql` content — exactly one line:

```sql
ALTER TYPE "MovementType" ADD VALUE 'OWNER_WITHDRAWAL';
```

**Postgres restriction**: `ALTER TYPE ... ADD VALUE` cannot run inside an explicit transaction block (`BEGIN … COMMIT`). Prisma sometimes wraps migrations in a transaction block when multiple statements are present. The apply phase MUST open the generated `migration.sql` and verify it is the single `ALTER TYPE` line with no transaction wrapper. If Prisma wrapped it, the apply phase must strip the wrapper before re-running.

After the migration applies, run:

```bash
npx prisma generate
```

This regenerates the Prisma client so `MovementType` includes `"OWNER_WITHDRAWAL"` on the TypeScript side. The TypeScript union in `lib/types.ts` must be updated **after** `prisma generate` (or at least in the same step) so the type check still passes.

### Rollback

- `ALTER TYPE … RENAME VALUE 'OWNER_WITHDRAWAL' TO '__disabled_owner_withdrawal'` is **not portable** — `RENAME VALUE` is only available from Postgres 10+ and even then can break FK-style references. The proposal and spec already treat this as an additive change with destructive rollback as a fallback.
- Practical rollback for this fresh project: delete the new endpoint files (`app/api/stock-movements/owner-withdrawal/route.ts`, `route.test.ts`, `components/stock/owner-withdrawal-dialog.tsx`), revert the schema enum change, revert the union change in `lib/types.ts`, drop the migration directory, and re-run `prisma generate`. Because no existing row has `type = 'OWNER_WITHDRAWAL'` in a fresh project's pre-change state, no data migration is required.
- For a project that already has withdrawal rows: a follow-up migration that creates a new enum type, remaps the column, and drops the old type is the safe path. Documented here; not part of this change.

## API Design

### Endpoint

`POST /api/stock-movements/owner-withdrawal` — mirrors the structure of `app/api/stock-movements/adjust/route.ts` (lines 1–42) one-for-one, replacing only the schema, the error copy, the function name, and the `data` passed.

### Request body (validated by Zod)

```ts
{
  productId: string;   // min(1)
  quantity: number;    // int, .positive() — rejects 0 and negatives
  reason: string;      // min(1), max(500)
}
```

### Response (success, 201)

Movement summary, where the negative sign is a property of the **stored movement**, not the request:

```ts
{
  productId: string;
  previousStock: number;
  newStock: number;
  quantity: -originalQty;
  reason: string;
}
```

### Error mapping

Mirrors `adjust/route.ts` with admin-gate copy changed:

| HTTP | Code / message                                                            | Trigger                                                    |
| ---- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 401  | (whatever `requireSessionUser()` produces)                                | No session                                                 |
| 403  | `"Solo administradores pueden registrar retiro de dueño"`                  | `auth.user.role !== "admin"`                               |
| 400  | First Zod error message                                                   | Schema validation failure                                  |
| 400  | `"El stock no puede ser negativo"` (code: `STOCK_NEGATIVE` in error body) | `quantity > product.stock`                                 |
| 404  | `"Producto no encontrado"` (code: `NOT_FOUND` in error body)              | Product not in store                                       |
| 500  | `"Error al registrar retiro"`                                             | Unexpected error; `console.error(...)` before responding  |

### Route handler pseudo-code

```ts
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { recordOwnerWithdrawal } from "@/lib/data-access";
import { ownerWithdrawalSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    if (auth.user.role !== "admin") {
      return errorResponse("Solo administradores pueden registrar retiro de dueño", 403);
    }

    const rawData = await request.json();
    const parseResult = ownerWithdrawalSchema.safeParse(rawData);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return errorResponse(firstError?.message || "Datos inválidos", 400);
    }

    const movement = await recordOwnerWithdrawal(ctx, parseResult.data);
    return jsonResponse(movement, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return errorResponse("Producto no encontrado", 404);
    }
    if (error instanceof Error && error.message === "STOCK_NEGATIVE") {
      return errorResponse("El stock no puede ser negativo", 400);
    }
    console.error("POST /api/stock-movements/owner-withdrawal", error);
    return errorResponse("Error al registrar retiro", 500);
  }
}
```

## Data Access Layer

### New function signature (added to `lib/data-access.ts`)

```ts
export async function recordOwnerWithdrawal(
  ctx: DataContext,
  data: { productId: string; quantity: number; reason: string },
): Promise<{
  productId: string;
  previousStock: number;
  newStock: number;
  quantity: number;
  reason: string;
}>;
```

`quantity` is **positive** in the input. The function stores `-data.quantity` on the `StockMovement` row and in the response. Internally the `Product.update` uses `stock: { decrement: data.quantity }` (not `increment: -data.quantity`) — explicit `decrement` reads better and avoids sign confusion.

### Prisma callback form (production path)

```ts
return prisma.$transaction(async (tx) => {
  const product = await tx.product.findFirst({
    where: { id: data.productId, storeId: ctx.storeId },
    select: { id: true, stock: true },
  });
  if (!product) throw new Error("NOT_FOUND");

  const previousStock = product.stock;
  const newStock = previousStock - data.quantity;
  if (newStock < 0) throw new Error("STOCK_NEGATIVE");

  await tx.product.update({
    where: { id: product.id },
    data: { stock: { decrement: data.quantity } },
  });

  const trimmedReason = data.reason.trim();
  await tx.stockMovement.create({
    data: {
      storeId: ctx.storeId,
      productId: product.id,
      userId: ctx.userId,
      type: "OWNER_WITHDRAWAL",
      quantity: -data.quantity,
      previousStock,
      newStock,
      reason: trimmedReason,
    },
  });

  return {
    productId: product.id,
    previousStock,
    newStock,
    quantity: -data.quantity,
    reason: trimmedReason,
  };
});
```

This uses the callback form so the same `tx` is used for read, update, and insert. Throwing inside the callback rolls back all writes (matches the "Atomicity" spec).

### Test-mode branch (mirrors `adjustStock` at `lib/data-access.ts:614–639`)

```ts
if (isTest(ctx)) {
  const product = store(ctx).getProduct(data.productId, ctx.storeId);
  if (!product) throw new Error("NOT_FOUND");
  const newStock = product.stock - data.quantity;
  if (newStock < 0) throw new Error("STOCK_NEGATIVE");

  store(ctx).updateProduct(data.productId, { stock: newStock });
  store(ctx).createStockMovement({
    storeId: ctx.storeId,
    productId: data.productId,
    userId: ctx.userId,
    type: "OWNER_WITHDRAWAL",
    quantity: -data.quantity,
    previousStock: product.stock,
    newStock,
    reason: data.reason.trim(),
  });

  return {
    productId: data.productId,
    previousStock: product.stock,
    newStock,
    quantity: -data.quantity,
    reason: data.reason.trim(),
  };
}
```

`session-store.createStockMovement` (line 450) accepts `type: string`, so `"OWNER_WITHDRAWAL"` passes without any session-store change.

## Validation Layer

New Zod schema appended to `lib/validations.ts` (after `adjustStockSchema` at line 48–52):

```ts
export const ownerWithdrawalSchema = z.object({
  productId: z.string().min(1, "ProductId es requerido"),
  quantity: z.number().int().positive("La cantidad debe ser mayor a cero"),
  reason: z.string().min(1, "El motivo es requerido").max(500, "El motivo es demasiado largo"),
});

export type OwnerWithdrawalInput = z.infer<typeof ownerWithdrawalSchema>;
```

Delta vs `adjustStockSchema`: `quantity` uses `.positive()` (rejects `0` and negatives outright) instead of `adjustStockSchema`'s `.refine(val => val !== 0)` (which still allows negatives). This matches the spec scenario "Non-positive quantity rejected by validation".

## UI Design

### Stock management button

File: `components/stock/stock-management.tsx`, in the per-product action cell adjacent to the existing "Ajustar stock" button (line 508–520). The component is already a `"use client"` component that calls `useAuth()` (line 16, 44) and uses `user?.role === "admin"` as the existing render gate for "Ajustar stock" — **re-use the same gate**, no new session plumbing needed.

Add a sibling admin-only button between the History button and the existing "Ajustar stock" button:

- Title attribute: `"Retiro de dueño"`.
- Icon: `HandCoins` from `lucide-react` (import added to the existing icon block at line 4–15).
- Style classes: copy the existing 8×8 button style (line 510–514) verbatim.
- `onClick`: open the new `<OwnerWithdrawalDialog product={product} open onClose />`. Use the same local state pattern as `setAdjustProduct` (line 63) — add `const [withdrawalProduct, setWithdrawalProduct] = useState<Product | null>(null)` and mount the dialog when `withdrawalProduct !== null`.

State + dialog mount to add next to the existing `setAdjustProduct` plumbing: add `withdrawalProduct` state and render the dialog the same way `StockAdjustmentDialog` is rendered (mirror existing render block).

### Owner withdrawal dialog

New file `components/stock/owner-withdrawal-dialog.tsx`. Mirrors `components/stock/stock-adjustment-dialog.tsx` line-for-line where possible, with the following deltas:

- **Props**: same as `StockAdjustmentDialog` — `open: boolean`, `onClose: () => void`, `product: Product`.
- **Local state**: same shape — `quantity: string`, `reason: string`, `isSubmitting: boolean`, `error: string | null`.
- **Client-side validation** (replaces the adjust dialog's two-step check):
  - `quantity` parses to a positive integer AND `<= product.stock`. Failure: `"La cantidad debe ser mayor a cero y no superar el stock actual"`.
  - `reason.trim()` is non-empty. Failure: `"El motivo es requerido"`.
- **POST endpoint**: `/api/stock-movements/owner-withdrawal` with body `{ productId, quantity, reason }`.
- **Success toast**: `` `Retiro registrado: -${qty} unidades` ``. (Always the literal `-` sign — the dialog only emits positive quantities.)
- **On 201**: call `onClose()`. The parent's existing `refreshData` (already pulled from `useData()` at line 51) is invoked to refresh the product list. Calling it from the parent via a passed `onSuccess` prop is the cleanest approach; the design chooses to pass `onSuccess={() => refreshData()}` as an additional prop on the new dialog.
- **On non-2xx**: parse `data.error` and display in the inline error area (mirrors lines 57–60).
- **Network error**: toast with the error message, keep dialog open (mirrors lines 64–67).
- **Cancel/Esc/backdrop**: same close behavior as the adjust dialog (lines 76–82, 89–95, 152–160).
- **Helper text on the quantity input**: `"Usá un valor positivo. El stock disminuirá en esa cantidad."`
- **Placeholder on the reason input**: `"Ej: Retiro para uso personal"` (matches the resolved decision Q1).
- **Title**: `"Registrar retiro de dueño"`.
- **Submit button label**: `"Registrar retiro"` (idle) / `"Registrando…"` (loading). No "Confirmar" — Spanish UX.

### History badge

File: `components/stock/stock-movement-history.tsx`, lines 8–26.

Extend the `typeLabels` Record (line 8–16):

```ts
const typeLabels: Record<MovementType, string> = {
  SALE: "Venta",
  RETURN: "Devolución",
  MANUAL_ADJUSTMENT: "Ajuste manual",
  PRODUCT_CREATION: "Creación",
  IMPORT: "Importación",
  STOCK_CORRECTION: "Corrección",
  CANCELLATION: "Cancelación",
  OWNER_WITHDRAWAL: "Retiro de dueño",
};
```

Extend the `typeColors` Record (line 18–26) with a violet/pink variant that is **distinct** from the existing palette. Note that `MANUAL_ADJUSTMENT` already uses purple (`text-purple-600 bg-purple-50 …`), so a new hue is required. Use a pink/rose combination for visual separation:

```ts
OWNER_WITHDRAWAL: "text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950",
```

This satisfies the "distinct from existing badges" spec scenario.

## Test Strategy

Reference: spec's "Test Plan" section (verbatim listing below) plus design-level clarifications.

### `app/api/stock-movements/owner-withdrawal/route.test.ts` (new)

Cases mandated by the spec:

1. `401` when no session.
2. `403` when role is not admin.
3. `400` when `productId` missing/invalid.
4. `400` when `quantity` is `0` or negative (Zod `.positive()`).
5. `400` when `reason` empty.
6. `400 STOCK_NEGATIVE` when `quantity > currentStock`.
7. `201` happy path: response includes `type: "OWNER_WITHDRAWAL"`, `quantity: -qty`, real `previousStock`/`newStock`.
8. `500` when `recordOwnerWithdrawal` throws an unexpected error.

Design clarifications:

- **Mocking pattern**: prefer `vi.spyOn(dataAccess, "recordOwnerWithdrawal")` over `vi.mock("@/lib/data-access", …)` so the rest of the module remains intact (the `vi.mock` factory approach would shadow other helpers imported by the route).
- Follow the same `vi.mock("@/lib/api-auth", …)` shape used in `adjust/route.test.ts` to stub `requireSessionUser()`.
- For the `500` case: `vi.spyOn(dataAccess, "recordOwnerWithdrawal").mockRejectedValueOnce(new Error("boom"))`.

### `lib/data-access.test.ts` (extended)

Two new cases:

1. **Happy path**: starting stock `10`; withdraw `3`; assert `Product.stock` decremented to `7`; assert `StockMovement.create` (or, in test mode, `store.createStockMovement`) called with `type: "OWNER_WITHDRAWAL"`, `quantity: -3`, `previousStock: 10`, `newStock: 7` — exact value assertions, no loose matching.
2. **`STOCK_NEGATIVE` rejection**: when `quantity > currentStock`, the function throws `Error("STOCK_NEGATIVE")`; assert that **neither** `store.updateProduct` **nor** `store.createStockMovement` was called (use `vi.fn()` spies and `expect(spy).not.toHaveBeenCalled()`).

Use the existing `vi.spyOn(testUsers, "isTestUserEmail").mockReturnValue(true)` pattern from the `adjustStock` tests to enter the test-mode branch.

### Out of scope (per spec)

- UI component tests for the dialog/button visibility. Repo has no `vitest` config that covers them; defer to manual QA.
- E2E tests. Optional follow-up.
- Migration unit test. Manual inspection of `migration.sql` in apply.

## File-by-File Change List

Strict-TDD ordering. Code bodies live in the apply phase; each item is a one-line directive.

1. **`prisma/schema.prisma`** — append `OWNER_WITHDRAWAL` to the `MovementType` enum (line 197–205).
2. **Run** `npx prisma migrate dev --name add_owner_withdrawal_to_movement_type`. Inspect generated `migration.sql`: must contain exactly `ALTER TYPE "MovementType" ADD VALUE 'OWNER_WITHDRAWAL';` with no `BEGIN/COMMIT` wrapper. Reject otherwise.
3. **Run** `npx prisma generate` so the client picks up the new enum value.
4. **`lib/types.ts`** — append `| "OWNER_WITHDRAWAL"` to the `MovementType` union (line 73–80). Must happen after step 3 for type-check pass.
5. **`lib/validations.ts`** — append `ownerWithdrawalSchema` and `OwnerWithdrawalInput` after `adjustStockSchema` (line 48–52).
6. **WRITE** `app/api/stock-movements/owner-withdrawal/route.test.ts` (RED). Confirmed failing because the route file does not exist yet (404) or throws because `recordOwnerWithdrawal` is undefined.
7. **`lib/data-access.ts`** — add `recordOwnerWithdrawal` (production + test-mode branches). GREEN for the data-access tests written in step 9. The route test still fails because the route file does not exist.
8. **WRITE** `app/api/stock-movements/owner-withdrawal/route.ts` (the POST handler). GREEN for the route test.
9. **EXTEND** `lib/data-access.test.ts` with the two cases (happy + `STOCK_NEGATIVE`). Written in this order so they are RED until step 7 lands.
10. **`components/stock/owner-withdrawal-dialog.tsx`** — new file. No test (out of scope per spec).
11. **`components/stock/stock-management.tsx`** — add `HandCoins` import, add `withdrawalProduct` state, mount the new dialog, add the admin-only button inside the same `user?.role === "admin"` gate that wraps the existing "Ajustar stock" button.
12. **`components/stock/stock-movement-history.tsx`** — extend `typeLabels` and `typeColors` Records with the new entry.
13. **Run** `pnpm test`. All green.

## Risks

- **Postgres transaction restriction**: `ALTER TYPE … ADD VALUE` cannot run inside a transaction. If Prisma's migration generator wraps the statement in `BEGIN/COMMIT`, `migrate dev` will fail. The apply phase must inspect `migration.sql` and strip the wrapper, or hand-write a single-statement migration if the generator is stubborn.
- **Client/server type-sync ordering**: `prisma generate` (step 3) must run before the TypeScript union change in `lib/types.ts` (step 4) is added, otherwise the type check fails because the new union value is not yet in the generated client. The strict TDD ordering in the file list already places the union change after the migration.
- **Button render gate**: `stock-management.tsx` is a client component that already reads `user.role` via `useAuth()`. No server-component refactor needed. The risk is purely that the existing `useAuth` shape could change; the design reuses the exact same gate expression (`user?.role === "admin"`) that already exists at line 508, so no new pattern is introduced.
- **Pre-existing `adjustStock` bug**: out of scope. The new function uses the callback form precisely to avoid replicating the array-form bug. Verify in apply that no copy-paste from `adjustStock` (lines 641–666) carries the `previousStock: 0, newStock: 0` literals into the new function.
- **Schema drift**: if `prisma migrate dev` detects schema drift in the dev database (e.g. shadowed by an out-of-date `migrations/_prisma_migrations` table), the migration may fail. The apply phase should run `npx prisma migrate status` first to confirm the baseline before generating the new migration.
- **Test-mode vs production drift**: the new function has two distinct branches (test mode, production mode). The data-access test exercises the test-mode branch only. Manual QA or a future integration test is needed to cover the production `prisma.$transaction` branch end-to-end. Same caveat applies to `adjustStock` today, so this is a pre-existing testability gap, not a new one.
- **`session-store` type narrowness**: confirmed `string`, no risk. Documented for completeness; verify in apply that no other consumer of `createStockMovement` asserts a narrow `type` union.

## Out of Scope (repeated for design review)

- Fixing the pre-existing `adjustStock` array-form bug.
- `?type=OWNER_WITHDRAWAL` filter UI on the history list.
- `cashSessionId` on `StockMovement` or any cash-movement coupling.
- Granting non-admin roles access.
- POS exposure.
- UI component unit tests (per spec Test Plan).
- E2E tests (per spec Test Plan).
- Migration unit test (per spec Test Plan; manual inspection only).
