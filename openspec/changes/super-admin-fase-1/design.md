# Design: super-admin-fase-1

## Context

FASE 1 introduces the Super Admin (SA) role as a **security-only** capability boundary. No business features ship in this phase — no companies list, no subscription admin, no coupons, no errors view, no audit hooks. Everything in the `IMPLEMENTACION_SUPER_ADMIN.md` roadmap that does business work belongs to FASES 2–8 and is explicitly out of scope.

The platform owner today has no cross-store visibility because every authenticated user is scoped by `requireSessionUser()` and `requireRole(["admin", "employee"])` (`lib/api-auth.ts:42–83, 106–122`). FASE 1 introduces:

- A boolean `User.isSuperAdmin` flag with a `superAdminScope` placeholder.
- A `requireSuperAdmin()` guard returning a discriminated `{ auth } | { response }` union.
- A probe endpoint `GET /api/super-admin/me` so the auth boundary has something concrete to test.
- A minimal `/super-admin` shell that loads `ThemeProvider` only (no `StoreProvider`, no `CashSessionProvider`).
- A redirect from `app/app/(panel)/layout.tsx` to `/super-admin` for SA-flagged users.
- A `seed:super-admin` script driven by the comma-separated env var `SUPER_ADMIN_EMAILS`.

Without this boundary first, no later phase can enforce "only SAs can do X" safely.

### Non-goals (repeated for design review)

- **No business features.** Dashboard, companies, subscriptions, coupons, errors, audit hooks — all FASE 2–8.
- **No `role: "super_admin"` string.** Boolean `isSuperAdmin`, not a new role enum value. Existing `requireRole(["admin", "employee"])` is untouched. Per `IMPLEMENTACION_SUPER_ADMIN.md` Apéndice D item 4.
- **No platform-internal `Store` row.** FASE 1 has zero `storeId` needs; creating it now would force a Store row with no consumer. Cleaner to defer to FASE 2.
- **No impersonation, no feature flags, no audit hooks.** Future phases.
- **No Edge middleware role check.** Edge runtime cannot reach Prisma; the role gate is inside the route handler via `requireSuperAdmin()`.
- **No change to the parent `app/app/layout.tsx`.** The SA redirect lives in `(panel)/layout.tsx` so the onboarding flow stays intact for store users.
- **No migration of existing users.** All default to `isSuperAdmin = false`; only those in `SUPER_ADMIN_EMAILS` are flipped by the seed.

## Goals / Non-Goals

### Goals

1. Add `User.isSuperAdmin` and `User.superAdminScope` columns with safe `DEFAULT FALSE` / `NULL`.
2. Expose `isSuperAdmin` on the server-side `SessionUser` shape populated by `getAuthenticatedSession()`.
3. Provide a `requireSuperAdmin()` guard that returns 401 (no session) / 403 (session but not SA) / success (SA) using a discriminated union.
4. Re-export the guard from `lib/api-auth.ts` via a one-way import to avoid circular dependencies.
5. Extend Edge middleware to reject missing-cookie requests to `/api/super-admin/*` with 401.
6. Render a minimal `/super-admin` shell (ThemeProvider + sidebar placeholder + welcome card) that an SA can land on.
7. Redirect any SA-flagged user from `/app` to `/super-admin`.
8. Ship a `seed:super-admin` script that flips `isSuperAdmin = true` for emails in `SUPER_ADMIN_EMAILS`.
9. Strict TDD: every behavior described in the spec is covered by an automated test written red-first.

### Non-Goals

1. Anything in FASES 2–8.
2. The `platform-internal` Store row.
3. Touching `requireRole` or the `User.role` matrix.
4. Edge-runtime role enforcement.

## Architecture

### Auth boundary layering — three layers, three responsibilities

| Layer | Runtime | Responsibility | What it CAN do | What it CANNOT do |
|-------|---------|----------------|----------------|-------------------|
| 1. Edge middleware (`middleware.ts`) | Edge | Cookie presence only | Read `request.cookies.get(SESSION_COOKIE_NAME)`; return `401` if missing | Touch Prisma; read `User.isSuperAdmin` |
| 2. Route handler (`requireSuperAdmin()`) | Node | Session + role gate | Read `SessionUser` (which already carries `isSuperAdmin`); return `401`/`403` or `auth` | Issue extra Prisma queries for the flag |
| 3. Service layer | Node | Business logic | Assume SA — no role checks | Trust unauthenticated callers |

