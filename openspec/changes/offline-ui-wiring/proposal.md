# Proposal: offline-ui-wiring

## Intent

The offline backend (lib/offline/, 449 lines, 46 tests) and store-context integration are complete, but there is zero UI or lifecycle wiring. Users have no visibility into offline status, pending sales count, or sync progress. This change connects the backend to the UI layer so the POS actually surfaces offline state.

## Scope

### In Scope
- `hooks/use-offline-status.ts` — hook exposing isOnline, isSyncing, pendingCount
- `components/offline/offline-banner.tsx` — fixed warning banner when offline or syncing
- `components/offline/pending-sales-badge.tsx` — header badge with pending count, opens dialog
- `components/offline/pending-sales-dialog.tsx` — dialog listing pending/failed sales with retry
- `components/offline/sync-provider.tsx` — lifecycle provider: setupSyncListener, clearSyncedSales, event dispatching
- Mount `<Toaster />` in `app/app/layout.tsx`
- Wire SyncProvider into `app/app/page.tsx`
- Wire banner + badge into `components/pos/pos-layout.tsx`
- Wire banner + badge into mobile POS variant

### Out of Scope
- Backend changes (already complete)
- Service worker registration
- New API routes

## Capabilities

### New Capabilities
- `offline-ui`: UI layer for offline status display, pending sales management, and sync lifecycle wiring

### Modified Capabilities

None — no existing specs yet.

## Approach

Use the existing sonner Toaster for toast notifications (already installed, just not mounted). Build a `SyncProvider` that calls `setupSyncListener` on mount, dispatches custom events for status changes, and exposes context to child components. The `use-offline-status` hook consumes this context plus navigator.onLine. Components are pure presentational — no backend logic.

Pending sales list shows pending + failed only (synced get cleaned up by `clearSyncedSales`). "Sync Now" button triggers manual flush. Banner shows "Sincronizando..." when online but pendingCount > 0. Proactive toast fires on sale attempt when offline (before API call).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `hooks/use-offline-status.ts` | New | Hook wrapping connectivity + queue count |
| `components/offline/offline-banner.tsx` | New | Fixed warning banner |
| `components/offline/pending-sales-badge.tsx` | New | Badge counter in header |
| `components/offline/pending-sales-dialog.tsx` | New | Dialog listing pending/failed sales |
| `components/offline/sync-provider.tsx` | New | Lifecycle provider |
| `app/app/layout.tsx` | Modified | Mount Toaster |
| `app/app/page.tsx` | Modified | Wrap in SyncProvider |
| `components/pos/pos-layout.tsx` | Modified | Banner + badge |
| Mobile POS variant | Modified | Banner + badge |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| sonner Toaster conflicts with existing notifications | Low | sonner is the standard — check for duplicate mounts |
| SyncProvider re-render overhead | Low | Use React.memo on children, throttle event dispatch |

## Rollback Plan

All changes are additive UI components and wires. Revert by removing the 5 new files and reverting modifications to the 4 existing files. No data or backend changes involved.

## Dependencies

- Existing `lib/offline/` module (complete)
- Existing `store-context.tsx` with enqueue/fallback logic (complete)
- sonner, shadcn/ui Dialog, shadcn/ui Badge (installed)

## Success Criteria

- [ ] `<Toaster />` mounted in layout — toasts appear on sale queue/sync events
- [ ] Banner visible when offline, shows sync state when syncing
- [ ] Badge shows pending count in POS header
- [ ] Pending sales dialog lists pending/failed sales with retry
- [ ] SyncProvider dispatches events that update all UI components
- [ ] Manual "Sync Now" triggers flush and updates UI
