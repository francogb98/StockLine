# Tasks: owner-withdrawal

## 1. schema-enum-extension
- **type**: schema
- **depends-on**: []
- **description**: Append the new enum value `OWNER_WITHDRAWAL` to the `MovementType` enum in `prisma/schema.prisma` (line ~197-205). Pure schema edit; no code generation yet. Place the value at the end of the enum to keep the diff minimal and the migration a single `ADD VALUE`.
- **acceptance**:
  - [ ] `prisma/schema.prisma` line ~205 contains `OWNER_WITHDRAWAL` as the last value of the `MovementType` enum
  - [ ] No other lines in the file are modified
- **files**: prisma/schema.prisma
- **commands**: []
- **estimated_lines**: +1/-0

## 2. migration-generate
- **type**: migration
- **depends-on**: [1]
- **description**: Generate the Prisma migration with `npx prisma migrate dev --name add_owner_withdrawal_to_movement_type`, then inspect the generated `migration.sql` to confirm it contains exactly one line: `ALTER TYPE "MovementType" ADD VALUE 'OWNER_WITHDRAWAL';` with NO `BEGIN/COMMIT` wrapper. Postgres forbids `ALTER TYPE ... ADD VALUE` inside an explicit transaction. If wrapped, hand-edit the file to remove the wrapper, then re-run `npx prisma migrate deploy` to verify it still applies. After the migration applies, run `npx prisma generate` to regenerate the Prisma client so the TypeScript side knows the new enum value.
- **acceptance**:
  - [ ] `prisma/migrations/<timestamp>_add_owner_withdrawal_to_movement_type/migration.sql` exists and contains only the `ALTER TYPE` line (no `BEGIN`/`COMMIT` wrapper)
  - [ ] `npx prisma generate` succeeds and the generated client exposes the new enum value
  - [ ] `npx prisma migrate status` reports the database is in sync
- **files**: prisma/migrations/<timestamp>_add_owner_withdrawal_to_movement_type/migration.sql
- **commands**:
  - `npx prisma migrate dev --name add_owner_withdrawal_to_movement_type`
  - `npx prisma generate`
  - `npx prisma migrate status`
- **estimated_lines**: +2/-0

## 3. types-union-extension
- **type**: types
- **depends-on**: [2]
- **description**: Append `| "OWNER_WITHDRAWAL"` to the `MovementType` union in `lib/types.ts` (line 73-80). Must run after `prisma generate` so the generated client already knows the new value and the type check passes. This is the only edit to `lib/types.ts`.
- **acceptance**:
  - [ ] `lib/types.ts:73-80` includes the new `| "OWNER_WITHDRAWAL"` variant
  - [ ] `pnpm tsc --noEmit` passes for the new line
- **files**: lib/types.ts
- **commands**:
  - `pnpm tsc --noEmit`
- **estimated_lines**: +1/-0

## 4. validation-schema-add
- **type**: validation
- **depends-on**: []
- **description**: Append `ownerWithdrawalSchema` and `OwnerWithdrawalInput` to `lib/validations.ts` immediately after `adjustStockSchema` (line 48-52). Use the exact Zod schema from the design's "Validation Layer" section: `productId: z.string().min(1, ...)`, `quantity: z.number().int().positive(...)`, `reason: z.string().min(1, ...).max(500, ...)`. Delta vs `adjustStockSchema`: `quantity` uses `.positive()` (rejects 0 and negatives outright) instead of `.refine(val => val !== 0)`. Pure addition; no dependency on the schema migration.
- **acceptance**:
  - [ ] `lib/validations.ts` exports `ownerWithdrawalSchema` and `OwnerWithdrawalInput`
  - [ ] `pnpm tsc --noEmit` passes
- **files**: lib/validations.ts
- **commands**:
  - `pnpm tsc --noEmit`
- **estimated_lines**: +7/-0