**Rationale**: Prisma is unavailable in the Edge runtime (Next.js 16 does not bundle a Prisma client for Edge). Layer 1 is therefore limited to "cookie present", which is the cheap cheap defense. Layer 2 is the real barrier. Layer 3 is kept free of auth so business logic stays composable. Every FASE 2+ SA endpoint MUST call `requireSuperAdmin()` as the first line — this contract is part of the design phase for those changes.

### File layout — why `lib/super-admin/guard.ts` is a separate module

```
lib/
├── auth-session.ts          (already imports prisma; SessionUser adds isSuperAdmin)
├── api-auth.ts              (adds one-way re-export)
├── api-helpers.ts           (unchanged — exports errorResponse)
└── super-admin/
    └── guard.ts             (NEW — imports only from auth-session + api-helpers)
```

**Rationale for a separate module**: The guard is the *only* place in the codebase that knows how to read `isSuperAdmin` from the session payload and turn it into a `403`. Keeping it isolated means (a) the SA boundary is reviewable in one file; (b) any future tightening (e.g., audit logging on 403s) lands in one place; (c) it avoids inflating `lib/api-auth.ts`, which is the file every store endpoint already depends on. The one-way import rule (`guard.ts` imports from `auth-session.ts` and `api-helpers.ts`; `api-auth.ts` re-exports without back-importing from `guard.ts`) prevents a circular dependency. The TypeScript re-export is a pure symbol pass-through, not a value re-import.

### Why `isSuperAdmin` lives on `User`, not on `Session`

Session tokens have a 6-hour TTL (`lib/auth-session.ts:28`). If SA status lived on `Session`, demoting a user would not take effect until their next login — potentially 6 hours later. Putting it on `User` means `prisma.session.findUnique` joins through `user` and the guard always reads the fresh flag. Cost: one extra column on the `User.select` projection. Benefit: instant demotion, instant promotion, no cache invalidation logic.

### Why the probe endpoint `GET /api/super-admin/me` exists in FASE 1

FASE 1 otherwise has zero SA-namespaced API surface, which makes route tests awkward — there is nothing for `requireSuperAdmin()` to guard. The probe endpoint is intentionally minimal (it just returns `{ id, email, name, isSuperAdmin: true }` for an SA session) and is the foundation FASE 2+ will extend with companies, subscriptions, etc. It also gives the middleware's `401` contract a real path to assert against.

### Redirect placement — `(panel)/layout.tsx`, not the parent

The parent `app/app/layout.tsx` (lines 26–30) already redirects unauthenticated visitors to `/login` and (lines 78–89) renders the `OnboardingWizard` for users who have not completed onboarding. Forcing SA-flagged users through that path would (a) make them answer onboarding questions about a store they don't operate and (b) potentially break the wizard which depends on `StoreProvider` (an SA is not in any store's provider tree). Putting the redirect in the `(panel)/layout.tsx` (line 33–37 `useEffect` block, before the existing `cashControlEnabled` redirect) keeps the onboarding flow intact for store users and short-circuits cleanly for SAs.

The trade-off is a sub-100ms flash of the store sidebar before `router.replace("/super-admin")` runs. This is acceptable per the proposal's Risks section. Documented as known polish debt for a future phase if it bothers the platform owner.

## Detailed Design

### 3.1 Schema (Prisma)

`prisma/schema.prisma` — add two columns to `User` (after `role` at line 53):

```prisma
model User {
  id                     String   @id @default(uuid())
  storeId                String
  store                  Store    @relation(fields: [storeId), references: [id])
  email                  String   @unique
  name                   String
  role                   String
  isSuperAdmin           Boolean  @default(false)
  superAdminScope        String?
  passwordHash           String   @db.VarChar(255)
  // ... unchanged below
}
```

Migration name: `super_admin_fase_1`.

Expected generated `migration.sql` (exactly two lines, no transaction wrapper — Postgres allows `ADD COLUMN ... DEFAULT` outside transactions):

