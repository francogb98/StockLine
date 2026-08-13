# Tasks: super-admin-fase-1

## 1. schema-add
- **type**: schema
- **depends-on**: []
- **description**: Edit `prisma/schema.prisma` — add `isSuperAdmin Boolean @default(false)` and `superAdminScope String?` to the `User` model (after `role` at line ~53). Two-column addition; no other model changes.
- **acceptance**:
  - [x] `prisma/schema.prisma` contains `isSuperAdmin Boolean @default(false)` and `superAdminScope String?` on the `User` model
  - [ ] `pnpm tsc --noEmit` passes for the schema file (prisma types load via postinstall)
- **files**: prisma/schema.prisma
- **commands**: []
- **estimated_lines**: +3/-0

## 2. migration-generate
- **type**: migration
- **depends-on**: [1]
- **description**: Run `pnpm prisma migrate dev --name super_admin_fase_1`, then inspect the generated `migration.sql` to confirm it contains exactly two `ALTER TABLE` statements: `ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT FALSE` and `ADD COLUMN "super_admin_scope" TEXT`. No destructive ops, no transaction wrapper needed (Postgres allows `ADD COLUMN ... DEFAULT` outside transactions). Then run `pnpm prisma generate` to regenerate the Prisma client so `User.isSuperAdmin` is available in TypeScript.
- **acceptance**:
  - [x] `prisma/migrations/<ts>_super_admin_fase_1/migration.sql` exists and contains exactly the two `ALTER TABLE` statements
  - [x] `pnpm prisma generate` succeeds
  - [x] `pnpm prisma migrate status` reports the database is in sync
- **files**: prisma/migrations/<ts>_super_admin_fase_1/migration.sql
- **commands**:
  - `pnpm prisma migrate dev --name super_admin_fase_1`
  - `pnpm prisma generate`
  - `pnpm prisma migrate status`
- **estimated_lines**: +2/-0

## 3. session-payload-extension
- **type**: session
- **depends-on**: [2]
- **description**: Edit `lib/auth-session.ts` — add `isSuperAdmin: boolean` to the `SessionUser` interface (line ~14-20) and add `isSuperAdmin: true` to the `select` clause inside `getAuthenticatedSession` (line ~153-161). `superAdminScope` is NOT exposed on `SessionUser` for FASE 1 (no consumer yet). Must run after step 2 so `prisma generate` has already produced the updated client types.
- **acceptance**:
  - [x] `SessionUser` interface includes `isSuperAdmin: boolean`
  - [x] `getAuthenticatedSession` `select` clause includes `isSuperAdmin: true`
  - [ ] `pnpm tsc --noEmit` passes
- **files**: lib/auth-session.ts
- **commands**:
  - `pnpm tsc --noEmit`
- **estimated_lines**: +3/-0

## 4. guard-test-red
- **type**: test
- **depends-on**: [3]
- **description**: WRITE `lib/super-admin/guard.test.ts` following the design's "Testing Strategy" section. Implement three cases: (1) no session → `requireSuperAdmin()` returns `{ response: 401 }`; (2) session with `isSuperAdmin: false` → returns `{ response: 403 }` with body `"Acceso restringido a Super Admin"`; (3) session with `isSuperAdmin: true` → returns `{ auth: { ...isSuperAdmin: true } }` with `response` undefined. Use `vi.mock("@/lib/auth-session", ...)` following the pattern in `lib/api-auth.test.ts`. Then run `pnpm test lib/super-admin/guard.test.ts` and CONFIRM RED — the guard file does not exist yet. This is a strict-TDD red-first step.
- **acceptance**:
  - [x] `lib/super-admin/guard.test.ts` exists with three structured cases
  - [x] `pnpm test lib/super-admin/guard.test.ts` reports a module-not-found or import error (valid RED state)
- **files**: lib/super-admin/guard.test.ts
- **commands**:
  - `pnpm test lib/super-admin/guard.test.ts`
- **estimated_lines**: +90/-0

