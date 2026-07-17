# Tasks: Offline Queue for POS Sales

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450–550 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Offline core modules (types, IDB, queue, cache, grace, connectivity) | PR 1 | Base: feature/offline-queue branch. Pure modules, no UI changes. ~180 lines. |
| 2 | Sync engine + store-context integration | PR 2 | Base: PR 1 branch. Wiring sync to addSale and loadData. ~150 lines. |
| 3 | UI indicators + tests for all modules | PR 3 | Base: PR 2 branch. offline-indicator.tsx, payment-panel badge, unit tests. ~150 lines. |

## Phase 1: Foundation

- [ ] 1.1 Run `pnpm add idb` in project root
- [ ] 1.2 Create `lib/offline/types.ts` — define QueuedSale, CachedProduct, GraceEntry, SyncStatus interfaces per design
- [ ] 1.3 Create `lib/offline/idb.ts` — open IndexedDB with 3 object stores (sale-queue, product-cache, grace), version 1
- [ ] 1.4 Create `lib/offline/connectivity.ts` — isOnline getter, onOnline/onOffline callback registration using navigator.onLine + event listeners

## Phase 2: Core Modules

- [ ] 2.1 Create `lib/offline/sale-queue.ts` — enqueue, dequeue, peek, markFailed, getPending, countPending; enforce 50-sale limit
- [ ] 2.2 Create `lib/offline/product-cache.ts` — cacheProducts, getCachedProducts, clearCache; timestamp-based TTL (1h)
- [ ] 2.3 Create `lib/offline/grace.ts` — canSell (checks localStorage cache < 24h), markGrace, clearGrace
- [ ] 2.4 Create `lib/offline/sync.ts` — registerListener, flushQueue with FIFO + exponential backoff (2s/4s/8s), max 3 retries, mark failed sales

## Phase 3: Integration

- [ ] 3.1 Modify `store-context.tsx` — in addSale catch block (line 655), enqueue sale to IDB + optimistic stock deduction + dispatch `sale-queued` event
- [ ] 3.2 Modify `store-context.tsx` — in loadData catch block (line 295), attempt IDB product cache read before mock fallback
- [ ] 3.3 Modify `store-context.tsx` — integrate subscription grace check: if offline + canSell, skip subscription block on addSale 403 response
- [ ] 3.4 Modify `components/pos/payment-panel.tsx` — adjust isDisabled to respect grace period (line 167)

## Phase 4: UI

- [ ] 4.1 Create `components/pos/offline-indicator.tsx` — shows online/offline/queued status with pending count badge
- [ ] 4.2 Modify `components/pos/payment-panel.tsx` — render OfflineIndicator, show pending sales badge near payment area
- [ ] 4.3 Add offline indicator to POS layout or payment panel when queue has items

## Phase 5: Testing

- [ ] 5.1 Install `fake-indexeddb` as devDependency, configure in vitest setup
- [ ] 5.2 Write unit tests for `lib/offline/sale-queue.ts` — enqueue/dequeue/markFailed, 50-sale limit enforcement, FIFO order
- [ ] 5.3 Write unit tests for `lib/offline/grace.ts` — canSell returns true within 24h, false after expiry, false if cached status invalid
- [ ] 5.4 Write unit tests for `lib/offline/sync.ts` — flushQueue succeeds on first attempt, retry on failure, marks failed after max retries
- [ ] 5.5 Write unit tests for `lib/offline/product-cache.ts` — cacheProducts persists, getCachedProducts returns data, TTL expiry
- [ ] 5.6 Write integration test: addSale with mock fetch failure → sale appears in IDB queue
- [ ] 5.7 Write integration test: flushQueue dispatches online event → sales synced to API, IDB cleared

## Phase 6: Cleanup

- [ ] 6.1 Run `pnpm test` — all new tests pass
- [ ] 6.2 Run `pnpm lint` — no new lint errors
- [ ] 6.3 Run `tsc --noEmit` — no type errors
- [ ] 6.4 Verify no regressions in existing POS flow (manual smoke test)