```sql
ALTER TABLE "users" ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN "super_admin_scope" TEXT;
```

Both statements are non-breaking: existing rows backfill to `false` / `NULL`. The `NOT NULL DEFAULT FALSE` on `is_super_admin` matches the TypeScript `Boolean @default(false)`. The nullable `super_admin_scope` matches `String?`.

After the migration applies, run `npx prisma generate` so `User.isSuperAdmin` and `User.superAdminScope` are available on the TS client.

### 3.2 Session payload

`lib/auth-session.ts` — extend `SessionUser` (line 14–20) and the `select` inside `getAuthenticatedSession` (line 153–161):

```ts
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  storeId: string;
  isSuperAdmin: boolean;
}

// inside getAuthenticatedSession select:
user: {
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    storeId: true,
    isSuperAdmin: true,
  },
},
```

Wire format unchanged: the cookie still carries the opaque `tokenHash`; the user data is fetched server-side on each request. `superAdminScope` is NOT exposed on `SessionUser` for FASE 1 (unused; deferred per Open Questions). `superAdminScope` also does not need to be added to `select` because the guard does not read it — only `isSuperAdmin` does.

### 3.3 `requireSuperAdmin` guard

New file `lib/super-admin/guard.ts`:

```ts
import { errorResponse } from "@/lib/api-helpers";
import {
  requireAuthenticatedSession,
  type AuthenticatedSession,
} from "@/lib/auth-session";

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

The `{ auth: { ...auth.auth, isSuperAdmin: true } }` form is intentional: even though `SessionUser.isSuperAdmin` is already `boolean`, the literal `true` narrows the type at the call site so callers get a discriminated-union guarantee. `requireSuperAdmin` does NOT issue its own Prisma query; it reads the flag from the session payload returned by `requireAuthenticatedSession()`.

`lib/api-auth.ts` — append at the bottom (pure re-export, no back-import):

```ts
// One-way re-export. lib/super-admin/guard.ts is the source of truth.
// Do NOT add `import { requireSuperAdmin } from "./super-admin/guard"` here —
// that would create a cycle once any super-admin route imports both.
export { requireSuperAdmin, type SuperAdminResult } from "./super-admin/guard";
```

Behavior matrix:

| Caller state | Result |
|--------------|--------|
| No session cookie / expired / revoked | `{ response: 401 }` (delegated to `requireAuthenticatedSession`) |
| Session present, `user.isSuperAdmin === false` | `{ response: 403 }` with body `{ error: "Acceso restringido a Super Admin" }` |
| Session present, `user.isSuperAdmin === true` | `{ auth: { sessionId, user: { ..., isSuperAdmin: true } } }` |

### 3.4 Middleware

`middleware.ts` — extend `PROTECTED_API_PREFIXES` (line 5–17):

```ts
const PROTECTED_API_PREFIXES = [
  "/api/categories",
  "/api/products",
  "/api/sales",
  "/api/suspended-sales",
  "/api/subscription",
  "/api/auth/users",
  "/api/auth/me",
  "/api/auth/hash-password",
  "/api/onboarding",
  "/api/cash-sessions",
  "/api/stock-movements",
  "/api/super-admin",
];
```

No other change. The existing `matcher: ["/app/:path*", "/api/:path*"]` (line 39) is left alone: `/super-admin/:path*` is intentionally NOT added explicitly (per proposal Resolved Decision #2). The SA layout calls `getAuthenticatedSession()` server-side and redirects to `/login` on null session, which is sufficient for FASE 1.

**Explicit limitation**: Edge runtime cannot query Prisma, so the middleware checks cookie presence only. The actual `isSuperAdmin` check lives inside the route handler via `requireSuperAdmin()`. This is defense-in-depth: missing cookie → 401 at the edge; valid cookie but not SA → 403 at the handler. A future phase may add an explicit `/super-admin/:path*` matcher if cookie fingerprinting becomes a concern.

### 3.5 Probe endpoint `GET /api/super-admin/me`

New file `app/api/super-admin/me/route.ts`:

```ts
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  return jsonResponse(
    {
      id: auth.auth.user.id,
      email: auth.auth.user.email,
      name: auth.auth.user.name,
      role: auth.auth.user.role,
      storeId: auth.auth.user.storeId,
      isSuperAdmin: true,
    },
    200,
  );
}
```

Response shape (200 for SA): `{ user: { id, email, name, role, storeId, isSuperAdmin: true } }`. The probe does NOT carry `superAdminScope` (unused in FASE 1). The handler does no Prisma work of its own — `requireSuperAdmin()` already validated the session.

### 3.6 Super Admin shell (`/super-admin`)

`app/super-admin/layout.tsx` (server component) — wraps the page in `ThemeProvider` only. No `StoreProvider`, no `CashSessionProvider`. Renders a minimal sidebar with a single "Dashboard" placeholder item and a header with the SA's name and a "Salir" button.

```tsx
import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "@/lib/auth-session";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { clearSessionCookie } from "@/lib/auth-session"; // invalidation via POST /api/auth/logout in real impl

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/login");
  if (!session.user.isSuperAdmin) {
    // Decision #1 — see "Open Questions" below. We render a 403 page instead of redirecting.
    return <ForbiddenPage />;
  }
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div className="font-semibold">Platform Admin</div>
          <form action="/api/auth/logout" method="POST">
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </form>
        </header>
        <div className="flex flex-1">
          <aside className="w-[235px] border-r p-4">
            <nav>
              <a href="/super-admin" className="block rounded px-3 py-2 hover:bg-muted">
                Dashboard
              </a>
            </nav>
          </aside>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}

