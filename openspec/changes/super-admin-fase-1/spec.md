# Delta for super-admin

## ADDED Requirements

### Requirement: Super Admin flag on User

The system SHALL add to `User`: `isSuperAdmin Boolean @default(false)` and `superAdminScope String?`. New users SHALL default to `isSuperAdmin = false`, `superAdminScope = NULL`. The migration's `DEFAULT FALSE` clause SHALL backfill existing rows. The flag SHALL live on `User`, not `Session`, so demotion takes effect on the next request without waiting for the 6-hour session TTL.

#### Scenario: New user defaults to non-Super Admin

- **GIVEN** a fresh database after the migration applies
- **WHEN** a new user is registered through `/api/auth/register`
- **THEN** the new `User` row has `isSuperAdmin = false` and `superAdminScope = NULL`

#### Scenario: Existing user rows default to non-Super Admin

- **GIVEN** pre-existing `User` rows created before the migration
- **WHEN** the migration applies
- **THEN** every pre-existing `User` row has `isSuperAdmin = false` and `superAdminScope = NULL`

#### Scenario: Prisma client exposes the new columns

- **WHEN** `pnpm prisma generate` runs after the migration
- **THEN** the generated client exposes `User.isSuperAdmin: boolean` and `User.superAdminScope: string | null`
- **AND** existing store admin and employee flows compile and run unchanged

### Requirement: Session user payload includes isSuperAdmin

`getAuthenticatedSession()` SHALL include `isSuperAdmin: boolean` in the returned `SessionUser` by adding it to the Prisma `select` clause. The `SessionUser` TypeScript interface SHALL be extended with `isSuperAdmin: boolean`. `superAdminScope` MAY remain internal to `lib/auth-session.ts` for FASE 1.

#### Scenario: SA session carries isSuperAdmin true

- **GIVEN** a user with `isSuperAdmin = true`
- **WHEN** `getAuthenticatedSession()` resolves a valid session cookie for that user
- **THEN** the returned `SessionUser` contains `isSuperAdmin: true`

#### Scenario: Store admin session carries isSuperAdmin false

- **GIVEN** a user with `isSuperAdmin = false`
- **WHEN** `getAuthenticatedSession()` resolves a valid session cookie for that user
- **THEN** the returned `SessionUser` contains `isSuperAdmin: false`

#### Scenario: No additional Prisma query introduced

- **WHEN** `getAuthenticatedSession()` runs
- **THEN** it issues at most one `prisma.session.findUnique` call that already selects `isSuperAdmin`
- **AND** consumers do not need a second Prisma roundtrip to read the flag

### Requirement: requireSuperAdmin guard

The system SHALL expose `requireSuperAdmin()` in `lib/super-admin/guard.ts` returning `{ auth }` or `{ response }`. On success, the `auth` arm SHALL carry the authenticated session and an asserted `isSuperAdmin: true`. With no session, the `response` arm SHALL carry HTTP `401`. With a session whose `user.isSuperAdmin !== true`, the `response` arm SHALL carry HTTP `403` with body `Acceso restringido a Super Admin`. The guard SHALL NOT issue its own Prisma query for `isSuperAdmin`; it SHALL read the flag from the session payload returned by `requireAuthenticatedSession()`.

#### Scenario: Authenticated SA session succeeds

- **GIVEN** an authenticated session whose `user.isSuperAdmin === true`
- **WHEN** the route handler calls `await requireSuperAdmin()`
- **THEN** the `auth` arm carries the session and an asserted `isSuperAdmin: true`
- **AND** the `response` arm is undefined

#### Scenario: Authenticated non-SA session rejected with 403

- **GIVEN** an authenticated session whose `user.isSuperAdmin === false`
- **WHEN** the route handler calls `await requireSuperAdmin()`
- **THEN** the `response` arm carries HTTP `403` with message `Acceso restringido a Super Admin`

#### Scenario: Unauthenticated request rejected with 401

- **GIVEN** no session cookie (or expired/revoked session)
- **WHEN** the route handler calls `await requireSuperAdmin()`
- **THEN** the `response` arm carries HTTP `401`

#### Scenario: Guard is re-exported from lib/api-auth

- **WHEN** a route handler imports `requireSuperAdmin` from `@/lib/api-auth`
- **THEN** the import resolves to the function in `lib/super-admin/guard.ts`
- **AND** no circular import is introduced (one-way re-export)

### Requirement: SA-only API endpoint

The system SHALL expose `GET /api/super-admin/me` returning `{ id, email, name, isSuperAdmin: true }` for an SA session. The route handler SHALL call `requireSuperAdmin()` as its first line. Edge middleware SHALL reject missing-cookie requests for any `/api/super-admin/*` path with `401` before the handler runs. The endpoint SHALL carry no business logic and SHALL be the only SA-namespaced API route in FASE 1.