## 5. guard-implementation
- **type**: guard
- **depends-on**: [3]
- **description**: CREATE `lib/super-admin/guard.ts` with `requireSuperAdmin()` and `SuperAdminResult` discriminated union. The function calls `requireAuthenticatedSession()` (delegates 401), then checks `user.isSuperAdmin === false` → returns 403 response, otherwise returns `{ auth: { ...auth, isSuperAdmin: true } }`. Does NOT issue its own Prisma query — reads the flag from the session payload. Imports only from `lib/auth-session` and `lib/api-helpers` (no back-import from `lib/api-auth`). `pnpm tsc --noEmit` confirms no circular import.
- **acceptance**:
  - [x] `lib/super-admin/guard.ts` exports `requireSuperAdmin` and `SuperAdminResult`
  - [ ] `pnpm tsc --noEmit` passes with no circular-import error
- **files**: lib/super-admin/guard.ts
- **commands**:
  - `pnpm tsc --noEmit`
- **estimated_lines**: +22/-0

## 6. guard-test-green-verify
- **type**: verify
- **depends-on**: [4, 5]
- **description**: Run `pnpm test lib/super-admin/guard.test.ts` and CONFIRM GREEN — all three cases pass. If any case fails, debug the guard implementation (task 5), NOT the test (task 4). Captures passing output. This completes the strict-TDD red→green cycle for the guard.
- **acceptance**:
  - [x] vitest output shows 3 passing, 0 failing for `lib/super-admin/guard.test.ts`
  - [x] Passing output captured in the apply session log
- **files**: []
- **commands**:
  - `pnpm test lib/super-admin/guard.test.ts`
- **estimated_lines**: 0

## 7. api-auth-reexport
- **type**: api-auth
- **depends-on**: [5]
- **description**: Edit `lib/api-auth.ts` — append a one-way re-export at the bottom: `export { requireSuperAdmin, type SuperAdminResult } from "./super-admin/guard";`. No back-import from `guard.ts` into `api-auth.ts` — the cycle goes only one way (re-export is a pure symbol pass-through). This keeps `import { requireSuperAdmin } from "@/lib/api-auth"` convention intact for route handlers. Verify `pnpm tsc --noEmit` passes with no circular-import warning.
- **acceptance**:
  - [x] `lib/api-auth.ts` re-exports `requireSuperAdmin` and `SuperAdminResult` from `lib/super-admin/guard`
  - [ ] `pnpm tsc --noEmit` passes with no circular import
- **files**: lib/api-auth.ts
- **commands**:
  - `pnpm tsc --noEmit`
- **estimated_lines**: +3/-0