## 5. route-test-red
- **type**: test
- **depends-on**: [4]
- **description**: WRITE `app/api/stock-movements/owner-withdrawal/route.test.ts` following the design's "Test Strategy" section. Implement all 8 mandated cases: 401 (no session), 403 (non-admin), 400 missing productId, 400 zero/negative quantity, 400 empty reason, 400 `STOCK_NEGATIVE` when qty > stock, 201 happy path, 500 unexpected error. Use `vi.spyOn(dataAccess, "recordOwnerWithdrawal")` for mocking and `vi.mock("@/lib/api-auth", ...)` to stub `requireSessionUser()`, following the existing `adjust/route.test.ts` pattern verbatim. Then run `pnpm test app/api/stock-movements/owner-withdrawal/route.test.ts` and CONFIRM RED — the route file does not exist yet, so vitest will fail to import the route module. Capture the failure output. This is a strict-TDD red-first step: the test is structured correctly but cannot pass because the production code is missing.
- **acceptance**:
  - [ ] Test file `app/api/stock-movements/owner-withdrawal/route.test.ts` exists with 8 cases structured per design
  - [ ] `pnpm test` reports a collection/import/module-not-found error for the new test (valid RED state)
  - [ ] Failure output captured in the apply session log
- **files**: app/api/stock-movements/owner-withdrawal/route.test.ts
- **commands**:
  - `pnpm test app/api/stock-movements/owner-withdrawal/route.test.ts`
- **estimated_lines**: +120/-0

## 6. data-access-function-add
- **type**: data-access
- **depends-on**: [1, 2, 3, 4]
- **description**: Add `recordOwnerWithdrawal` to `lib/data-access.ts`, implementing both branches verbatim from the design's "Data Access Layer" section. The production branch uses `prisma.$transaction(async (tx) => ...)` callback form with `stock: { decrement: data.quantity }` (NOT array form — explicitly avoids the pre-existing `adjustStock` bug). The test-mode branch mirrors `adjustStock` at `lib/data-access.ts:614-639` using `store(ctx).getProduct` / `updateProduct` / `createStockMovement`. Throws `Error("NOT_FOUND")` and `Error("STOCK_NEGATIVE")` with literal strings; the route handler maps these to HTTP codes. `quantity` is positive in the input; function stores `-data.quantity` on the `StockMovement` row and in the response. This step also unblocks the data-access tests (task 9) which are RED-first.
- **acceptance**:
  - [ ] `lib/data-access.ts` exports `recordOwnerWithdrawal` with the signature from the design
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] No literal `previousStock: 0, newStock: 0` was carried over from `adjustStock` (the array-form bug)
- **files**: lib/data-access.ts
- **commands**:
  - `pnpm tsc --noEmit`
- **estimated_lines**: +60/-0

## 7. route-handler-add
- **type**: api
- **depends-on**: [6]
- **description**: CREATE `app/api/stock-movements/owner-withdrawal/route.ts` with the POST handler from the design's "API Design" section. Imports `ownerWithdrawalSchema` from `@/lib/validations`, `recordOwnerWithdrawal` from `@/lib/data-access`, `requireSessionUser` from `@/lib/api-auth`, and `jsonResponse` / `errorResponse` from `@/lib/api-helpers`. Admin role gate after `requireSessionUser()`. Error mapping: 401 (auth), 403 (non-admin with message "Solo administradores pueden registrar retiro de dueño"), 400 (Zod first error OR `STOCK_NEGATIVE` with message "El stock no puede ser negativo"), 404 (`NOT_FOUND` with "Producto no encontrado"), 500 (catch-all with `console.error` then "Error al registrar retiro"). Returns 201 on success with the movement summary.
- **acceptance**:
  - [ ] File `app/api/stock-movements/owner-withdrawal/route.ts` exists with the POST handler from the design
  - [ ] `pnpm tsc --noEmit` passes
- **files**: app/api/stock-movements/owner-withdrawal/route.ts
- **commands**:
  - `pnpm tsc --noEmit`
- **estimated_lines**: +45/-0

## 8. route-test-green-verify
- **type**: verify
- **depends-on**: [5, 6, 7]
- **description**: Run `pnpm test app/api/stock-movements/owner-withdrawal/route.test.ts` and CONFIRM GREEN — all 8 cases pass. If any case fails, debug and fix the route handler (task 7) or the data-access function (task 6) — NOT the test (task 5). Capture the passing output. This completes the strict-TDD red→green cycle for the API surface.
- **acceptance**:
  - [ ] vitest output shows 8 passing, 0 failing for the new test file
  - [ ] Passing output captured in the apply session log