function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-lg font-semibold">403 — Acceso restringido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección es exclusiva para Super Admins de plataforma.
        </p>
        <a href="/app" className="mt-4 inline-block text-sm text-primary underline">
          Volver a tu tienda
        </a>
      </div>
    </div>
  );
}
```

The "Salir" button posts to `/api/auth/logout` (existing endpoint — see `app/api/auth/logout/route.ts`). The `<form action method="POST">` pattern matches the existing convention; no client-side wiring is introduced.

`app/super-admin/page.tsx` (server component):

```tsx
import { getAuthenticatedSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function SuperAdminPage() {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/login");
  if (!session.user.isSuperAdmin) redirect("/app"); // belt-and-braces: layout already enforces

  return (
    <div>
      <h1 className="text-2xl font-bold">Bienvenido, {session.user.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Plataforma Super Admin — FASE 1 (seguridad).
      </p>
      <div className="mt-6 rounded-lg border bg-card p-6">
        <h2 className="font-semibold">FASE 4: Dashboard global</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Próximamente. Métricas de toda la plataforma.
        </p>
      </div>
    </div>
  );
}
```

**Decision #1 resolved**: render 403 with an explanatory card rather than redirect to `/app`. Rationale:

| Option | Pros | Cons |
|--------|------|------|
| 403 page (chosen) | Clear semantics; the SA shell is a security boundary, not a redirect target; the spec accepts both; aligns with API guard semantics; works for non-authenticated users who hit it directly | Slightly more code than a `redirect()` call |
| Redirect to `/app` | One line of code; store-admin UX is "nothing happened" | Hides the security boundary from non-SA users; if a non-SA visits the URL by mistake, they are silently sent somewhere they already are; less defensible from a "show the gate" perspective |

The proposal and spec both accept either. We choose 403 because (a) it surfaces the access boundary explicitly, which is what an admin of tienda would expect if they ever type `/super-admin` into the address bar; (b) it keeps the SA-only UI code-free of store-context assumptions; (c) the e2e spec's "Store admin gets 403 or redirect" scenario is satisfied. The page-level `redirect("/app")` is belt-and-braces only — the layout is the real gate.

### 3.7 Redirect from `(panel)/layout.tsx`

`app/app/(panel)/layout.tsx` — add the SA redirect BEFORE the existing `cashControlEnabled` redirect (line 33–37):

```tsx
useEffect(() => {
  if (user?.isSuperAdmin) {
    router.replace("/super-admin");
    return;
  }
  if (!cashControlEnabled && pathname === "/app/cash-sessions") {
    router.replace("/app/pos");
  }
}, [user?.isSuperAdmin, cashControlEnabled, pathname, router]);
```

**Critical dependency**: `user.isSuperAdmin` must be present on the `useAuth()` shape, which is sourced from `/api/auth/me` (line 233 in `lib/store-context.tsx`). `/api/auth/me` already calls `prisma.user.findUnique({ where: { id } })` which after migration automatically includes `isSuperAdmin` in the returned row (line 17 of `app/api/auth/me/route.ts` — `findUnique` selects all scalar columns by default when no `select` is passed). The `passwordHash` strip at line 107 leaves `isSuperAdmin` in the response. **No change to `/api/auth/me` is required**, but a unit test must assert that `data.user.isSuperAdmin` is `false` for store admins and `true` for SA-flagged users (added to `app/api/auth/me/route.test.ts` as a non-regression assertion — not in the spec's Test Plan but a design-time guard).

The redirect runs in `useEffect`, so a sub-100ms flash of the store sidebar is expected for SA users. Accepted per proposal.

### 3.8 Seed script

New file `prisma/seeds/super-admin.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const normalized = part.trim().toLowerCase();
    if (normalized.length === 0) continue;
    seen.add(normalized);
  }
  return Array.from(seen);
}

