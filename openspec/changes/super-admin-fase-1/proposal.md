# Change: super-admin-fase-1

## Why

The platform owner has no way to perform cross-store operations (suspend a
tenant, view audit logs, fix billing issues, manage coupons, monitor errors)
because there is no concept of a "platform" user. Every authenticated user
today belongs to a single `Store` and is scoped by `requireSessionUser()`
and `requireRole(["admin", "employee"])` (`lib/api-auth.ts:8, 64-83, 106-122`).
A new role — Super Admin — is needed before any of the 8 phases of the
Super Admin roadmap (`IMPLEMENTACION_SUPER_ADMIN.md`) can ship.

This change delivers **only the security and access boundary** for that role:
the `isSuperAdmin` flag, a `requireSuperAdmin()` guard, the SA layout shell,
and the redirect from `/app` to `/super-admin` for SA-flagged users. **No
business features** (dashboard metrics, companies, subscriptions, coupons,
errors, audit hooks) — those are FASE 2–8 and explicitly out of scope.

Without this guard in place first, no later phase can enforce "only SAs can
do X" safely.

## What Changes

- **Schema** (`prisma/schema.prisma`): add `isSuperAdmin Boolean @default(false)`
  and `superAdminScope String?` to the `User` model. Migration
  `super_admin_fase_1`.
- **Seed script** (`prisma/seeds/super-admin.ts`): reads `SUPER_ADMIN_EMAILS`
  from `.env` (comma-separated) and sets `isSuperAdmin = true` on matching
  users. New `package.json` script `seed:super-admin`. Add `SUPER_ADMIN_EMAILS`
  to `.env.example`.
- **Session plumbing** (`lib/auth-session.ts`): extend the `select` inside
  `getAuthenticatedSession()` (line 153–161) to also pull `isSuperAdmin`. No
  new session-store field needed; the guard reads it from the existing
  `SessionUser` shape extended in this file.
- **Guard** (new `lib/super-admin/guard.ts`): exports `requireSuperAdmin()`,
  discriminated union `SuperAdminResult` with `auth` or `response` arms.
  Returns `401` if no session (delegates to `requireAuthenticatedSession`),
  `403` if session but `user.isSuperAdmin !== true`.
- **API auth re-export** (`lib/api-auth.ts`): re-export `requireSuperAdmin`
  at the bottom so route handlers can follow the existing
  `import { requireSuperAdmin } from "@/lib/api-auth"` convention.
- **Middleware** (`middleware.ts`): add `/api/super-admin` to
  `PROTECTED_API_PREFIXES` so missing-cookie requests get `401` at the edge.
  `/super-admin/:path*` already falls under `/app/:path*` matcher coverage
  and is not added explicitly (the matcher is coarse — see Risks).
- **SA layout & page** (new):
  - `app/super-admin/layout.tsx` — `ThemeProvider` only, **no** `StoreProvider`,
    minimal sidebar with a single "Dashboard" placeholder item, header with
    `user.name` and a logout button, distinct "Platform Admin" branding.
  - `app/super-admin/page.tsx` — server component, calls
    `getAuthenticatedSession()`; if `!user.isSuperAdmin` → `notFound()` or
    redirect to `/login`; renders "Bienvenido, {name}" + placeholder card.
  - `components/super-admin/super-admin-shell.tsx` — client wrapper for
    desktop + mobile responsive behavior.
- **Redirect from `/app`** (`app/app/(panel)/layout.tsx`): in the existing
  client-side `useEffect` block (lines 33–37), add a check
  `if (user?.isSuperAdmin) router.replace("/super-admin")`. Runs **before**
  the existing `cashControlEnabled` redirect so the two never conflict.
  See Risks for the `useAuth()` shape dependency.
- **Tests** (per `strict_tdd: true`):
  - `lib/super-admin/guard.test.ts` — three cases: no session → `401`,
    store-admin session (`isSuperAdmin: false`) → `403`, SA session
    (`isSuperAdmin: true`) → `200` with `auth.user.isSuperAdmin === true`.
  - `app/api/super-admin/me/route.test.ts` — auth 401/403 happy path for
    the probe endpoint introduced below.
  - `tests/e2e/super-admin-auth.spec.ts` — Playwright spec: login as SA →
    land on `/super-admin` → see "Bienvenido"; login as store admin → try
    `/super-admin` → `403`/redirect.

### Probe endpoint (added to enable a clean happy-path test)

A minimal `app/api/super-admin/me/route.ts` (GET) is added in this phase so
that `pnpm test` and the e2e suite have a concrete SA-only endpoint to hit.
It returns `{ id, email, name, isSuperAdmin: true }` after passing
`requireSuperAdmin()`. This endpoint carries **no business logic** and is
the only SA-namespaced API route in this phase.

## Impact