- **files**: []
- **commands**:
  - `pnpm test app/api/stock-movements/owner-withdrawal/route.test.ts`
- **estimated_lines**: 0

## 9. data-access-test-extend
- **type**: test
- **depends-on**: [6]
- **description**: EXTEND `lib/data-access.test.ts` with the two cases from the design's "Test Strategy" section. Case 1 (happy path): use `vi.spyOn(testUsers, "isTestUserEmail").mockReturnValue(true)` to enter test mode; starting `Product.stock` is `10`; withdraw `3`; assert `Product.stock` decremented to `7`; assert `store.createStockMovement` (or the underlying `StockMovement.create`) called with `type: "OWNER_WITHDRAWAL"`, `quantity: -3`, `previousStock: 10`, `newStock: 7` — exact value assertions, no loose matching. Case 2 (`STOCK_NEGATIVE` rejection): when `quantity > currentStock`, the function throws `Error("STOCK_NEGATIVE")`; assert that `store.updateProduct` AND `store.createStockMovement` are NOT called (use `vi.fn()` spies with `expect(spy).not.toHaveBeenCalled()`). Run `pnpm test lib/data-access.test.ts` and CONFIRM GREEN.
- **acceptance**:
  - [ ] vitest output shows the 2 new cases passing
  - [ ] No regression in pre-existing data-access tests
- **files**: lib/data-access.test.ts
- **commands**:
  - `pnpm test lib/data-access.test.ts`
- **estimated_lines**: +50/-0

## 10. dialog-component-create
- **type**: ui
- **depends-on**: [4]
- **description**: CREATE `components/stock/owner-withdrawal-dialog.tsx` mirroring `components/stock/stock-adjustment-dialog.tsx` line-for-line where possible, with the deltas from the design's "Owner withdrawal dialog" subsection. Props: `open: boolean`, `onClose: () => void`, `product: Product`, plus an `onSuccess` callback to trigger the parent's `refreshData()`. Local state: `quantity: string`, `reason: string`, `isSubmitting: boolean`, `error: string | null`. Client-side validation: `quantity` parses to a positive integer AND `<= product.stock` (failure: "La cantidad debe ser mayor a cero y no superar el stock actual"); `reason.trim()` is non-empty. POST endpoint: `/api/stock-movements/owner-withdrawal`. Success toast: `` `Retiro registrado: -${qty} unidades` ``. Helper text on quantity input: "Usá un valor positivo. El stock disminuirá en esa cantidad." Reason placeholder: "Ej: Retiro para uso personal". Title: "Registrar retiro de dueño". Submit label: "Registrar retiro" / "Registrando…". Inline Spanish copy (es-AR). No test (out of scope per spec).
- **acceptance**:
  - [ ] File `components/stock/owner-withdrawal-dialog.tsx` exists
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] `pnpm lint` passes
- **files**: components/stock/owner-withdrawal-dialog.tsx
- **commands**:
  - `pnpm tsc --noEmit`
  - `pnpm lint`
- **estimated_lines**: +180/-0

## 11. stock-management-button-add
- **type**: ui
- **depends-on**: [10]
- **description**: Modify `components/stock/stock-management.tsx` with a four-point delta: (a) add `HandCoins` to the existing `lucide-react` import block (line 4-15); (b) add `const [withdrawalProduct, setWithdrawalProduct] = useState<Product | null>(null)` next to the existing `setAdjustProduct` state (line 63); (c) mount `<OwnerWithdrawalDialog product={withdrawalProduct} open onClose={...} onSuccess={refreshData} />` next to the existing `<StockAdjustmentDialog>` mount; (d) add the admin-only "Retiro de dueño" button inside the existing `user?.role === "admin"` gate (line ~508) next to the existing "Ajustar stock" button. Title attribute "Retiro de dueño", icon `HandCoins`, copy the existing 8×8 button style verbatim (line 510-514), `onClick` sets `withdrawalProduct`. Re-uses the same render gate — no new session plumbing.
- **acceptance**:
  - [ ] File diff is the four-point delta above (no other changes)
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] `pnpm lint` passes
- **files**: components/stock/stock-management.tsx
- **commands**:
  - `pnpm tsc --noEmit`
  - `pnpm lint`