#### Scenario: SA session returns 200 with user shape

- **GIVEN** an authenticated session whose `user.isSuperAdmin === true`
- **WHEN** the client sends `GET /api/super-admin/me` with a valid session cookie
- **THEN** the response status is `200`
- **AND** the body contains `{ id, email, name, isSuperAdmin: true }`

#### Scenario: Store-admin session returns 403

- **GIVEN** an authenticated session whose `user.isSuperAdmin === false`
- **WHEN** the client sends `GET /api/super-admin/me` with a valid session cookie
- **THEN** the response status is `403`
- **AND** the handler does not return the user shape

#### Scenario: Unauthenticated request returns 401 at the edge

- **WHEN** the client sends `GET /api/super-admin/me` without a session cookie
- **THEN** the Edge middleware returns `401` and the handler does not run

#### Scenario: Middleware does not consult Prisma

- **WHEN** the request reaches the Edge middleware
- **THEN** the middleware checks only cookie presence
- **AND** does NOT attempt to read `isSuperAdmin` (Prisma unavailable in Edge)

### Requirement: Super Admin layout and welcome page

The system SHALL expose `/super-admin` as a route group with a layout that mounts `ThemeProvider` only (no `StoreProvider`, `CashSessionProvider`, or store-specific context). `app/super-admin/page.tsx` SHALL be a server component calling `getAuthenticatedSession()`. Null session SHALL redirect to `/login`. `user.isSuperAdmin !== true` SHALL respond with `403` or redirect to `/app` (design phase documents the choice). `user.isSuperAdmin === true` SHALL render `Bienvenido, {user.name}` and a placeholder card for the FASE 4 dashboard.

#### Scenario: SA user sees the welcome page

- **GIVEN** an authenticated session whose `user.isSuperAdmin === true`
- **WHEN** the user navigates to `/super-admin`
- **THEN** the response status is `200`
- **AND** the rendered HTML contains `Bienvenido, ` followed by `user.name`
- **AND** the rendered HTML does NOT include store sidebar, nav, or cash-control widgets

#### Scenario: Store admin gets 403 or redirect

- **GIVEN** an authenticated session whose `user.isSuperAdmin === false`
- **WHEN** the user navigates to `/super-admin`
- **THEN** the response is `403` or a redirect away from `/super-admin`
- **AND** the SA welcome greeting is NOT rendered

#### Scenario: Unauthenticated visitor is redirected to login

- **GIVEN** no valid session cookie
- **WHEN** the visitor navigates to `/super-admin`
- **THEN** the page redirects to `/login`
- **AND** the SA welcome greeting is NOT rendered

#### Scenario: Layout omits StoreProvider

- **WHEN** the SA layout renders
- **THEN** the `StoreProvider` is NOT in the React tree
- **AND** the `ThemeProvider` IS in the React tree

### Requirement: Redirect from store panel for SA users

`app/app/(panel)/layout.tsx` SHALL redirect any authenticated user whose `user.isSuperAdmin === true` to `/super-admin` on mount. The redirect SHALL run before any store-only redirect (e.g. `cashControlEnabled`) so the two never conflict. Store admin and employee sessions SHALL render the store panel unchanged.

#### Scenario: SA-flagged user is redirected to /super-admin

- **GIVEN** an authenticated session whose `user.isSuperAdmin === true`
- **WHEN** the user navigates to `/app` (or any `/app/*` path)
- **THEN** the layout redirects to `/super-admin` via `router.replace`
- **AND** the store panel is not the active route

#### Scenario: Store admin user is not redirected

- **GIVEN** an authenticated session whose `user.isSuperAdmin === false`
- **WHEN** the user navigates to `/app`
- **THEN** the layout does NOT redirect to `/super-admin`
- **AND** the store panel renders normally

#### Scenario: Unauthenticated visitor is unaffected

- **GIVEN** no valid session cookie
- **WHEN** the visitor navigates to `/app`
- **THEN** the parent `app/app/layout.tsx` redirects to `/login` exactly as before
- **AND** the SA redirect branch does not interfere

### Requirement: Super Admin seed script

The system SHALL provide `prisma/seeds/super-admin.ts` invoked by `pnpm seed:super-admin`. The script SHALL read the comma-separated list in `SUPER_ADMIN_EMAILS` and set `isSuperAdmin = true` on every `User` whose email appears in it. Other users SHALL keep `isSuperAdmin = false`. The script SHALL be idempotent, SHALL be a safe no-op when `SUPER_ADMIN_EMAILS` is unset or empty, and SHALL be a safe no-op when listed emails don't match any user row.

#### Scenario: Matching emails are flipped to Super Admin

- **GIVEN** two users `sa1@example.com` and `store-admin@example.com`
- **AND** `SUPER_ADMIN_EMAILS="sa1@example.com"`
- **WHEN** `pnpm seed:super-admin` runs
- **THEN** `sa1@example.com` has `isSuperAdmin = true`
- **AND** `store-admin@example.com` has `isSuperAdmin = false`

