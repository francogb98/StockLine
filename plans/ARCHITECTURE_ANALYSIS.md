# Architecture Analysis & Implementation Plan

> Documento técnico para la transformación de VendePro POS en una plataforma profesional de gestión minorista.
> Lead Architect — Junio 2026

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Dependency Map](#2-dependency-map)
3. [Risk Analysis](#3-risk-analysis)
4. [Phase 1 — Cash Register Management](#4-phase-1--cash-register-management)
5. [Phase 2 — Inventory Movement History](#5-phase-2--inventory-movement-history)
6. [Phase 3 — Profitability Reporting](#6-phase-3--profitability-reporting)
7. [Phase 4 — Product Import (CSV/Excel)](#7-phase-4--product-import-csvexcel)
8. [Phase 5 — Returns & Sale Cancellations](#8-phase-5--returns--sale-cancellations)
9. [Phase 6 — Keyboard Productivity System](#9-phase-6--keyboard-productivity-system)
10. [Migration Strategy](#10-migration-strategy)
11. [Testing Strategy](#11-testing-strategy)

---

## 1. Current Architecture Analysis

### 1.1 Database Structure

```
Store (1) ──┬── (N) User
            ├── (N) Category
            ├── (N) Product
            ├── (N) Sale
            └── (1) Subscription

User (1) ──┬── (N) Session
           └── (N) Sale

Category (1) ── (N) Product

Product (1) ── (N) SaleItem

Sale (1) ── (N) SaleItem
```

**Current models:**

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| `Store` | id, name, address, phone | Tenant |
| `User` | id, storeId, email, role (admin\|employee), passwordHash | Auth + RBAC |
| `Session` | id, userId, tokenHash, expiresAt, revokedAt | Cookie-based auth |
| `Subscription` | id, storeId, status, plan, MP preapprovalId | Billing |
| `Category` | id, storeId, name, description | Product grouping |
| `Product` | id, storeId, barcode, name, price, cost, stock, minStock | Inventory |
| `Sale` | id, storeId, userId, subtotal, tax, total, paymentMethod | Transactions |
| `SaleItem` | id, saleId, productId, productName, quantity, unitPrice, total | Line items |

### 1.2 Main Business Entities

**Product** (`prisma/schema.prisma:89-108`):
- Fields: barcode (optional unique), name, description, categoryId, price (Float), cost (Float), stock (Int), minStock (Int)
- No image support
- No field-level permissions (employee can see cost)
- Stock is mutated directly — no movement history

**Sale** (`prisma/schema.prisma:110-125`):
- Stores subtotal, tax (21% IVA), total, paymentMethod (cash|card|transfer)
- Linked to Store and User
- No status field (always "completed")
- No link to cash register session
- No discount field
- No customer reference

**SaleItem** (`prisma/schema.prisma:127-139`):
- Denormalized productName, unitPrice, quantity, total
- Linked to Product and Sale
- No costPrice stored at time of sale
- No discount field

### 1.3 POS Flow

```
┌─────────┐    ┌──────────────┐    ┌──────────┐    ┌───────────┐
│ Barcode │───▶│ QuickProducts │───▶│ CartPanel │───▶│ Payment   │
│ Input   │    │ (grid/search)  │    │ (cart)    │    │ Panel     │
└─────────┘    └──────────────┘    └──────────┘    └───────────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │ POST /api/   │
                                                  │ sales        │
                                                  └──────────────┘
                                                         │
                                                         ▼
                                                  ┌──────────────────┐
                                                  │ sales-service.ts │
                                                  │ - validate stock │
                                                  │ - atomic tx      │
                                                  │ - create sale    │
                                                  └──────────────────┘
```

**Key files:**
- `components/pos/pos-layout.tsx` — Desktop layout with resizable panels
- `components/pos/mobile-pos.tsx` — Mobile layout with bottom tabs
- `components/pos/barcode-input.tsx` — Search by barcode/name
- `components/pos/quick-products.tsx` — Product grid with category filter
- `components/pos/cart-panel.tsx` — Cart with quantity controls
- `components/pos/payment-panel.tsx` — Payment method + complete button
- `lib/store-context.tsx` — All state (AuthContext, DataContext, POSContext)
- `lib/sales-service.ts` — Backend sale creation logic
- `app/api/sales/route.ts` — GET (list/detail) + POST (create)

### 1.4 Sales Flow (Backend)

```
POST /api/sales
  ├── requireSessionUser()           → 401 if not authenticated
  ├── enforceSubscriptionAccess()    → 403 if past_due/canceled
  ├── parse + validate payload       → 400 on invalid data
  ├── createSale() in serializable transaction:
  │   ├── Find products by IDs
  │   ├── Validate store ownership
  │   ├── Compute subtotal/tax/total from current prices
  │   ├── Ensure client-submitted amounts match server-computed
  │   ├── atomic updateMany (stock >= quantity, then decrement)
  │   └── Create Sale + SaleItems
  ├── Retry up to 3x on P2034 (serialization conflict)
  └── Return created sale
```

**Critical observations:**
- Stock deduction is atomic with `updateMany` + `stock >= quantity` guard
- If stock is insufficient, `updateMany` returns count=0, throws 409
- Prices are re-read from DB at sale time (not trusting client)
- Amounts must match server-computed values within 0.01 tolerance

### 1.5 Inventory Flow

```
Create product:  POST /api/products → set initial stock
Edit product:    PUT /api/products/[id] → overwrite stock
Sale:            POST /api/sales → stock decremented atomically
Delete product:  DELETE /api/products/[id] → removes from DB (no stock record)
```

**No stock movement tracking exists.** Stock changes happen silently.

### 1.6 Authentication Flow

```
Login:
  POST /api/auth/login
    → bcrypt.compare(password, hash)
    → invalidateCurrentSession()
    → createSession(userId) → random token, SHA-256 hash stored
    → setSessionCookie(token) → httpOnly, secure, sameSite:lax, 7d
    → return user (without passwordHash)

Session validation:
  getAuthenticatedSession()
    → read "session-token" cookie
    → SHA-256 hash → find Session in DB
    → check revokedAt, expiresAt
    → return { sessionId, user }

Authorization:
  requireSessionUser()        → any authenticated user
  requireAdminSessionUser()   → role === "admin"
  requirePermission(name)     → check ROLE_PERMISSIONS matrix
```

### 1.7 Frontend Architecture

```
StoreProvider (lib/store-context.tsx)
  ├── AuthContext: user, store, subscription, login/logout/register
  ├── DataContext: products, categories, sales, CRUD operations
  └── POSContext: cart, reservedStock, addToCart, completeSale

Data flow:
  1. Session restored on mount via GET /api/auth/me
  2. Products/categories/sales loaded via API on auth
  3. Optimistic updates: local state → API call → reconcile
  4. Mock data fallback if NEXT_PUBLIC_USE_MOCK_DATA=1
```

---

## 2. Dependency Map

```
                        ┌──────────────────────┐
                        │     PHASE 1           │
                        │  Cash Register        │
                        └──────────┬───────────┘
                                   │ requires
                                   ▼
                        ┌──────────────────────┐
                        │   Sale model          │
                        │   + cashSessionId     │
                        └──────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   PHASE 2        │    │   PHASE 5        │    │  PHASE 3         │
│ Stock Movements  │    │ Returns/Cancel   │    │ Profitability    │
│ - uses Product   │    │ - uses Sale      │    │ - uses SaleItem  │
│ - uses User      │    │ - uses Product   │    │ - uses Product   │
└──────────────────┘    │ - uses StockMov  │    └──────────────────┘
         │              └──────────────────┘              │
         │                    │                           │
         └────────────────────┼───────────────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │   PHASE 4        │
                     │ Product Import   │
                     │ - uses Product   │
                     │ - uses Category  │
                     └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │   PHASE 6        │
                     │ Keyboard Pro     │
                     │ - POS UI only    │
                     │ - no DB deps     │
                     └──────────────────┘
```

### Dependency Matrix

| Phase | Depends On | Required By | Database Changes | API Changes | UI Changes |
|-------|-----------|-------------|-----------------|-------------|------------|
| 1 — Cash Register | Sale model | Phases 2, 5 | New model `CashSession` | 5 new endpoints | New views in POS + Reports |
| 2 — Stock Movements | Product, User, Phase 1 | Phase 5 | New model `StockMovement` | 1-2 new endpoints | New view in Stock |
| 3 — Profitability | SaleItem, Product. Cost | — | TBD (costPrice in SaleItem?) | Dashboard queries | Dashboard widgets |
| 4 — Product Import | Product, Category | — | No schema changes | 1 new endpoint | New dialog/wizard |
| 5 — Returns/Cancel | Sale, SaleItem, Product, Phase 2 | — | Sale.status field | 1-2 new endpoints | New action in POS + Sale history |
| 6 — Keyboard Pro | POS UI components | — | None | None | Refinement only |

---

## 3. Risk Analysis

### 3.1 Cross-Cutting Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Existing sales have no `cashSessionId` | High | Make FK optional (nullable). Old sales become "uncategorized" |
| Existing products have no stock movements | Medium | Backfill only if needed. Phase 2 starts tracking from implementation date |
| Product cost changes affect historical profit | High | Snapshot costPrice in SaleItem at sale time as part of Phase 3 |
| Optimistic updates in frontend conflict with new server validations | Medium | Always reconcile with server response. Show toast on mismatch |
| Mock data mode (NEXT_PUBLIC_USE_MOCK_DATA) breaks with new models | Low | Update mock-data.ts with each phase. Keep feature flags for demo |

### 3.2 Phase-Specific Risks

**Phase 1 — Cash Register:**
- Breaking change: Sales must now belong to a cash session
- Existing sales will have `null` cashSessionId
- Migration: ALTER TABLE sales ADD COLUMN cash_session_id TEXT REFERENCES cash_sessions; no default
- UI risk: Employee must select an open session before selling
- Recommendation: Auto-create cash session on first sale of the day if none open

**Phase 2 — Stock Movements:**
- Large volume: Each sale creates N movements (one per item)
- Existing stock is a point-in-time value, no history
- Migration: No backfill needed. Start tracking forward
- Performance: Index on (productId, createdAt)

**Phase 3 — Profitability:**
- Product cost can change over time → historical profit becomes inaccurate
- Solution: Store `costPrice` in SaleItem at sale time (alongside unitPrice)
- This requires schema change to SaleItem

**Phase 4 — Product Import:**
- CSV parsing edge cases: encoding, separators, line breaks in fields
- Large imports (10k+ rows) could timeout API route
- Solution: Stream processing or background job

**Phase 5 — Returns/Cancellations:**
- Stock restoration must be atomic
- A returned item might have been purchased with different cost/price
- Financial: refund calculation, tax implications
- Must integrate with Phase 2 (stock movements) and Phase 1 (cash session for refund)

**Phase 6 — Keyboard Productivity:**
- Already 80% implemented in existing codebase
- Risk of regression: existing shortcuts might conflict with new views
- Low risk, high confidence

### 3.3 Recommended Implementation Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
```

**Rationale:**
1. **Phase 1 (Cash Register)** first because it's the foundation: sales link to cash sessions, cash sessions track daily operations. Everything else depends on having a reliable transaction context.
2. **Phase 2 (Stock Movements)** second because Phase 5 (returns) and Phase 3 (profitability) both need stock movement tracking. Returns must restore stock with a movement record.
3. **Phase 3 (Profitability)** can leverage the costPrice snapshot strategy and the movement data for accurate calculations.
4. **Phase 4 (Product Import)** is independent but easier after stock infrastructure is solid.
5. **Phase 5 (Returns/Cancellations)** depends on both Phase 1 (cash context) and Phase 2 (stock restoration).
6. **Phase 6 (Keyboard Productivity)** is UI-only and can be done in parallel or last.

---

## 4. Phase 1 — Cash Register Management

### 4.1 Schema Proposal

```prisma
model CashSession {
  id              String    @id @default(uuid())
  storeId         String
  store           Store     @relation(fields: [storeId], references: [id])
  userId          String    // who opened
  user            User      @relation(fields: [userId], references: [id])
  openingAmount   Float     @default(0)
  closingAmount   Float?
  difference      Float?
  notes           String?
  closedAt        DateTime?
  createdAt       DateTime  @default(now())

  sales           Sale[]

  @@index([storeId, createdAt])
  @@index([storeId, userId])
  @@map("cash_sessions")
}
```

**Sale model changes:**
```prisma
model Sale {
  // ... existing fields ...
  cashSessionId   String?
  cashSession     CashSession? @relation(fields: [cashSessionId], references: [id])
  // + status: "completed" | "returned" | "cancelled" (for Phase 5)
  status          String       @default("completed")

  @@index([cashSessionId])
}
```

### 4.2 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| FK nullable? | Yes | Existing sales without session. Also allows admin to sell without opening cash if needed |
| Who can open? | Any authenticated user | Permissions enforced via existing RBAC later |
| Multiple open sessions? | No — only one open session per store | Enforce via unique index on (storeId) WHERE closedAt IS NULL |
| Auto-create on first sale? | Yes — if no open session, auto-create with openingAmount=0 | Prevent friction for employees |
| ClosingAmount vs Expected | Expected = sum of cash sales in session. Actual = operator-entered | Difference = Actual - Expected |

### 4.3 Prisma Model Proposal

```prisma
model CashSession {
  id              String    @id @default(uuid())
  storeId         String
  store           Store     @relation(fields: [storeId], references: [id])
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  openingAmount   Float     @default(0)
  expectedAmount  Float?    // system-calculated: sum of cash sales in this session
  closingAmount   Float?    // user-entered actual count
  difference      Float?    // closingAmount - expectedAmount
  notes           String?
  closedAt        DateTime?
  createdAt       DateTime  @default(now())

  sales           Sale[]

  @@index([storeId, createdAt(sort: desc)])
  @@index([storeId, userId])
  @@map("cash_sessions")
}
```

**Partial unique index** (requires Prisma raw query or separate constraint):
```sql
CREATE UNIQUE INDEX idx_cash_sessions_open_per_store
  ON cash_sessions (store_id)
  WHERE closed_at IS NULL;
```

### 4.4 API Proposal

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/cash-sessions` | Session | List sessions for store (admin: all, employee: own). Query params: `?status=open\|closed`, `?userId=`, `?page=`, `?limit=` |
| `POST` | `/api/cash-sessions` | Session | Open a new cash session. Body: `{ openingAmount, notes? }`. Validates no other open session exists. |
| `POST` | `/api/cash-sessions/[id]/close` | Session | Close session. Body: `{ closingAmount, notes? }`. Computes expectedAmount from cash sales, calculates difference. Admin only for viewing all. |
| `GET` | `/api/cash-sessions/[id]` | Session | Get session detail with sales breakdown |
| `GET` | `/api/cash-sessions/current` | Session | Get currently open session (or null) |

**Request/Response examples:**

```
POST /api/cash-sessions
Body: { "openingAmount": 50000, "notes": "Apertura turno mañana" }
Response 201: { "id": "...", "storeId": "...", "openingAmount": 50000, "createdAt": "...", "closedAt": null }

POST /api/cash-sessions/[id]/close
Body: { "closingAmount": 275000, "notes": "Cierre turno mañana" }
Response 200: {
  "id": "...",
  "openingAmount": 50000,
  "expectedAmount": 223450,  // system-calculated from cash sales
  "closingAmount": 275000,
  "difference": 51550,       // positive = surplus
  "notes": "Cierre turno mañana",
  "closedAt": "...",
  "sales": [ /* list of sales in this session */ ]
}
```

### 4.5 UI Proposal

**Cash Session Status Bar** (new component, shown at top of POS when a session is open):
- Green dot + "Caja abierta: $XX,XXX" 
- Tap → show session summary
- If no open session: yellow warning + "Abrir caja" button

**Open Cash Session Dialog** (new):
- Input: "Monto inicial en efectivo" (number, default 0)
- Input: "Notas opcionales" (text)
- Button: "Abrir caja"
- Validation: only one open session per store

**Close Cash Session Dialog** (new):
- Section: "Ventas del turno" — table with sales grouped by payment method
- Section: "Resumen":
  - Expected cash: $XX,XXX (sum of cash sales)
  - Card sales: $XX,XXX (informational)
  - Transfer sales: $XX,XXX (informational)
- Input: "Monto contado en efectivo" (required)
- Input: "Notas" (optional)
- Button: "Cerrar caja"
- After close: show difference alert (if > 0) or success

**Cash Sessions View** (new tab or section in Reports):
- Table: Date | Opened by | Opening | Expected | Counted | Difference | Status
- Click → detail with sales breakdown
- Filter by date range, status, user

### 4.6 Migration Strategy

```sql
-- 1. Create cash_sessions table
-- (handled by Prisma migration)

-- 2. Add cashSessionId to sales (nullable)
-- ALTER TABLE sales ADD COLUMN cash_session_id TEXT REFERENCES cash_sessions(id);
-- No default — existing sales stay NULL

-- 3. Create unique partial index for open sessions
-- This requires a raw SQL migration after Prisma schema push
CREATE UNIQUE INDEX idx_one_open_cash_session_per_store
  ON cash_sessions (store_id)
  WHERE closed_at IS NULL;

-- 4. Add status column to sales (for Phase 5 compatibility)
ALTER TABLE sales ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';
```

### 4.7 File Changes Summary

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `CashSession` model, add `cashSessionId` and `status` to `Sale` |
| `prisma/migrations/` | New migration |
| `lib/types.ts` | Add `CashSession` interface, add `cashSessionId` and `status` to `Sale` |
| `lib/store-context.tsx` | Add cash session state + methods |
| `lib/mock-data.ts` | Add mock cash sessions |
| `app/api/cash-sessions/route.ts` | New — GET list, POST create |
| `app/api/cash-sessions/[id]/route.ts` | New — GET detail |
| `app/api/cash-sessions/[id]/close/route.ts` | New — POST close |
| `app/api/cash-sessions/current/route.ts` | New — GET current open session |
| `app/api/sales/route.ts` | Modify POST to auto-link to open session |
| `lib/sales-service.ts` | Accept cashSessionId, validate session is open |
| `components/pos/pos-layout.tsx` | Add cash session status bar |
| `components/pos/payment-panel.tsx` | Show cash session info when past due check |
| `components/cash/` | New directory: `cash-session-bar.tsx`, `open-cash-dialog.tsx`, `close-cash-dialog.tsx`, `cash-sessions-view.tsx` |
| `components/dashboard/sales-dashboard.tsx` | Add cash session navigation |
| `app/app/page.tsx` | Add cash session view to navigation (admin only) |

### 4.8 Security Implications

- Any authenticated user can open/close a cash session for their store
- Admin can view ALL sessions (including other users')
- Employee can only see their own sessions
- A sale can only be linked to an open session that belongs to the same store
- No user can close a session opened by another user (unless admin)

### 4.9 Testing Plan

| Test | Type | Coverage |
|------|------|----------|
| Open session creates record | Unit | Valid payload, duplicate open prevention |
| Close session calculates correctly | Unit | Check expectedAmount vs closingAmount, difference |
| Sale links to open session | Integration | POST /api/sales with and without open session |
| Cannot open two sessions | Integration | 409 on second open |
| Cannot close someone else's session | Integration | 403 for employee |
| Session detail returns sales | Integration | Verify relationship |
| Auto-create on first sale | Integration | If no session open, auto-create |

---

## 5. Phase 2 — Inventory Movement History

### 5.1 Schema Proposal

```prisma
enum MovementType {
  SALE
  RETURN
  MANUAL_ADJUSTMENT
  PRODUCT_CREATION
  IMPORT
  STOCK_CORRECTION
  CANCELLATION
}

model StockMovement {
  id              String        @id @default(uuid())
  storeId         String
  store           Store         @relation(fields: [storeId], references: [id])
  productId       String
  product         Product       @relation(fields: [productId], references: [id])
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  type            MovementType
  quantity        Int           // positive = increase, negative = decrease
  previousStock   Int
  newStock        Int
  referenceId     String?       // saleId, returnId, etc.
  reason          String?
  createdAt       DateTime      @default(now())

  @@index([productId, createdAt(sort: desc)])
  @@index([storeId, createdAt(sort: desc)])
  @@index([referenceId])
  @@map("stock_movements")
}
```

### 5.2 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Enum vs String | Prisma enum `MovementType` | Type safety at DB level. Prisma auto-maps to enum in Postgres |
| Positive/negative | quantity is always positive-ish. `type` determines direction | SALE = -qty, RETURN = +qty, MANUAL_ADJUSTMENT = ±qty |
| previousStock/newStock | Stored for audit | Allows verification of current stock state |
| referenceId | Polymorphic reference to sale, return, etc. | Avoids multiple nullable FKs |

### 5.3 API Proposal

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/stock-movements` | Session | List movements. Query: `?productId=`, `?type=`, `?page=`, `?limit=`, `?from=`, `?to=` |
| `POST` | `/api/stock-movements/adjust` | Session (admin) | Manual adjustment. Body: `{ productId, quantity, reason }`. Creates StockMovement + updates Product.stock |
| `GET` | `/api/products/[id]/movements` | Session | Get movement history for a specific product |

### 5.4 Integration Points

**In `sales-service.ts` — on sale creation:**
```typescript
// After successful sale creation in transaction:
for (const item of saleItems) {
  await tx.stockMovement.create({
    data: {
      storeId: auth.storeId,
      productId: item.productId,
      userId: auth.userId,
      type: "SALE",
      quantity: -item.quantity,
      previousStock: previousStockMap[item.productId],
      newStock: previousStockMap[item.productId] - item.quantity,
      referenceId: saleId,
    },
  });
}
```

**In product creation (`POST /api/products`):**
```typescript
// After product creation:
if (data.stock > 0) {
  await prisma.stockMovement.create({
    data: {
      storeId: auth.user.storeId,
      productId: product.id,
      userId: auth.user.id,
      type: "PRODUCT_CREATION",
      quantity: data.stock,
      previousStock: 0,
      newStock: data.stock,
    },
  });
}
```

**In product edit (`PUT /api/products/[id]`):**
- Currently edits stock directly with no audit
- Must be changed to create a `STOCK_CORRECTION` movement

### 5.5 UI Proposal

**Stock Movement History Dialog** (accessible from product row in stock management):
- Modal showing: Date | Type | Qty | Previous | New | User | Reason
- Filterable by type, date range
- Paginated (50 per page)

**Manual Adjustment Form** (admin only, button in stock management):
- Select product
- Input: quantity (+ or -)
- Input: reason (required)
- Preview: current stock → new stock
- Confirm → creates StockMovement + updates Product.stock

**Product Detail View** (new or expanded):
- Current stock
- Min stock
- Last 10 movements
- Link to full history

### 5.6 Migration Strategy

```sql
-- Create MovementType enum
CREATE TYPE "MovementType" AS ENUM (
  'SALE', 'RETURN', 'MANUAL_ADJUSTMENT', 'PRODUCT_CREATION',
  'IMPORT', 'STOCK_CORRECTION', 'CANCELLATION'
);

-- Create stock_movements table
-- (Prisma migration handles this)
```

**No backfill needed.** Historical stock movements start tracking from implementation date. The `previousStock` at time of first tracking may not be 100% accurate for existing inventory, but it's the best we can do without full audit history.

### 5.7 File Changes Summary

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `StockMovement` model with `MovementType` enum |
| `prisma/migrations/` | New migration |
| `lib/types.ts` | Add `StockMovement`, `MovementType` types |
| `lib/mock-data.ts` | Add sample movements |
| `app/api/stock-movements/route.ts` | New — GET list |
| `app/api/stock-movements/adjust/route.ts` | New — POST manual adjustment |
| `app/api/products/[id]/route.ts` | Modify PUT to create movement on stock change |
| `app/api/products/route.ts` | Modify POST to create movement on creation |
| `lib/sales-service.ts` | Create movements after successful sale |
| `components/stock/stock-management.tsx` | Add "View Movements" button per row, "Adjust Stock" button |
| `components/stock/stock-movements-dialog.tsx` | New — movement history dialog |
| `components/stock/stock-adjustment-dialog.tsx` | New — manual adjustment dialog |
| `lib/store-context.tsx` | Add stock movement methods if needed |

### 5.8 Security Implications

- Manual stock adjustment requires admin
- All stock changes are audited with userId
- Cannot delete stock movements (append-only log)

---

## 6. Phase 3 — Profitability Reporting

### 6.1 Calculation Strategy

**Core formula:**
```
Gross Profit = Total Revenue − Total Cost
Margin % = (Gross Profit / Total Revenue) × 100
```

**Revenue** is already stored in `Sale.total` and `SaleItem.total`.

**Cost** strategy:
- **Option A (recommended):** Snapshot `costPrice` in `SaleItem` at sale time. Add `costPrice` field to the SaleItem model.
  - Pros: Historical accuracy. Cost changes don't affect past reports.
  - Cons: Schema change, backfill needed for existing sales.
- **Option B:** Look up `Product.cost` at query time.
  - Pros: No schema change.
  - Cons: If product cost changes, historical profits are wrong. This is actually a serious accounting error.

**Recommendation: Option A.** Add `costPrice` to `SaleItem`.

### 6.2 Schema Changes

```prisma
model SaleItem {
  // ... existing fields ...
  costPrice   Float?  // NEW: snapshot of product.cost at time of sale
}
```

### 6.3 Query Optimization Strategy

**Potential problem:** Computing profitability across thousands of sales by scanning all SaleItems.

**Solutions:**

| Query | Strategy | Index |
|-------|----------|-------|
| Profit by day | Aggregate query on `sale.createdAt` + `sale_item` | `sale.createdAt` index |
| Profit by product | `GROUP BY sale_item.productId` with cost sum | `sale_item.productId` index |
| Profit by category | `JOIN product.categoryId` then group | `product.categoryId` index |
| Profit by employee | `sale.userId` group | `sale.userId` index |

**Materialized view (if performance becomes an issue):**
```sql
CREATE MATERIALIZED VIEW daily_profit AS
SELECT
  DATE(s.created_at) as day,
  SUM(s.total) as revenue,
  SUM(si.quantity * COALESCE(si.cost_price, 0)) as total_cost,
  SUM(s.total) - SUM(si.quantity * COALESCE(si.cost_price, 0)) as gross_profit
FROM sales s
JOIN sale_items si ON si.sale_id = s.id
GROUP BY DATE(s.created_at);
```

For the initial implementation, direct queries with proper indexes will suffice for stores with <10k sales.

### 6.4 API Proposal

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/reports/profitability` | Admin | Summary: revenue, cost, profit, margin. Query: `?from=`, `?to=`, `?groupBy=day\|product\|category\|employee` |
| `GET` | `/api/reports/profitability/products` | Admin | Top/bottom products by margin |
| `GET` | `/api/reports/profitability/categories` | Admin | Profit breakdown by category |

### 6.5 Dashboard Changes

**New cards in `SalesDashboard`:**
- Gross Profit (replacing or complementing "Total Revenue")
- Margin % (new)
- Cost of Goods Sold (new)

**New chart:** Profit vs Revenue comparison (dual line chart)

**New section:** Profitability table (for date range filter)
- Columns: Product | Revenue | Cost | Profit | Margin %
- Sortable by any column
- Paginated

**New tab/sub-view:** "Rentabilidad" alongside existing dashboard charts

### 6.6 Migration Strategy

```sql
ALTER TABLE sale_items ADD COLUMN cost_price DOUBLE PRECISION;

-- Backfill: set costPrice to current product.cost for existing items
UPDATE sale_items si
SET cost_price = p.cost
FROM products p
WHERE si.product_id = p.id;
```

This backfill is approximate (uses current cost, which may differ from historical cost), but it's the best available data for past sales. Going forward, `cost_price` will be set at sale creation time.

### 6.7 Changes in Sales Service

In `lib/sales-service.ts`, when creating sale items:
```typescript
// After finding products, before creating SaleItems:
return {
  productId: product.id,
  productName: product.name,
  quantity: item.quantity,
  unitPrice: product.price,
  costPrice: product.cost,  // NEW: snapshot cost
  total: itemTotal,
};
```

### 6.8 File Changes Summary

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `costPrice` to `SaleItem` |
| `prisma/migrations/` | New migration |
| `lib/sales-service.ts` | Snapshot costPrice in sale creation |
| `lib/types.ts` | Add `costPrice` to `SaleItem` interface |
| `app/api/reports/profitability/route.ts` | New — profitability endpoints |
| `components/dashboard/sales-dashboard.tsx` | Add profit cards, profitability table, new chart |
| `components/dashboard/profitability-view.tsx` | New — detailed profitability view |
| `lib/mock-data.ts` | Add costPrice to mock SaleItems |

---

## 7. Phase 4 — Product Import (CSV/Excel)

### 7.1 Parsing Strategy

**Phase 1: CSV first** (Excel via a library later)

**Library:** `papaparse` (already lightweight, well-tested, supports streaming)

**Parsing flow:**
1. User uploads file → file read in browser
2. Parse client-side with `papaparse` for preview
3. Validation happens client-side (instant feedback)
4. On confirmation, send JSON array to server
5. Server validates + inserts in transaction

**Why not server-side parsing?**
- User needs instant preview before importing
- Avoids uploading invalid files to server
- Reduces server load

### 7.2 Validation Rules

| Field | Required | Type | Validation |
|-------|----------|------|------------|
| name | Yes | string | 1-200 chars |
| barcode | No | string | Unique per store |
| category | Yes | string | Must match existing category name (case-insensitive) |
| price | Yes | number | > 0 |
| cost | Yes | number | >= 0 |
| stock | Yes | integer | >= 0 |
| minStock | No | integer | >= 0, default 0 |
| description | No | string | Max 1000 chars |

**Validation errors:**
- Required field missing
- Invalid number format (commas vs dots)
- Duplicate barcode within file
- Category not found → suggest creating it
- Negative values

### 7.3 UI Flow

```
Step 1: Upload
  ┌─────────────────────────────┐
  │  Arrastrá tu archivo CSV    │
  │  o hacé clic para subirlo   │
  │                             │
  │  [Seleccionar archivo]      │
  │                             │
  │  Formato: CSV               │
  │  Columnas: nombre, código,  │
  │  categoría, precio, costo,  │
  │  stock, stock mínimo        │
  └─────────────────────────────┘

Step 2: Preview (after parsing)
  ┌─────────────────────────────┐
  │  Se encontraron 150         │
  │  productos                  │
  │                             │
  │  ⚠ 3 errores               │
  │  ┌─────┬──────┬──────┐     │
  │  │ #  │ Nombre│ Error │     │
  │  │ 23 │ ProdX │ prec. │     │
  │  │ 45 │ ProdY │ cat.  │     │
  │  │ 67 │ ProdZ │ code  │     │
  │  └─────┴──────┴──────┘     │
  │                             │
  │  [⬅ Volver] [Importar 147] │
  └─────────────────────────────┘

Step 3: Confirmation
  ┌─────────────────────────────┐
  │  ✅ Importación completada  │
  │                             │
  │  147 productos importados   │
  │                             │
  │  [Ver en Stock]             │
  └─────────────────────────────┘
```

### 7.4 CSV Format

```csv
nombre,código,categoría,precio,costo,stock,stock mínimo,descripción
"Yerba Mate Playadito","7798123456789","Almacén",4500,3200,50,10,"Yerba mate 1kg"
"Fideos Tallarín","7798123456796","Almacén",1200,850,100,20,"Fideos 500g"
```

### 7.5 API Proposal

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/products/import` | Session (admin) | Import validated products. Body: `{ products: [...], createMissingCategories: boolean }`. Response: `{ imported: number, errors: [{row, error}] }` |

**Server logic:**
```typescript
export async function POST(request: Request) {
  const auth = await requireSessionUser();
  // ... validate auth ...
  
  const { products, createMissingCategories } = await request.json();
  
  // Validate all products server-side
  const errors: ImportError[] = [];
  const validProducts: ProductInput[] = [];
  
  for (const [i, p] of products.entries()) {
    // validate barcode uniqueness, category existence, field types
  }
  
  // If errors, return them (no partial import)
  if (errors.length > 0) {
    return jsonResponse({ imported: 0, errors }, 422);
  }
  
  // Create missing categories if requested
  // Use createMany for products (batch insert)
  const result = await prisma.$transaction(async (tx) => {
    // Create categories
    // Create products
    // Create stock movements for each
  });
  
  return jsonResponse({ imported: result.count, errors: [] }, 201);
}
```

### 7.6 Database Impact

- No schema changes needed
- Uses existing `Product` and `Category` models
- Creates `StockMovement` records (type: IMPORT) for each imported product with stock > 0

### 7.7 File Changes Summary

| File | Change |
|------|--------|
| `package.json` | Add `papaparse` dependency |
| `app/api/products/import/route.ts` | New — import endpoint |
| `lib/import-service.ts` | New — import logic, validation, batch insert |
| `components/stock/import-dialog.tsx` | New — upload + preview + confirm dialog |
| `components/stock/stock-management.tsx` | Add "Importar productos" button |
| `components/stock/csv-preview-table.tsx` | New — preview table with error highlighting |

### 7.8 Security Implications

- Admin only (employees cannot import)
- Validates all products server-side (client validation is UX only, not security)
- Rate limit large imports (max 5000 per request, chunk larger files)
- CSV parse injection: sanitize strings, escape properly

---

## 8. Phase 5 — Returns & Sale Cancellations

### 8.1 Business Rules

| Scenario | Rule |
|----------|------|
| Full return | All items returned. Stock restored. Sale marked as `returned` |
| Partial return | Selected items returned. Stock restored for those items. Sale remains `completed` but with note |
| Cancellation | Entire sale voided. Stock restored. Sale marked as `cancelled`. Only if sale was `completed` |
| Time limit | Allow returns only within X days (configurable, default 30) |
| Permission | Admin only (or role with `sales:return` permission) |
| Payment reversal | Not automated (financial reversal is manual). System records the return for accounting |

### 8.2 Database Design

**Sale model changes** (already added in Phase 1):
```prisma
model Sale {
  // ... existing fields ...
  status          String  @default("completed")  // "completed" | "returned" | "cancelled"
  returnedAt      DateTime?
  returnedById    String?
  returnReason    String?
}
```

**Return model** (separate for partial returns):
```prisma
model Return {
  id              String    @id @default(uuid())
  storeId         String
  store           Store     @relation(fields: [storeId], references: [id])
  saleId          String
  sale            Sale      @relation(fields: [saleId], references: [id])
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  reason          String
  total           Float     // amount refunded
  createdAt       DateTime  @default(now())

  items           ReturnItem[]

  @@index([saleId])
  @@index([storeId, createdAt])
  @@map("returns")
}

model ReturnItem {
  id              String    @id @default(uuid())
  returnId        String
  return_         Return    @relation(fields: [returnId], references: [id])
  saleItemId      String
  saleItem        SaleItem  @relation(fields: [saleItemId], references: [id])
  productId       String
  product         Product   @relation(fields: [productId], references: [id])
  quantity        Int
  unitPrice       Float
  total           Float     // refunded amount for this item

  @@map("return_items")
}
```

### 8.3 API Proposal

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/sales/[id]/return` | Session (admin) | Create return. Body: `{ items: [{saleItemId, quantity}], reason }`. Validates: sale is completed, items exist, quantities valid. Restores stock, creates Return + ReturnItems + StockMovement (type: RETURN) |
| `POST` | `/api/sales/[id]/cancel` | Session (admin) | Cancel entire sale. Validates: sale is completed. Restores all stock, marks sale as cancelled. Creates StockMovements |

**Return request example:**
```json
POST /api/sales/sale-abc123/return
{
  "items": [
    { "saleItemId": "item-1", "quantity": 1 },
    { "saleItemId": "item-2", "quantity": 2 }
  ],
  "reason": "Cliente devolvió productos en mal estado"
}
```

### 8.4 UI Proposal

**Return button on completed sales:**
- In dashboard "Ventas Recientes" table
- In "TodaySalesPanel"
- Click → opens ReturnDialog

**Return Dialog:**
- Shows sale detail (date, items, total)
- Checkbox per item (or quantity input for partial returns)
- Dropdown/input: reason for return
- Summary: items to return, total refund amount
- Confirm → executes return + shows success + prints receipt (if available)

**Cancellation button:**
- In sale detail dialog
- Requires double confirmation (AlertDialog)
- "¿Anular venta completa? Esta acción no se puede deshacer."

### 8.5 Integration with Other Phases

- **Phase 1 (Cash Register):** If the sale was in a closed cash session, the return affects session calculations. The system should note this but not modify closed session amounts (accounting reconciliation happens separately).
- **Phase 2 (Stock Movements):** Return creates `StockMovement` with type `RETURN` and `+quantity`.
- **Phase 3 (Profitability):** Returns reduce profit. The profitability report must account for returns by deducting them from revenue.

### 8.6 File Changes Summary

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `Return`, `ReturnItem` models, add status fields to `Sale` |
| `prisma/migrations/` | New migration |
| `lib/types.ts` | Add `Return`, `ReturnItem`, `ReturnInput` types |
| `lib/mock-data.ts` | Add sample returns |
| `app/api/sales/[id]/return/route.ts` | New — POST return |
| `app/api/sales/[id]/cancel/route.ts` | New — POST cancel |
| `app/api/sales/route.ts` | GET may filter by status |
| `lib/return-service.ts` | New — return business logic |
| `components/dashboard/sale-detail-dialog.tsx` | Add "Return" and "Cancel" buttons |
| `components/pos/today-sales-panel.tsx` | Add return action to recent sales |
| `components/returns/return-dialog.tsx` | New — return form dialog |

### 8.7 Security Implications

- Returns/Cancellations require admin (or `sales:return` permission)
- Cannot return a sale that is already returned/cancelled
- Cannot return more quantity than was purchased
- Stock restoration must be atomic within the return transaction

---

## 9. Phase 6 — Keyboard Productivity System

### 9.1 Current State Analysis

The existing codebase **already implements** the required shortcuts:

| Shortcut | Handler | Location | Status |
|----------|---------|----------|--------|
| `Alt+F` → Search | `onFocusSearch()` → `quickProductsRef.current?.focusSearch()` | `use-global-shortcuts.ts:51-55` | ✅ Already working |
| `Alt+D` → Products | `onFocusProducts()` → `quickProductsRef.current?.focusFirstProduct()` | `use-global-shortcuts.ts:57-62` | ✅ Already working |
| `Alt+C` → Checkout | `onCheckout()` → clicks `[data-testid="complete-sale"]` | `use-global-shortcuts.ts:64-66` | ✅ Already working |
| `Alt+P` → Payment | `onFocusPayment()` → focuses `[data-keyboard-zone="payment"]` | `use-global-shortcuts.ts:68-72` | ✅ Already working |

**Additionally, the following already exist:**
- `Alt+H` → Help modal toggle
- `Escape` → Close modals, return focus to search
- `1/2/3` → Select payment method (when in payment zone)
- `Enter` → Confirm payment (in payment zone)
- Arrow keys → Navigate product grid (`use-product-grid-navigation.ts`)
- `Enter` → Add product (on grid)
- Arrow keys → Navigate cart (`use-cart-navigation.ts`)
- `*` → Increase quantity, `-` → Decrease, `Delete` → Remove (in cart)
- `Ctrl+N` → New product dialog (in stock view, `app/app/page.tsx:82-90`)
- `isInsideTextInput()` check prevents shortcut interference during typing

### 9.2 Gaps vs Requirements

| Requirement | Status | Action Needed |
|-------------|--------|---------------|
| Alt+F → Search | ✅ Done | None |
| Alt+D → Products | ✅ Done | None |
| Alt+C → Checkout | ✅ Done | None |
| Alt+P → Payment | ✅ Done | None |
| Safe focus management | ✅ Done | None — `isInsideTextInput()` check exists |
| Do not interfere with text inputs | ✅ Done | None |
| Documentation for power users | ❌ Missing | Add keyboard shortcut reference in app + docs |

### 9.3 Remaining Work

Since Phase 6 is already 90% implemented, the remaining work is:

1. **Keyboard shortcut reference card** — Add a printable/downloadable reference for cashiers
2. **Status bar indicator** — Show active shortcut zone in the status bar
3. **Extend shortcuts to new views** — Add shortcuts for the new views (cash sessions, stock imports, etc.)
4. **Shortcut consistency across views** — Ensure shortcuts work in all POS views (desktop + mobile)

### 9.4 Proposed Enhancements

| Shortcut | Action | View |
|----------|--------|------|
| `Alt+R` | Open cash register / close session | Any view |
| `Alt+I` | Open import dialog | Stock view |
| `Alt+U` | View users (admin only) | Any view |
| `Alt+E` | View reports | Any view |
| `Alt+S` | Focus stock search | Stock view |
| `F5` | Refresh data | Any view |

### 9.5 File Changes Summary

| File | Change |
|------|--------|
| `hooks/use-global-shortcuts.ts` | Add new shortcuts for cash, import, reports, users |
| `components/pos/keyboard-help-bar.tsx` | Update displayed shortcuts |
| `components/pos/keyboard-help-modal.tsx` | Add new shortcuts to help modal |
| `components/pos/pos-layout.tsx` | Add active zone indicator in status bar |

---

## 10. Migration Strategy

### 10.1 Order of Migrations

```
Phase 1 migration
  ├── Create cash_sessions table
  ├── Add cash_session_id + status to sales
  └── Create unique partial index

Phase 2 migration
  ├── Create MovementType enum
  └── Create stock_movements table

Phase 3 migration
  └── Add cost_price to sale_items (with backfill)

Phase 5 migration
  ├── Create returns table
  ├── Create return_items table
  └── (sale.status already added in Phase 1)
```

### 10.2 Prisma Migration Commands

```bash
# After each schema change:
pnpm prisma migrate dev --name <phase-name>
```

### 10.3 Data Integrity

| Concern | Mitigation |
|---------|------------|
| Existing sales without cashSessionId | Nullable FK. Backfill not needed |
| Existing products without movements | Not backfilled. Movements start on Phase 2 date |
| Existing saleItems without costPrice | Backfilled with current Product.cost (approximate) |
| Existing sales without status | Default to "completed" |
| Open sessions after code deploy | Only created after deploy. No backward compat needed |

### 10.4 Rollback Plan

Each phase must be independently rollbackable:
1. **Schema:** Each migration has a `down` (Prisma generates `migrate down` automatically in dev)
2. **API:** New endpoints don't affect existing ones. Old endpoints unchanged
3. **UI:** New components behind feature toggles or conditional rendering

---

## 11. Testing Strategy

### 11.1 Per-Phase Tests

| Phase | Unit Tests | Integration Tests | E2E Tests |
|-------|-----------|------------------|-----------|
| Cash Register | `cash-session-service.test.ts` | `POST /api/cash-sessions` | Open → sell → close flow |
| Stock Movements | `stock-movement-service.test.ts` | `GET /api/stock-movements` | Create product → verify movement |
| Profitability | `profitability-calculations.test.ts` | `GET /api/reports/profitability` | Create sale → verify profit |
| Product Import | `import-parser.test.ts`, `import-validator.test.ts` | `POST /api/products/import` | Upload CSV → verify products |
| Returns | `return-service.test.ts` | `POST /api/sales/[id]/return` | Sell → return → verify stock restored |
| Keyboard | — (UI only) | — | Playwright keyboard tests |

### 11.2 Key Test Scenarios

**Cash Register:**
- Open session → sell → close session → verify expectedAmount = sum of cash sales
- Open session → try to open another → 409
- Close with mismatched amount → verify difference is recorded
- Employee tries to close another user's session → 403

**Stock Movements:**
- Sale creates `SALE` movements with correct quantities
- Manual adjustment creates `MANUAL_ADJUSTMENT` with correct delta
- Editing product stock creates `STOCK_CORRECTION`
- Return creates `RETURN` movement with positive quantity

**Profitability:**
- Single sale: verify grossProfit = total - (qty × costPrice)
- Multiple sales: verify aggregation
- Cost change: verify historical profit uses snapshot costPrice, not current

**Product Import:**
- Valid CSV → creates products + categories + stock movements
- Duplicate barcode → error with row number
- Missing category → error with createMissingCategories=true handles it
- Invalid price → validation error

**Returns:**
- Full return → stock restored, sale marked returned
- Partial return → only selected items restored, sale remains completed
- Return of already returned item → error
- Admin-only permission enforced

### 11.3 Existing Test Infrastructure

```bash
# Unit tests (Vitest)
pnpm test

# E2E tests (Playwright)
pnpm playwright test
```

Test files already exist at:
- `tests/e2e/sale-flow.spec.ts`
- `tests/e2e/product.spec.ts`
- `lib/sales-service.test.ts`
- `lib/auth-session.test.ts`

---

## Appendix: Summary of Required Schema Changes

| Phase | New Models | Modified Models | New Fields |
|-------|-----------|-----------------|------------|
| 1 | `CashSession` | `Sale` | `Sale.cashSessionId?`, `Sale.status` |
| 2 | `StockMovement` | — | — |
| 3 | — | `SaleItem` | `SaleItem.costPrice?` |
| 4 | — | — | None |
| 5 | `Return`, `ReturnItem` | `Sale` | `Sale.returnedAt?`, `Sale.returnedById?`, `Sale.returnReason?` |
| 6 | — | — | None |

**Total new models:** 4 (`CashSession`, `StockMovement`, `Return`, `ReturnItem`)
**Total modified models:** 2 (`Sale`, `SaleItem`)
**Total new API endpoints:** ~12
**Total new components:** ~12

---

*Documento preparado para revisión del equipo de ingeniería. Próximo paso: aprobación de diseño e implementación de Phase 1.*