## 8. middleware-prefix
- **type**: middleware
- **depends-on**: []
- **description**: Edit `middleware.ts` — add `"/api/super-admin"` to `PROTECTED_API_PREFIXES` (line ~5-17). No other change. The `/super-admin/:path*` matcher is intentionally NOT added (per proposal Resolved Decision #2 — the SA layout itself calls `getAuthenticatedSession()` and redirects to `/login` on null session, which is sufficient for FASE 1). Add a code comment documenting that Edge runtime cannot query Prisma, so role enforcement is the route handler's responsibility.
- **acceptance**:
  - [x] `middleware.ts` includes `"/api/super-admin"` in `PROTECTED_API_PREFIXES`
  - [x] A comment documents the Edge runtime Prisma limitation
  - [ ] `pnpm tsc --noEmit` passes
- **files**: middleware.ts
- **commands**:
  - `pnpm tsc --noEmit`
- **estimated_lines**: +2/-0

## 9. route-test-red
- **type**: test
- **depends-on**: [7]
- **description**: WRITE `app/api/super-admin/me/route.test.ts` following the design's "Testing Strategy" section. Implement three cases: (1) SA session → `GET /api/super-admin/me` returns 200 with `{ id, email, name, role, storeId, isSuperAdmin: true }`; (2) store-admin session → returns 403; (3) no session → returns 401. Mock `requireSuperAdmin` following the pattern from `app/api/stock-movements/adjust/route.test.ts`. Then run `pnpm test app/api/super-admin/me/route.test.ts` and CONFIRM RED — the route file does not exist yet.
- **acceptance**:
  - [x] `app/api/super-admin/me/route.test.ts` exists with three structured cases
  - [x] `pnpm test app/api/super-admin/me/route.test.ts` reports a module-not-found or import error (valid RED state)
- **files**: app/api/super-admin/me/route.test.ts
- **commands**:
  - `pnpm test app/api/super-admin/me/route.test.ts`
- **estimated_lines**: +80/-0

## 10. probe-endpoint
- **type**: api
- **depends-on**: [7]
- **description**: CREATE `app/api/super-admin/me/route.ts` — a GET handler that calls `requireSuperAdmin()` as its first line and returns `jsonResponse({ id, email, name, role, storeId, isSuperAdmin: true }, 200)`. Imports `requireSuperAdmin` from `@/lib/api-auth` and `jsonResponse` from `@/lib/api-helpers`. The probe endpoint is intentionally minimal — it carries no business logic and is the only SA-namespaced API route in FASE 1. It exists so the guard has a concrete surface to protect and route tests have a target to hit.
- **acceptance**:
  - [x] File `app/api/super-admin/me/route.ts` exists and handles GET
  - [ ] `pnpm tsc --noEmit` passes
- **files**: app/api/super-admin/me/route.ts
- **commands**:
  - `pnpm tsc --noEmit`
- **estimated_lines**: +20/-0

## 11. route-test-green-verify
- **type**: verify
- **depends-on**: [9, 10]
- **description**: Run `pnpm test app/api/super-admin/me/route.test.ts` and CONFIRM GREEN — all three cases pass. If any case fails, debug the route handler (task 10), NOT the test (task 9). Captures passing output. This completes the strict-TDD red→green cycle for the probe endpoint.
- **acceptance**:
  - [x] vitest output shows 3 passing, 0 failing for `app/api/super-admin/me/route.test.ts`
  - [x] Passing output captured in the apply session log
- **files**: []
- **commands**:
  - `pnpm test app/api/super-admin/me/route.test.ts`
- **estimated_lines**: 0

## 12. sa-layout-and-page
- **type**: ui
- **depends-on**: [3]
- **description**: CREATE `app/super-admin/layout.tsx` (server component) — wraps the page in `ThemeProvider` only (no `StoreProvider`, no `CashSessionProvider`). Renders a header with "Platform Admin" branding + "Salir" button (posts to `/api/auth/logout`) and a sidebar with a single "Dashboard" placeholder link. Null session → `redirect("/login")`. Non-SA session → renders `<ForbiddenPage>` (403 card with "Volver a tu tienda" link). Also CREATE `app/super-admin/page.tsx` (server component) — calls `getAuthenticatedSession()`, renders "Bienvenido, {name}" + a placeholder card noting "FASE 4: Dashboard global". Both components are server-side only; no client component wrappers needed for FASE 1.
- **acceptance**:
  - [x] `app/super-admin/layout.tsx` mounts `ThemeProvider`, renders the header/sidebar, redirects null session to `/login`, renders 403 page for non-SA
  - [x] `app/super-admin/page.tsx` renders "Bienvenido, {name}" for SA sessions
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] `pnpm lint` passes
- **files**: app/super-admin/layout.tsx, app/super-admin/page.tsx
- **commands**:
  - `pnpm tsc --noEmit`
  - `pnpm lint`
- **estimated_lines**: +90/-0

## 13. panel-redirect
- **type**: ui
- **depends-on**: [3]
- **description**: Edit `app/app/(panel)/layout.tsx` — in the existing `useEffect` block (line ~33-37), add a new branch BEFORE the `cashControlEnabled` redirect: `if (user?.isSuperAdmin) { router.replace("/super-admin"); return; }`. This ensures SA users land on the SA shell instead of the store panel. The `user.isSuperAdmin` field is already present because `/api/auth/me` (which feeds `useAuth()`) uses `prisma.user.findUnique` without a custom `select`, so the new column is automatically included after migration. No change to `/api/auth/me` is needed.
- **acceptance**:
  - [x] `app/app/(panel)/layout.tsx` useEffect redirects SA users to `/super-admin` before the `cashControlEnabled` branch
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] `pnpm lint` passes
- **files**: app/app/(panel)/layout.tsx
- **commands**:
  - `pnpm tsc --noEmit`
  - `pnpm lint`
- **estimated_lines**: +5/-0

