# Delta for owner-withdrawal

## ADDED Requirements

### Requirement: Record owner withdrawal

The system SHALL expose `POST /api/stock-movements/owner-withdrawal` that accepts a JSON body `{ productId, quantity, reason }`. On a valid admin request the system SHALL decrement `Product.stock` by `quantity` and create a `StockMovement` row with `type = "OWNER_WITHDRAWAL"`, `quantity = -quantity` (negative), real `previousStock` and `newStock` (the stock value before and after the decrement), and the provided `reason` stored. The response SHALL be `201 Created` with a movement summary body.

#### Scenario: Valid admin request succeeds

- **WHEN** an authenticated admin session posts `{ productId: <existing>, quantity: 3, reason: "Personal use" }` and the product's current stock is `10`
- **THEN** the response status is `201`
- **AND** the response body contains a movement summary with `type: "OWNER_WITHDRAWAL"`, `quantity: -3`, `previousStock: 10`, `newStock: 7`
- **AND** the product's `stock` is now `7`

#### Scenario: Non-admin session rejected

- **WHEN** an authenticated non-admin session posts a valid body
- **THEN** the response status is `403`
- **AND** no `Product.stock` change is persisted
- **AND** no `StockMovement` row is created

#### Scenario: Unauthenticated request rejected

- **WHEN** an unauthenticated request posts a valid body
- **THEN** the response status is `401`
- **AND** no `Product.stock` change is persisted

#### Scenario: Missing or invalid body rejected

- **WHEN** the request body is missing `productId`, `quantity`, or `reason`, or fails Zod validation
- **THEN** the response status is `400`
- **AND** no `Product.stock` change is persisted
- **AND** no `StockMovement` row is created

#### Scenario: Quantity greater than current stock rejected

- **WHEN** an admin posts `{ quantity: 100 }` and the product's current stock is `5`
- **THEN** the response status is `400`
- **AND** the error code is `STOCK_NEGATIVE`
- **AND** no `Product.stock` change is persisted
- **AND** no `StockMovement` row is created

#### Scenario: Non-positive quantity rejected by validation

- **WHEN** an admin posts `{ quantity: 0 }` or `{ quantity: -2 }`
- **THEN** the response status is `400` from Zod's `.positive()` check
- **AND** no `Product.stock` change is persisted

### Requirement: Atomicity

The system SHALL execute the `Product.stock` decrement and the `StockMovement` insert inside a single Prisma transaction using the callback form `prisma.$transaction(async (tx) => ...)`. If the callback throws, neither the `Product` row update nor the `StockMovement` row insert SHALL be persisted.

#### Scenario: Callback error rolls back both writes

- **GIVEN** the callback throws an error after the `Product.stock` decrement would be applied
- **WHEN** the transaction is awaited
- **THEN** neither the `Product` row update nor the `StockMovement` row insert is persisted
- **AND** the error propagates to the route handler

### Requirement: Real previousStock and newStock recorded

The system SHALL record on the created `StockMovement` row the actual `previousStock` (stock value read before the decrement) and `newStock` (stock value after the decrement). The system SHALL NOT hardcode either value to `0`.

#### Scenario: Withdraw 3 from stock 10 records real values

- **GIVEN** a product whose `stock` is `10`
- **WHEN** an admin records an owner withdrawal of `quantity: 3`
- **THEN** the `StockMovement` row has `previousStock: 10`
- **AND** the `StockMovement` row has `newStock: 7`
- **AND** the response body echoes `previousStock: 10` and `newStock: 7` (not zero)

### Requirement: Admin-only access

The system SHALL only accept `POST /api/stock-movements/owner-withdrawal` from sessions whose `user.role === "admin"`. Any other session SHALL be rejected with `403`.

#### Scenario: Cashier session rejected

- **GIVEN** a session whose `user.role` is not `"admin"`
- **WHEN** the user posts a valid body
- **THEN** the response status is `403`
- **AND** the error message names the admin requirement

### Requirement: Decoupled from cash session

The system SHALL NOT create, modify, or require an open `CashSession` for an owner withdrawal. The endpoint SHALL succeed regardless of whether a `CashSession` row exists for the store, is open, is closed, or has never been opened.

#### Scenario: Request succeeds with no cash session for today

- **GIVEN** no `CashSession` row exists for the store on the current day
- **WHEN** an admin posts a valid body
- **THEN** the response status is `201`
- **AND** the product's stock is decremented
- **AND** a `StockMovement` row is created with `type: "OWNER_WITHDRAWAL"`
- **AND** no `CashSession` row is created or modified

### Requirement: UI admin-only button

The system SHALL render a "Retiro de dueño" button in the per-product action cell of the stock management screen, visible only when the current session's `user.role === "admin"`. This is a render gate, not a security boundary; the server-side admin gate is the actual access control.

#### Scenario: Admin user sees the button