async function main() {
  const emails = parseEmails(process.env.SUPER_ADMIN_EMAILS);
  if (emails.length === 0) {
    console.log("SUPER_ADMIN_EMAILS is empty — no-op.");
    process.exit(0);
  }

  const found = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, isSuperAdmin: true },
  });

  const matched = new Set(found.map((u) => u.email));
  const missingEmails = emails.filter((e) => !matched.has(e));

  const targets = found.filter((u) => !u.isSuperAdmin);
  if (targets.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: targets.map((u) => u.id) } },
      data: { isSuperAdmin: true },
    });
  }

  console.log(
    `seed:super-admin — found: ${found.length}, marked: ${targets.length}, missing: ${missingEmails.length}`,
  );
  if (missingEmails.length > 0) {
    console.log(`missing emails: ${missingEmails.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Decision #2 resolved (parsing rules)**:

| Rule | Behavior |
|------|----------|
| Separator | Comma (`,`) — matches `IMPLEMENTACION_SUPER_ADMIN.md` Apéndice C |
| Whitespace | Each entry is `.trim()`'d before further processing |
| Case | Lowercased to canonical form for both storage and lookup (`@` is not case-sensitive in email but RFC says local-part IS; we normalize to lowercase for idempotency) |
| Empty entries | Filtered out (a trailing comma does not crash) |
| Duplicates | De-duped via `Set` (idempotency: `a@x.com, a@x.com` is one flip) |
| Unknown emails | Logged as `missing: N` and listed by name; no error raised |

Lookup uses `prisma.user.findMany({ where: { email: { in: normalized } } })`. The flip is `prisma.user.updateMany({ where: { id: { in: targets } }, data: { isSuperAdmin: true } })` where `targets` are users not already SA — making the script a true no-op on rerun (idempotency per spec scenario "Seed is idempotent").

`package.json` — add the script:

```json
{
  "scripts": {
    "seed:super-admin": "tsx prisma/seeds/super-admin.ts"
  }
}
```

`.env.example` — add the line:

```
# Coma-separado, opcional, usado solo por el seed
SUPER_ADMIN_EMAILS="tu@email.com"
```

## Trade-offs

| Choice | Alternative considered | Why we chose what we chose |
|--------|------------------------|-----------------------------|
| `User.isSuperAdmin: Boolean` | New value on `User.role` enum (e.g., `"super_admin"`) | The existing `User.role` is `String` (admin/employee) and is the input to `requireRole(["admin", "employee"])`. Adding a third value would weaken the existing role matrix — `requireRole(["admin"])` would either silently allow SAs (bad) or need explicit exclusion (more code). A boolean keeps the matrices separate. Cost: future RBAC within SA needs additional columns; mitigated by the `superAdminScope` placeholder. |
| Probe endpoint in FASE 1 | Defer the first SA-namespaced API to FASE 2 | It gives the route test a concrete target. Cost: a tiny piece of unused-by-product surface (no SA business logic touches it). Mitigated by doing nothing harmful. |
| 403 page (not redirect) for non-SA `/super-admin` | `redirect("/app")` | Surfaces the access boundary explicitly; matches API guard semantics; works for users who type the URL. Cost: a small component. |
| No platform-internal Store in FASE 1 | Seed a "Platform Admin" Store row now | FASE 1 has zero `storeId` needs. Adding it would force a Store row with no consumer, plus a `User.storeId` value pointing at it for SAs (the current `User.storeId` is `String`, not nullable). Cleaner to defer to FASE 2 when an SA-namespaced model actually needs a `storeId`. |
| Edge middleware stays cookie-only | Read a separate "is SA" cookie or HMAC the session token with a role claim | Prisma is unavailable in Edge. HMACing the session adds token-issuance complexity (signing key rotation, payload drift). The route handler guard is sufficient defense in depth. |
| One-way re-export from `lib/api-auth.ts` | Have `guard.ts` live in `lib/api-auth.ts` directly | The `api-auth.ts` file already imports `lib/auth-session`; if it also imported `lib/prisma` (which `guard.ts` does NOT, but future SA guards might — e.g., for an audit log), the import graph stays cleaner with a dedicated module. The re-export keeps the route-handler convention `import { requireSuperAdmin } from "@/lib/api-auth"` intact. |
| Redirect lives in `(panel)/layout.tsx`, not parent | Parent `app/app/layout.tsx` | The parent runs `OnboardingWizard` for incomplete users (line 78) and `CashSessionProvider`/`SyncProvider`/`AssistantProvider` (lines 91–100). An SA user has no `storeId` worth onboarding for; forcing them through the wizard breaks FASE 1. The `(panel)` group layout is the cleanest short-circuit point. |

## Risks and Mitigations

- **Circular import (re-iterated from proposal)**: `lib/api-auth.ts` re-exports `requireSuperAdmin`; `lib/super-admin/guard.ts` imports from `lib/auth-session.ts` and `lib/api-helpers.ts` only. `api-auth.ts` does NOT import from `guard.ts` — the cycle is one-way (re-export). Verify in apply phase by inspecting the resolved import graph; `tsc --noEmit` will surface a real cycle.
- **First-render flash of the store sidebar for SA users**: sub-100ms; accepted per proposal. If it bothers the platform owner, a follow-up polish phase can server-render the redirect by checking `user.isSuperAdmin` in the parent `app/app/page.tsx` redirect to `/super-admin` (but this collides with the onboarding flow and was deferred). Documented as known polish debt.
- **`SUPER_ADMIN_EMAILS` env var missing or empty**: the seed logs a clear "no-op" message and exits 0. No DB writes. Documented in PR description so ops does not panic.
- **Future `User.role` enum migration**: if FASE 2+ introduces a `role` enum on `User` (currently `String`), `isSuperAdmin` could become a derived field (`role === "super_admin"`). FASE 1 commits to keeping it a separate boolean. FASE 2 design phase must explicitly decide whether to migrate.
- **`useAuth()` shape drift**: `app/app/(panel)/layout.tsx` reads `user?.isSuperAdmin` from `useAuth()`. That hook is fed by `/api/auth/me`, which after migration automatically includes the new column (no Prisma `select` change). Verified by reading `app/api/auth/me/route.ts:107` — `passwordHash` strip leaves the rest intact. **Mitigation**: write the e2e spec before the layout change so any `useAuth()` consumer that does not see the field is caught early (per proposal Risks).
- **Seed script on a fresh DB with no matching users**: logs `missing: N` and exits 0. Documented; no error. Operators must register the SA user first, then re-run the seed.
- **Edge runtime limits**: future maintainers may be tempted to add a role check to `middleware.ts`. The design explicitly forbids this for FASE 1. Documented in a comment in the file (added by apply phase) so the temptation is documented as a known limitation.

## Open Questions

- **None blocking.** Both pre-design questions (#1 non-SA access to `/super-admin`, #2 `SUPER_ADMIN_EMAILS` parsing) are resolved above (403 page; comma-split / trim / lowercase / de-dup / filter-empty / case-insensitive matching).
- **Deferred to a future phase**:
  - Should `superAdminScope` be exposed on `SessionUser`? Design says **NO** for FASE 1 (no consumer); add later if a feature needs it.
  - Should `pnpm seed:super-admin` accept email as a CLI arg (e.g., `--email a@x.com`) in addition to the env var? Out of scope for FASE 1; defer until ops needs it.
  - Should `/super-admin/:path*` be added explicitly to the middleware matcher? Out of scope for FASE 1; defer until cookie fingerprinting becomes a concern.

## Migration / Rollout Plan

- Single migration: `super_admin_fase_1` (additive; `DEFAULT FALSE` for `is_super_admin`; nullable `super_admin_scope`).
- No backfill script needed — `DEFAULT FALSE` handles existing rows.
- No feature flag needed — the SA shell does nothing harmful, and no non-SA user can reach `/super-admin` (the layout enforces 403) or `/api/super-admin/*` (the handler enforces 403).
- After deploy, the platform owner provisions the first SA by:
  1. Registering a normal user through `/register` (gets `isSuperAdmin = false`).
  2. Adding the email to `.env` (`SUPER_ADMIN_EMAILS="tu@email.com"`).
  3. Running `pnpm seed:super-admin` — logs `{ found, marked, missing }`.
  4. Logging in — lands on `/super-admin`; `/app` redirects to `/super-admin`.
- Rollback: revert the migration (drop the two columns), revert the code commits. Because no business feature reads `isSuperAdmin` outside the new guard and layout, dropping the column is safe — a user who was SA becomes a regular store user.
- The seed script is additive and idempotent; deleting it does not affect DB state.

## Testing Strategy

Strict TDD per `openspec/config.yaml: strict_tdd: true`. Tests are red-first; apply writes each test, sees it fail, then implements until it passes.

### `lib/super-admin/guard.test.ts` (new)

Three cases, mirroring the spec's "requireSuperAdmin guard" requirement:

1. **No session → 401**: `vi.mock("@/lib/auth-session", ...)` to make `getAuthenticatedSession()` return `null`; assert `result.response.status === 401`.
2. **Store-admin session (`isSuperAdmin: false`) → 403**: mock `getAuthenticatedSession()` to return a session where `user.isSuperAdmin === false`; assert `result.response.status === 403` and body contains `"Acceso restringido a Super Admin"`.
3. **SA session (`isSuperAdmin: true`) → success**: mock `getAuthenticatedSession()` to return a session where `user.isSuperAdmin === true`; assert `result.auth.user.isSuperAdmin === true` and `result.response` is `undefined`.

Pattern: follow `lib/api-auth.test.ts` exactly (uses `vi.mock("@/lib/auth-session", () => ({ getAuthenticatedSession: vi.fn() }))` with `mockAdminSession` / `mockEmployeeSession` fixtures).

### `app/api/super-admin/me/route.test.ts` (new)

Three cases, mirroring the spec's "SA-only API endpoint" requirement:

1. **SA session → 200**: stub `requireSuperAdmin` to return `{ auth: { user: { id, email, name, role, storeId, isSuperAdmin: true } } }`; assert `response.status === 200` and body shape matches.
2. **Store-admin session → 403**: stub `requireSuperAdmin` to return `{ response: new Response(..., { status: 403 }) }`; assert `response.status === 403`.
3. **No session → 401**: stub `requireSuperAdmin` to return `{ response: new Response(..., { status: 401 }) }`; assert `response.status === 401`.

Pattern: follow `app/api/stock-movements/adjust/route.test.ts` (`vi.spyOn(apiAuth, "requireSessionUser")` style; for this file, `vi.spyOn(apiAuth, "requireSuperAdmin")`).

### `tests/e2e/super-admin-auth.spec.ts` (new)

Playwright spec. Three cases, mirroring the spec's "Super Admin layout and welcome page" + "Redirect from store panel for SA users" requirements:

1. **SA login → `/super-admin` loads → "Bienvenido, {name}" visible**: register/seed an SA user (e.g., extend `tests/e2e/utils/db.ts` to add `E2E_SEED.superAdmin`), log in, navigate to `/super-admin`, assert the welcome heading matches the user's name.
2. **Store admin login → `/super-admin` returns non-200**: log in as the seeded store admin, navigate to `/super-admin`, assert the response is not 200 OR the URL leaves `/super-admin` (per Decision #1 we render 403, so assert the 403 page heading is visible).
3. **SA login → `/app` redirects to `/super-admin`**: log in as the seeded SA, navigate to `/app`, assert `page.url()` ends with `/super-admin`.

Follow `tests/e2e/auth.spec.ts` patterns: `resetTestDatabase()` in `beforeEach`, `E2E_SEED` fixtures for logins.

### Spec scenario → test mapping (brief)

| Spec scenario | Test |
|---------------|------|
| Authenticated SA session succeeds | `guard.test.ts` case 3 |
| Authenticated non-SA session rejected with 403 | `guard.test.ts` case 2 |
| Unauthenticated request rejected with 401 | `guard.test.ts` case 1 + `me/route.test.ts` case 3 |
| Guard is re-exported from `lib/api-auth` | `guard.test.ts` imports from `@/lib/api-auth` (resolves) |
| SA session returns 200 with user shape | `me/route.test.ts` case 1 |
| Store-admin session returns 403 | `me/route.test.ts` case 2 |
| Unauthenticated request returns 401 at the edge | e2e case 2 (no cookie path) — middleware layer is integration-tested via e2e |
| SA user sees the welcome page | e2e case 1 |
| Store admin gets 403 or redirect | e2e case 2 |
| Unauthenticated visitor redirected to login | e2e case 2 (logged out) |
| SA-flagged user redirected to `/super-admin` | e2e case 3 |
| Seed is idempotent | manual smoke + seed-script unit (out of scope per spec; manual only) |
| Empty env var is a safe no-op | manual smoke |
| Full test suite remains green | final `pnpm test` + `pnpm test:e2e` in apply |

### Out of scope for this Test Plan (per spec)

- Unit tests for the SA layout/page components — e2e covers rendering correctness.
- Unit tests for `prisma/seeds/super-admin.ts` — e2e exercises the seed end-to-end.
- Migration unit tests — manual inspection of `migration.sql` in apply.

## File-by-File Change List

Strict-TDD ordering. Code bodies live in the apply phase.

1. **`prisma/schema.prisma`** — add `isSuperAdmin Boolean @default(false)` and `superAdminScope String?` to `User`.
2. **Run** `npx prisma migrate dev --name super_admin_fase_1`. Inspect `migration.sql`: must contain exactly the two `ALTER TABLE` statements with no destructive ops.
3. **Run** `npx prisma generate`. Verify `User.isSuperAdmin` is now typed.
4. **`lib/auth-session.ts`** — extend `SessionUser` interface; extend `select` inside `getAuthenticatedSession()`. Must happen after step 3.
5. **WRITE** `lib/super-admin/guard.test.ts` (RED). Run `pnpm test lib/super-admin/guard.test.ts` — confirm module-not-found.
6. **`lib/super-admin/guard.ts`** — create. GREEN for the guard tests.
7. **`lib/api-auth.ts`** — append the one-way re-export. No new tests needed (the guard tests already import through `@/lib/api-auth`).
8. **WRITE** `app/api/super-admin/me/route.test.ts` (RED). Run — confirm module-not-found.
9. **`app/api/super-admin/me/route.ts`** — create. GREEN for the route test.
10. **`middleware.ts`** — add `"/api/super-admin"` to `PROTECTED_API_PREFIXES`. No test (out of scope per spec; e2e covers the integration).
11. **`app/super-admin/layout.tsx`** — create (server component, ThemeProvider only, 403 page for non-SA, redirect to `/login` for no session).
12. **`app/super-admin/page.tsx`** — create (server component, "Bienvenido, {name}" + placeholder card).
13. **`app/app/(panel)/layout.tsx`** — add the SA `useEffect` branch BEFORE the `cashControlEnabled` branch.
14. **`prisma/seeds/super-admin.ts`** — create with the parsing rules above.
15. **`package.json`** — add `"seed:super-admin": "tsx prisma/seeds/super-admin.ts"`.
16. **`.env.example`** — add the `SUPER_ADMIN_EMAILS` line.
17. **WRITE** `tests/e2e/super-admin-auth.spec.ts` — Playwright spec; extend `tests/e2e/utils/db.ts` with an SA fixture.
18. **Run** `pnpm test` + `pnpm test:e2e` + `pnpm lint` + `pnpm tsc --noEmit`. All green, no regressions.