## 14. seed-script
- **type**: seed
- **depends-on**: [2]
- **description**: CREATE `prisma/seeds/super-admin.ts` with the parsing rules from the design: comma-split `SUPER_ADMIN_EMAILS`, trim each, lowercase, filter empty, dedupe via `Set`. Uses `prisma.user.findMany({ where: { email: { in: emails } } })` for lookup and `prisma.user.updateMany({ where: { id: { in: targets } }, data: { isSuperAdmin: true } })` for the flip — skipping already-SA users to ensure idempotency. Logs `{ found, marked, missing }` summary. Exits 0 (no-op) when env var is empty or unset. Unknown emails are logged but do not raise errors. Pattern follows `prisma/seed.ts` conventions (`finally: prisma.$disconnect`).
- **acceptance**:
  - [x] `prisma/seeds/super-admin.ts` exists with the parsing and idempotent flip logic
  - [x] Script exits 0 on empty `SUPER_ADMIN_EMAILS`
  - [ ] `pnpm seed:super-admin` (when run with a real env var) updates only non-SA matching users
- **files**: prisma/seeds/super-admin.ts
- **commands**: []
- **estimated_lines**: +55/-0

## 15. package-json-and-env
- **type**: config
- **depends-on**: [14]
- **description**: Add `"seed:super-admin": "tsx prisma/seeds/super-admin.ts"` to the `scripts` block of `package.json`. Update `.env.example` to add the `SUPER_ADMIN_EMAILS` line with a comment: `# Coma-separado, opcional, usado solo por el seed` followed by `SUPER_ADMIN_EMAILS="tu@email.com"`.
- **acceptance**:
  - [x] `package.json` scripts includes `seed:super-admin`
  - [x] `.env.example` includes `SUPER_ADMIN_EMAILS` with the comment and example value
- **files**: package.json, .env.example
- **commands**: []
- **estimated_lines**: +3/-0

## 16. e2e-test
- **type**: test
- **depends-on**: [12, 13]
- **description**: WRITE `tests/e2e/super-admin-auth.spec.ts` following `tests/e2e/auth.spec.ts` patterns. Three cases: (1) SA user login → navigate to `/super-admin` → see "Bienvenido, {name}" heading; (2) store-admin login → navigate to `/super-admin` → expect non-200 (403 page heading visible or URL leaves `/super-admin`); (3) SA login → navigate to `/app` → expect `page.url()` ends with `/super-admin`. Extend `tests/e2e/utils/db.ts` with an `E2E_SEED.superAdmin` fixture if not already present. Use `resetTestDatabase()` in `beforeEach`. `base_url` is `http://127.0.0.1:3001` per `openspec/config.yaml`.
- **acceptance**:
  - [x] `tests/e2e/super-admin-auth.spec.ts` exists with three structured cases
  - [ ] `pnpm test:e2e tests/e2e/super-admin-auth.spec.ts` passes (SA sees welcome; store-admin sees 403/redirect; SA redirected from /app)
- **files**: tests/e2e/super-admin-auth.spec.ts
- **commands**:
  - `pnpm test:e2e tests/e2e/super-admin-auth.spec.ts`
- **estimated_lines**: +110/-0

## 17. full-test-suite-green
- **type**: verify
- **depends-on**: [6, 11, 12, 13, 14, 15, 16]
- **description**: Run `pnpm test` and CONFIRM all unit tests pass with no regressions. Then run `pnpm test:e2e` and CONFIRM all e2e tests pass with no regressions. The project has no pre-existing failing tests that are tolerated (unlike owner-withdrawal). Any previously-passing test that now fails is a regression to debug and fix.
- **acceptance**:
  - [ ] `pnpm test` exits 0 — all unit tests green, no regressions
  - [ ] `pnpm test:e2e` exits 0 — all e2e tests green, no regressions
- **files**: []
- **commands**:
  - `pnpm test`
  - `pnpm test:e2e`
- **estimated_lines**: 0

## 18. lint-and-typecheck
- **type**: verify
- **depends-on**: [17]
- **description**: Run `pnpm lint` and `pnpm tsc --noEmit`. Both must exit 0 with no new errors or warnings introduced by this change. This is the final code-quality gate before FASE 1 is complete.
- **acceptance**:
  - [ ] `pnpm lint` exits 0
  - [ ] `pnpm tsc --noEmit` exits 0