- **estimated_lines**: +20/-2

## 12. history-badge-extend
- **type**: ui
- **depends-on**: [3]
- **description**: Modify `components/stock/stock-movement-history.tsx` with two record extensions. Add `OWNER_WITHDRAWAL: "Retiro de dueño"` to the `typeLabels` Record (line 8-16). Add `OWNER_WITHDRAWAL: "text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950"` to the `typeColors` Record (line 18-26). The pink palette is intentionally distinct from the existing badges (`MANUAL_ADJUSTMENT` already uses purple, so a separate hue is required per the design's "History badge" section and the spec's "distinct from existing badges" scenario). This task depends on task 3 because the Records are typed as `Record<MovementType, ...>` — adding the key without the union extension would be a type error.
- **acceptance**:
  - [ ] `typeLabels` includes `OWNER_WITHDRAWAL: "Retiro de dueño"`
  - [ ] `typeColors` includes the pink variant for `OWNER_WITHDRAWAL`
  - [ ] `pnpm tsc --noEmit` passes (Record exhaustiveness check satisfied)
  - [ ] `pnpm lint` passes
- **files**: components/stock/stock-movement-history.tsx
- **commands**:
  - `pnpm tsc --noEmit`
  - `pnpm lint`
- **estimated_lines**: +2/-0

## 13. full-test-suite-green
- **type**: verify
- **depends-on**: [8, 9, 10, 11, 12]
- **description**: Run `pnpm test` and CONFIRM all tests pass. The project has pre-existing failing tests (`lib/module-registry.test.ts`, `components/offline/__tests__/integration-wiring.test.tsx`) that are known and tolerated by the team and should not be affected by this change. If any previously-passing test now fails, debug and fix the regression. New tests added by this change (route tests, data-access tests) must all pass. This is the final regression gate.
- **acceptance**:
  - [ ] `pnpm test` exits 0
  - [ ] All new tests pass
  - [ ] No new regressions in pre-existing tests
  - [ ] The two pre-existing tolerated failures remain unchanged in pass/fail status
- **files**: []
- **commands**:
  - `pnpm test`
- **estimated_lines**: 0

## 14. lint-and-typecheck
- **type**: verify
- **depends-on**: [13]
- **description**: Run `pnpm lint` and `pnpm tsc --noEmit`. Both must pass cleanly with no errors and no new warnings introduced by this change. This is the final code-quality gate before the apply phase is complete.
- **acceptance**:
  - [ ] `pnpm lint` exits 0
  - [ ] `pnpm tsc --noEmit` exits 0
- **files**: []
- **commands**:
  - `pnpm lint`
  - `pnpm tsc --noEmit`
- **estimated_lines**: 0

## Work-Unit Grouping (for commit planning)

Group tasks into logical commits so each commit is reviewable on its own. The apply phase should use the work-unit-commits skill to plan these commits.

- **Commit 1 — schema + migration**: tasks 1, 2, 3
- **Commit 2 — validation + data-access**: tasks 4, 6, 9
- **Commit 3 — route + route tests**: tasks 5, 7, 8
- **Commit 4 — UI: dialog + button + history badge**: tasks 10, 11, 12
- **Commit 5 — full verification**: tasks 13, 14

## Forecast