- **GIVEN** the current session's `user.role === "admin"`
- **WHEN** the stock management screen renders
- **THEN** the "Retiro de dueño" button is visible in each product's action cell

#### Scenario: Non-admin user does not see the button

- **GIVEN** the current session's `user.role !== "admin"`
- **WHEN** the stock management screen renders
- **THEN** the "Retiro de dueño" button is not rendered for any product

### Requirement: UI owner withdrawal dialog

Clicking the "Retiro de dueño" button SHALL open a dialog containing: a `quantity` numeric input (positive integer, with helper text indicating this reduces stock), a `reason` text input (required, placeholder "Ej: Retiro para uso personal"), a Submit button, a Cancel button, and an inline error display. On successful submit the dialog SHALL close, the product's stock SHALL be decremented, and a success toast SHALL be shown.

#### Scenario: Valid input submits successfully

- **GIVEN** the dialog is open and the product's current stock is `10`
- **WHEN** the admin enters `quantity: 3`, `reason: "Personal"`, and clicks Submit
- **THEN** the dialog closes
- **AND** a success toast is shown
- **AND** the product's stock is now `7`

#### Scenario: Empty reason shows error

- **WHEN** the admin leaves the `reason` field empty and clicks Submit
- **THEN** the dialog stays open
- **AND** the inline error display shows a message indicating `reason` is required

#### Scenario: Non-positive quantity shows error

- **WHEN** the admin enters `quantity: 0` or a negative value and clicks Submit
- **THEN** the dialog stays open
- **AND** the inline error display shows a validation message

#### Scenario: Quantity greater than current stock shows server error

- **GIVEN** the product's current stock is `5`
- **WHEN** the admin enters `quantity: 10` and clicks Submit
- **THEN** the dialog stays open
- **AND** the inline error display shows the `STOCK_NEGATIVE` message from the server

#### Scenario: Network error shows toast

- **WHEN** the submit request fails with a network error
- **THEN** a toast is shown with the error message
- **AND** the dialog stays open so the admin can retry

### Requirement: History badge

The stock-movements history list SHALL render any `StockMovement` row with `type = "OWNER_WITHDRAWAL"` using the label `"Retiro de dueño"` and a color distinct from the existing movement type badges.

#### Scenario: New type renders with label and distinct color

- **GIVEN** a `StockMovement` row exists with `type: "OWNER_WITHDRAWAL"`
- **WHEN** the history list renders
- **THEN** the badge for that row shows the text `"Retiro de dueño"`
- **AND** the badge uses a color distinct from the badges used for `SALE`, `PURCHASE`, and `ADJUST`

## MODIFIED Requirements

No MODIFIED Requirements for this delta.

## REMOVED Requirements

No REMOVED Requirements for this delta.

## Test Plan

This section is a strict-TDD directive for the apply phase. Tests are red-first; the apply phase writes the test, sees it fail, then implements until it passes.

### `app/api/stock-movements/owner-withdrawal/route.test.ts` (new)

Unit tests for the route handler. Cases:

- `401` when the request has no authenticated session.
- `403` when the session's user role is not `admin`.
- `400` when `productId` is missing or invalid.
- `400` when `quantity` is `0` or negative (Zod `.positive()` rejection).
- `400` when `reason` is empty (Zod `.min(1)` rejection).
- `400` with error code `STOCK_NEGATIVE` when `quantity > currentStock`.
- `201` happy path: admin posts a valid body, response includes `type: "OWNER_WITHDRAWAL"`, `quantity: -qty`, real `previousStock` and `newStock`.
- `500` when `recordOwnerWithdrawal` throws an unexpected error (mock the function to throw).

### `lib/data-access.test.ts` (extended)

Add two cases for `recordOwnerWithdrawal`:

- Happy path: starting `Product.stock` is `10`; admin withdraws `3`; assert `Product.stock` is decremented to `7`; assert `StockMovement.create` is called with `type: "OWNER_WITHDRAWAL"`, `quantity: -3`, `previousStock: 10`, `newStock: 7`.
- `STOCK_NEGATIVE` rejection: when `quantity > currentStock`, the function throws `STOCK_NEGATIVE` and no `Product` update and no `StockMovement.create` are issued.

### Migration verification (manual, not a unit test)

`prisma migrate dev` produces `migration.sql` containing only `ALTER TYPE "MovementType" ADD VALUE 'OWNER_WITHDRAWAL';`. The apply phase manually inspects the generated file. There is no precedent in the repo for migration unit tests, and the project has no integration test harness for this.

### Out of scope for this Test Plan

- UI component tests (dialog, button visibility). The repo has no precedent for unit-testing these components and no `vitest` config that covers them; deferring to manual QA plus E2E is consistent with the project.
- E2E tests for the dialog flow. Optional; can be added in a follow-up change once a precedent for Playwright coverage of admin-only flows exists.