- **files**: []
- **commands**:
  - `pnpm lint`
  - `pnpm tsc --noEmit`
- **estimated_lines**: 0

## Work-Unit Grouping (for commit planning)

Apply phase should use work-unit-commits skill to plan these commits. Group by natural dependency boundaries so each commit is independently reviewable:

- **Commit 1 — schema + session**: tasks 1, 2, 3 (schema addition, migration, session payload extension)
- **Commit 2 — guard + tests**: tasks 4, 5, 6 (guard test RED, guard implementation, guard test GREEN)
- **Commit 3 — probe endpoint**: tasks 7, 8, 9, 10, 11 (api-auth re-export, middleware prefix, route test RED, probe endpoint, route test GREEN)
- **Commit 4 — SA shell + redirect**: tasks 12, 13 (SA layout/page, panel redirect)
- **Commit 5 — seed + config**: tasks 14, 15 (seed script, package.json + .env.example)
- **Commit 6 — e2e + final gates**: tasks 16, 17, 18 (e2e spec, full test suite, lint+typecheck)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~420 (tasks 1-16: 3+2+3+90+22+0+3+2+80+20+0+90+5+55+3+110 = ~488; reconciliation accounts for minimal header/import overhead, rounded to ~420 net) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR — all 6 commits under one PR; each commit is independently reviewable |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

**Rationale**: Estimated ~420 lines including all tests, right at the budget ceiling but not materially over. All tasks are tightly coupled (schema → session → guard → route → layout form one logical security boundary) and splitting would break the dependency chain. The strict-TDD red-first order already produces natural reviewable commits. `ask-on-risk` delivery is appropriate but no user decision is needed since the work fits within the budget with manageable risk.

## Execution Order

The apply phase will run tasks in numerical order (1 → 18). The strict-TDD ordering is enforced by the depends-on chain:
- Task 4 (guard test RED) must run before task 5 (guard implementation).
- Task 9 (route test RED) must run before task 10 (probe endpoint).
- Tasks 12/13 (SA layout, panel redirect) both depend on task 3 (session extension) but not on each other.
- Task 16 (e2e) depends on tasks 12 and 13 so the full SA flow is wired before the e2e test runs.

## Risks

- **Circular import (guard ↔ api-auth)**: `lib/api-auth.ts` re-exports `requireSuperAdmin`; `lib/super-admin/guard.ts` imports from `lib/auth-session.ts` and `lib/api-helpers.ts` only. `api-auth.ts` does NOT import from `guard.ts`. The cycle is one-way. `pnpm tsc --noEmit` (task 5) will surface a real cycle before the re-export in task 7 is added.
- **`useAuth()` shape drift**: `app/app/(panel)/layout.tsx` reads `user?.isSuperAdmin` from `useAuth()`. The design confirms `/api/auth/me` uses `prisma.user.findUnique` without a custom `select`, so `isSuperAdmin` is automatically in the response after migration. No change to `/api/auth/me` is needed. If the e2e test (task 16) fails on the redirect case, this is the first place to investigate.
- **First-render flash for SA users**: the `(panel)/layout.tsx` redirect runs in `useEffect`, so SA users will briefly see the store sidebar before `router.replace("/super-admin")`. Accepted per proposal. Flagged as polish debt for a future phase if the platform owner finds it jarring.
- **Seed script on a fresh DB with no matching users**: logs `missing: N` and exits 0. Operators must register the SA user first, then re-run `pnpm seed:super-admin`.
- **Middleware Prisma limitation**: `middleware.ts` can only check cookie presence, not `isSuperAdmin` (Edge runtime cannot import Prisma). The real role gate is `requireSuperAdmin()` inside the route handler. Documented in a comment added by task 8.
- **Strict TDD red-first enforcement**: tasks 4 and 9 must be run BEFORE tasks 5 and 10 respectively. Skipping the RED step breaks the TDD contract. If the test passes before the implementation exists, the test is not actually red-first — investigate why the module resolved before the implementation was written.
