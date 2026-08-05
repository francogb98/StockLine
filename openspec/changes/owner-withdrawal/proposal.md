# Change: owner-withdrawal

## Why

Administrators need to record product leaving the store for owner personal use
(gift, personal consumption, off-the-books sale). Stock must decrease, no money
enters the cash session, and the movement must be auditable and distinguishable
from a generic manual `ADJUST` row. Today, the only way to remove stock is
`POST /api/stock-movements/adjust`, which mixes true corrections with
untracked removals and offers no semantic signal that an owner withdrawal
occurred.

## What Changes

- Add new enum value `OWNER_WITHDRAWAL` to `MovementType` in
  `prisma/schema.prisma` (line ~197-205).
- Generate Prisma migration
  `add_owner_withdrawal_to_movement_type` and run `prisma generate`.
- New API route `POST /api/stock-movements/owner-withdrawal` mirroring
  `app/api/stock-movements/adjust/route.ts`, admin-only via the same role gate.
- New data-access function
  `recordOwnerWithdrawal(ctx, { productId, quantity, reason })` mirroring
  `lib/data-access.ts:610-667` but using `prisma.$transaction(async (tx) => ...)`
  callback form so it records real `previousStock` and `newStock` on the
  `StockMovement` row.
- New Zod schema `ownerWithdrawalSchema` in `lib/validations.ts` with
  `quantity: z.number().int().positive()` and
  `reason: z.string().min(1).max(500)`.
- Extend the `MovementType` union in `lib/types.ts:73-80` to include
  `| "OWNER_WITHDRAWAL"`.
- New React component
  `components/stock/owner-withdrawal-dialog.tsx` mirroring
  `stock-adjustment-dialog.tsx` (inline Spanish copy, es-AR).
- Add admin-only button in `components/stock/stock-management.tsx` next to
  the existing "Ajustar stock" button (~line 508-520).
- Extend `typeLabels` and `typeColors` records in
  `components/stock/stock-movement-history.tsx:8-26` with
  `OWNER_WITHDRAWAL: "Retiro de dueño"`.
- New route test
  `app/api/stock-movements/owner-withdrawal/route.test.ts` mirroring
  `adjust/route.test.ts`.
- Extend `lib/data-access.test.ts` with two cases for
  `recordOwnerWithdrawal`: happy path (asserts decrement plus movement with
  `type: "OWNER_WITHDRAWAL"`, `quantity: -qty`, real
  `previousStock`/`newStock`) and `STOCK_NEGATIVE` rejection when
  `qty > currentStock`.

## Impact

- **Affected specs**: none yet. This is the first delta for this domain;
  no existing `openspec/specs/` files to modify.
- **Affected code** (additions unless noted):
  - `prisma/schema.prisma` (modified)
  - `prisma/migrations/<ts>_add_owner_withdrawal_to_movement_type/migration.sql` (new)
  - `app/api/stock-movements/owner-withdrawal/route.ts` (new)
  - `app/api/stock-movements/owner-withdrawal/route.test.ts` (new)
  - `lib/data-access.ts` (modified — new function)
  - `lib/data-access.test.ts` (modified)
  - `lib/validations.ts` (modified)
  - `lib/types.ts` (modified)
  - `components/stock/owner-withdrawal-dialog.tsx` (new)
  - `components/stock/stock-management.tsx` (modified)
  - `components/stock/stock-movement-history.tsx` (modified)
- **Affected behavior**: admins can now register an owner withdrawal from
  the stock management screen; the stock-movements history list shows a new
  badge for the new type.

## Non-Goals

- Do **not** fix the pre-existing bug in `adjustStock` where
  `previousStock` and `newStock` are hardcoded to `0` because that function
  uses the `prisma.$transaction([...])` array form. That bug stays in
  `adjustStock` and is owned by a future change. The new
  `recordOwnerWithdrawal` will correctly use the callback form to record
  real values.
- Do **not** add a `cashSessionId` foreign key on `StockMovement`; the
  feature is intentionally decoupled from cash sessions.
- Do **not** expose the feature in `components/pos/`.
- Do **not** add a `?type=` query filter UI to the history list in this
  change; only the badge.
- Do **not** grant non-admin roles access to this endpoint in this change.

## Migration

Single statement:

```sql
ALTER TYPE "MovementType" ADD VALUE 'OWNER_WITHDRAWAL';
```

This statement **must not** be wrapped in a `BEGIN ... COMMIT` block
(Postgres restriction on `ALTER TYPE ... ADD VALUE`). Verify the generated
`migration.sql` contains only the `ALTER TYPE` line. Run `prisma generate`
after the migration applies.

## Resolved Decisions (formerly Open Questions)

1. The `reason` field placeholder will be `"Ej: Retiro para uso personal"`
   to nudge admin input. Matches the existing `stock-adjustment-dialog.tsx`
   prefix style (`"Ej: Ajuste por inventario"`).
2. The `?type=OWNER_WITHDRAWAL` query param on `GET /api/stock-movements`
   is **deferred** to a future change. The current history list does not
   send any `?type=` filter, so adding the param without a consuming UI
   would be dead code. A future change will add a real filter UI and
   expand the param surface for all movement types.

## Rollback Plan

Revert the migration with a manual `ALTER TYPE "MovementType" RENAME VALUE`
or by dropping the newly created rows referencing the value, then revert
the code commits. The change is additive at the API level; existing
`ADJUST` flows remain untouched, so partial rollback is safe.

## Success Criteria

- [ ] Migration applies cleanly on a fresh database and on a snapshot
      containing prior `ADJUST` / `SALE` / `PURCHASE` rows.
- [ ] `POST /api/stock-movements/owner-withdrawal` returns `200` for admin
      with a valid payload, decrements `Product.stock`, and writes a
      `StockMovement` row with `type = OWNER_WITHDRAWAL`,
      `quantity = -qty`, and real `previousStock` / `newStock`.
- [ ] Same endpoint returns `403` for non-admin sessions and
      `400 STOCK_NEGATIVE` when `qty > currentStock`.
- [ ] Stock-movements history list renders the new
      `"Retiro de dueño"` badge for the new type.
- [ ] `pnpm test` passes; new tests are red-first per strict TDD.