#### Scenario: Seed is idempotent

- **GIVEN** a database where a user already has `isSuperAdmin = true`
- **WHEN** `pnpm seed:super-admin` runs again with the same env var
- **THEN** that user still has `isSuperAdmin = true`
- **AND** no duplicate rows or audit noise are created

#### Scenario: Empty env var is a safe no-op

- **WHEN** `pnpm seed:super-admin` runs with `SUPER_ADMIN_EMAILS` unset or empty
- **THEN** the script exits with status `0`
- **AND** no `User` row has its flag mutated

#### Scenario: Unknown emails are a safe no-op

- **WHEN** `pnpm seed:super-admin` runs with `SUPER_ADMIN_EMAILS="nobody@example.com"` and that email does not exist
- **THEN** the script exits with status `0`
- **AND** no error is raised for the missing row

### Requirement: No regression of existing flows

The system SHALL continue to support, with no functional change: store admin login and navigation; employee login and navigation; POS flow; stock management (including the owner-withdrawal flow); sales recording; subscription pages; onboarding. The migration, session-plumbing change, and `(panel)/layout.tsx` redirect SHALL be additive only. Existing route tests, data-access tests, and e2e specs SHALL pass without modification.

#### Scenario: Store admin login lands on /app

- **GIVEN** a registered store admin user with `isSuperAdmin = false`
- **WHEN** the user logs in and navigates to `/app`
- **THEN** the store panel renders
- **AND** the user is NOT redirected to `/super-admin`

#### Scenario: Employee login lands on /app

- **GIVEN** a registered employee user with `isSuperAdmin = false`
- **WHEN** the user logs in and navigates to `/app`
- **THEN** the employee-visible store panel renders
- **AND** the user is NOT redirected to `/super-admin`

#### Scenario: Full test suite remains green

- **WHEN** `pnpm test` and `pnpm test:e2e` run after the change applies
- **THEN** both suites exit with status `0`
- **AND** no previously-passing test now fails
- **AND** no business feature (POS, stock, sales, subscription, onboarding) regresses

## MODIFIED Requirements

No MODIFIED Requirements for this delta. This is a greenfield capability: no `openspec/specs/super-admin/spec.md` exists yet, and no prior capability covers the Super Admin role, the guard, or the SA layout.

## REMOVED Requirements

No REMOVED Requirements for this delta.

## Test Plan

This section is a strict-TDD directive for the apply phase. Tests are red-first; the apply phase writes the test, sees it fail, then implements until it passes.

### `lib/super-admin/guard.test.ts` (new)

Unit tests for the guard. Cases:

- `401` when `requireAuthenticatedSession()` resolves to `null`.
- `403` when the resolved session has `user.isSuperAdmin === false`.
- Success when the resolved session has `user.isSuperAdmin === true`, with the `auth` arm carrying an asserted `isSuperAdmin: true`.

Stub `@/lib/auth-session` consistent with how `lib/api-auth.ts` is currently tested. Confirm RED before `guard.ts` is written.

### `app/api/super-admin/me/route.test.ts` (new)

Unit tests for the probe endpoint. Cases:

- `200` happy path: SA session, body matches `{ id, email, name, isSuperAdmin: true }`.
- `403` when `user.isSuperAdmin === false`.
- `401` when `requireAuthenticatedSession()` resolves to `null`.

Mock `requireSuperAdmin()` (or its dependency chain) following the existing pattern from `app/api/stock-movements/adjust/route.test.ts`. Confirm RED before `route.ts` is written.

### `tests/e2e/super-admin-auth.spec.ts` (new)

Playwright e2e spec. Cases:

- Login as a seeded SA user → navigate to `/super-admin` → see `Bienvenido, ` and the user's name.
- Login as a seeded store admin → navigate to `/super-admin` → receive non-`200` (`403` or redirect).
- Login as SA → navigate to `/app` → land on `/super-admin`.

This is the only e2e spec required for FASE 1; it covers the SA shell happy path, the non-SA rejection path, and the redirect from `/app`.

### Out of scope for this Test Plan

- Unit tests for the SA layout components (`app/super-admin/layout.tsx`, `components/super-admin/super-admin-shell.tsx`). The e2e spec covers rendering correctness.
- Unit tests for `prisma/seeds/super-admin.ts`. The e2e spec exercises the seed (it depends on a seeded SA user) and manual smoke covers edge cases.
- Migration unit tests. Manual inspection of the generated `migration.sql` in apply (must contain exactly the two `ALTER TABLE` statements with no destructive operations).
- Unit tests for `(panel)/layout.tsx`'s SA redirect branch in isolation. The e2e spec covers it end-to-end.