- **Affected specs**: introduces a new capability `super-admin` under
  `openspec/specs/super-admin/spec.md`. No existing capability is modified
  because no spec exists for `auth-session`, `user-role`, or `app-layout`
  yet (verified by `ls openspec/specs` — only `owner-withdrawal`).
- **Affected code** (additions unless noted):
  - `prisma/schema.prisma` (modified)
  - `prisma/migrations/<ts>_super_admin_fase_1/migration.sql` (new)
  - `prisma/seeds/super-admin.ts` (new)
  - `package.json` (modified — `seed:super-admin` script)
  - `.env.example` (modified — `SUPER_ADMIN_EMAILS`)
  - `lib/auth-session.ts` (modified — `select` extended)
  - `lib/super-admin/guard.ts` (new)
  - `lib/api-auth.ts` (modified — re-export)
  - `middleware.ts` (modified — prefix added)
  - `app/super-admin/layout.tsx` (new)
  - `app/super-admin/page.tsx` (new)
  - `components/super-admin/super-admin-shell.tsx` (new)
  - `app/app/(panel)/layout.tsx` (modified — redirect added)
  - `app/api/super-admin/me/route.ts` (new — probe endpoint)
  - `app/api/super-admin/me/route.test.ts` (new)
  - `lib/super-admin/guard.test.ts` (new)
  - `tests/e2e/super-admin-auth.spec.ts` (new)
- **Affected behavior**: a SA-flagged user logging in lands on
  `/super-admin` instead of `/app`. Store admin users see no change.

## Non-Goals

- **No business features.** No dashboard, no companies list, no subscription
  admin, no coupons, no errors view, no audit log UI. All deferred to
  FASE 2–8.
- **No `role: "super_admin"` string.** The plan and the codebase converge
  on a boolean flag (`User.isSuperAdmin`), not a string role. Existing
  `requireRole(["admin", "employee"])` stays as-is; the SA path goes
  through `requireSuperAdmin()` instead. Per `IMPLEMENTACION_SUPER_ADMIN.md`
  Apéndice D item 4.
- **No impersonation**, **no feature flags**, **no audit hooks yet**. Those
  are future phases.
- **No Edge middleware role check.** The Edge runtime cannot reach
  Prisma, so the SA role is enforced inside the route handler via
  `requireSuperAdmin()`, not at the middleware. See Risks.
- **No platform-internal `Store` row in this phase.** The plan's FASE 2
  introduces `prisma/seeds/platform-store.ts`; that belongs to FASE 2 and
  is NOT created here, even though the FASE 1 brief mentions it. This
  proposal deliberately defers the placeholder store because no SA-namespaced
  feature in FASE 1 needs a `storeId`.
- **No migration of existing users.** All users default to
  `isSuperAdmin = false`; only those listed in `SUPER_ADMIN_EMAILS` get
  flipped by the seed.
- **No change to the `app/app/layout.tsx` (parent) file.** The redirect
  lives in the `(panel)` group layout so the route group keeps its
  client-side providers intact for non-SA users.

## Resolved Decisions (formerly Open Questions)

1. **`isSuperAdmin` lives on `User`, not on `Session`.** Session tokens
   are 6-hour TTL (`lib/auth-session.ts:28`); if SA status lived on the
   session row, demoting a user would not take effect until their next
   login. Putting it on `User` means `prisma.session.findUnique` joins
   through and always reads fresh.
2. **The `/super-admin/:path*` matcher is intentionally NOT added
   explicitly.** The current `matcher` already includes `/app/:path*` and
   `/api/:path*`. `/super-admin/:path*` is a brand-new top-level segment;
   leaving it out of the matcher means **the middleware does not run for
   `/super-admin` pages**. That is acceptable for FASE 1 because the SA
   layout itself calls `getAuthenticatedSession()` and redirects to
   `/login` if no session. A future phase may add it explicitly if cookie
   fingerprinting becomes a concern.
3. **The `/app` redirect lives in `app/app/(panel)/layout.tsx`, not the
   parent `app/app/layout.tsx`.** The parent file already redirects
   unauthenticated users to `/login` (line 26–30). Adding the SA redirect
   there would force SA users through the onboarding flow
   (`hasCompletedOnboarding` check at line 22), which is meaningless for
   platform-internal accounts and would break FASE 1. Putting it in the
   `(panel)` group preserves the existing onboarding behavior for store
   users and short-circuits for SA users.
4. **The probe endpoint `/api/super-admin/me` is added in this phase.**
   FASE 1 otherwise has no SA-namespaced API surface, which makes route
   tests awkward. The endpoint is intentionally minimal (returns the SA
   user shape) and is the foundation that FASE 2+ will extend.

## Migration

Additive column only:

```sql
ALTER TABLE "users" ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN "super_admin_scope" TEXT;
```