- **estimated_changed_lines**: ~520 (sum of estimated_lines for tasks 1-12: 1+2+1+7+120+60+45+0+50+180+20+2 = 488; reconciliation accounts for minor header/import overhead in route.test.ts and dialog, rounded to ~520)
- **review_budget**: 400 lines (from preflight D1)
- **review_budget_exceeded**: YES (520 > 400)
- **chained_pr_recommended**: Yes
- **pr_strategy_options**:
  - (a) Proceed with `size:exception` — single PR with maintainer approval, total ~520 lines.
  - (b) Split into two chained PRs:
    - **PR 1** — commits 1-3 (schema + data + route, ~250 lines): schema enum + migration + type union + validation + data-access + tests + route handler. Independently testable; backend-only.
    - **PR 2** — commits 4-5 (UI + verification, ~270 lines): dialog + stock-management button + history badge + final regression. Depends on PR 1. Frontend-only delta with verification.
  - Each split PR stays under the 400-line budget and is independently testable.
- **delivery_strategy**: ask-on-risk (per preflight C1)
- **decision_needed_before_apply**: YES — the user must choose between `size:exception` and chained PRs before the apply phase starts work.

## Execution Order

The apply phase will run tasks in numerical order (1 → 14). The strict-TDD ordering is locked in by the depends-on chain. Note the critical TDD lock: task 5 (route test RED) must be performed BEFORE task 7 (route handler add) so the test is genuinely red. The current numerical order already enforces this (5 < 7), but the apply agent must not skip task 5 and jump directly to task 6/7.

## Risks

- **Task 2 (migration generate)** is the highest-risk step. If Prisma wraps `ALTER TYPE ... ADD VALUE` in a `BEGIN/COMMIT` transaction, the migration will fail to apply against Postgres. The apply agent must hand-fix the generated `migration.sql` to remove the wrapper, then re-run `npx prisma migrate deploy` to verify it still applies cleanly.
- **Task 5 (route test RED) ordering**: must be performed BEFORE task 6 (data-access add) so the test is genuinely RED when written. If the order slips and the data-access function exists when the test is written, the test will still RED on the missing route file, but the apply agent should explicitly confirm RED before moving on (a passing test on the first run means the test was not actually red-first).
- **Tasks 5 and 7 module-not-found semantics**: the test imports from `@/lib/data-access` (the new function) and from the route file `@/app/api/stock-movements/owner-withdrawal/route`. If the route file does not exist when the test runs, vitest will report a module-not-found error before any assertion is executed. This is still a valid "RED" state, but the apply agent should be aware that a 404-style import failure is acceptable as long as the test file is structured correctly. After task 7 lands, all 8 cases should run and pass.
- **Task 6 array-form bug guard**: the new `recordOwnerWithdrawal` function must use the callback form `prisma.$transaction(async (tx) => ...)` and NOT copy the `previousStock: 0, newStock: 0` literals from `adjustStock` (lines 641-666 of `lib/data-access.ts`). The apply agent should verify the new function has real `previousStock` / `newStock` values before marking task 6 complete.
- **Task 3 (types union) ordering relative to task 12 (history badge)**: the `typeLabels` and `typeColors` Records in `stock-movement-history.tsx` are typed as `Record<MovementType, ...>`. Task 12 cannot pass `pnpm tsc --noEmit` until task 3 has extended the `MovementType` union in `lib/types.ts`. The depends-on chain (12 depends on 3) already enforces this ordering.
- **Pre-existing failing tests**: `lib/module-registry.test.ts` and `components/offline/__tests__/integration-wiring.test.tsx` are known to fail and are tolerated. Task 13 must confirm they remain unchanged in pass/fail status and must not regress previously-passing tests.
- **review_budget_exceeded: YES**: the apply phase must apply preflight C1 and stop for user input on PR strategy (`size:exception` vs chained PRs) before committing. The work-unit-commits skill assumes the user has approved the commit plan; if the user has not, the apply phase should pause after task 14 (or earlier) to surface the decision.
- **Schema drift in dev database**: if `prisma migrate dev` detects drift (e.g. shadowed by an out-of-date `_prisma_migrations` table), the migration may fail. The apply agent should run `npx prisma migrate status` first to confirm the baseline before generating the new migration.
- **Test-mode vs production drift**: the data-access test only exercises the test-mode branch of `recordOwnerWithdrawal`. The production `prisma.$transaction` callback branch is not covered by the unit tests and depends on manual QA or a future integration test. This is a pre-existing testability gap shared with `adjustStock`; it is not a new risk.