`pnpm prisma migrate dev --name super_admin_fase_1` should produce exactly
these two statements. Both are non-breaking (existing rows default to
`is_super_admin = false`, `super_admin_scope = NULL`). `pnpm prisma
generate` regenerates the client so `User.isSuperAdmin` and
`User.superAdminScope` are available on the TS side.

## Rollback Plan

Revert the schema columns (drop the two `ALTER TABLE` statements), revert
the code commits. Because no business feature reads `isSuperAdmin` yet
outside the new guard and layout, dropping the column is safe for any
session opened after rollback — a user who was SA becomes a regular
store user, the worst case. Partial rollback (revert code, keep column)
is also safe: the column is unused until a future phase re-introduces a
reader.

The seed script is additive and idempotent; deleting it does not affect
DB state.

## Success Criteria

- [ ] `pnpm prisma migrate dev --name super_admin_fase_1` applies cleanly
      on a fresh database and on a snapshot with existing `User` rows.
- [ ] `prisma generate` regenerates the client; `User.isSuperAdmin` and
      `User.superAdminScope` are available in TS.
- [ ] `pnpm seed:super-admin` flips `isSuperAdmin = true` for every email
      listed in `SUPER_ADMIN_EMAILS` and leaves all others as `false`.
- [ ] `lib/super-admin/guard.test.ts` is red-first (per `strict_tdd`):
      written before the guard implementation, green after.
- [ ] `requireSuperAdmin()` returns `401` without a session cookie, `403`
      for `isSuperAdmin: false`, and an `auth` payload with
      `isSuperAdmin: true` for SA sessions.
- [ ] `GET /api/super-admin/me` returns `200` with the SA user shape for
      SA sessions and `401/403` otherwise.
- [ ] `tests/e2e/super-admin-auth.spec.ts` passes: SA login → `/super-admin`
      loads → "Bienvenido, {name}" visible; store-admin login → `/super-admin`
      shows `403` or redirects away.
- [ ] `pnpm test` and `pnpm test:e2e` are both green; **no existing test
      regresses**.
- [ ] Manual smoke test: store-admin user logs in, lands on `/app` as
      before; SA-flagged user logs in, lands on `/super-admin` and
      `/app` redirects to `/super-admin`.

## Risks

- **Edge middleware cannot check the role.** `middleware.ts` runs on the
  Edge runtime; Prisma cannot be imported there. The middleware will
  only enforce "cookie present", not "is SA". The real barrier is
  `requireSuperAdmin()` inside each route handler. **Mitigation**: every
  FASE 2+ SA endpoint MUST call `requireSuperAdmin()` as the first line;
  document this in the design phase for those changes.
- **`useAuth()` shape change propagates through client context.**
  `app/app/(panel)/layout.tsx` reads `user` from `useAuth()`. That hook
  is fed by the parent `app/app/layout.tsx` which calls
  `getAuthenticatedSession()`. As long as `SessionUser.isSuperAdmin` is
  populated by `lib/auth-session.ts`, the redirect works. **Mitigation**:
  write the e2e spec before the layout change so any `useAuth()` consumer
  that does not see the new field is caught early.
- **Redirect race during first render.** The `(panel)` layout mounts the
  sidebar, header, etc. before the `useEffect` runs the redirect. An SA
  user will see a flash of the store sidebar. **Mitigation**: acceptable
  for FASE 1 (the flash is sub-100ms); flagged for a future polish phase
  if it bothers the platform owner.
- **Seed script drift.** If `SUPER_ADMIN_EMAILS` contains emails that
  don't exist yet (e.g. SA registered after seed), the script is a no-op
  for those rows. **Mitigation**: re-run `pnpm seed:super-admin` after
  provisioning an SA account; document in the PR description.
- **Schema column rename if FASE 2 changes naming.** FASE 1 commits to
  `is_super_admin` (snake_case in SQL, `isSuperAdmin` camelCase in TS).
  Prisma handles this, but if FASE 2 introduces a `role` enum on `User`,
  we may want to migrate the column away. **Mitigation**: FASE 2 design
  phase should explicitly choose; for FASE 1 we stay with the boolean.
- **`requireSuperAdmin` re-export from `lib/api-auth.ts`.** The plan
  says "mantener el guard en `lib/super-admin/guard.ts` y exportar
  `requireSuperAdmin` desde `lib/api-auth.ts` para no romper la convención
  actual." The risk is circular imports if `lib/super-admin/guard.ts`
  imports from `lib/api-auth.ts` AND `lib/api-auth.ts` re-exports from it.
  **Mitigation**: `guard.ts` imports only from `lib/auth-session.ts` and
  `lib/api-helpers.ts`; `lib/api-auth.ts` does a pure re-export without
  importing the guard file (so the cycle goes only one way). Verify in
  apply phase.

## Open Questions

- **None blocking.** All four open questions above were resolved during
  the proposal phase and recorded under "Resolved Decisions" so they
  survive into design.