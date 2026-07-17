// Offline Queue — Barrel Export

export type {
  QueuedSale,
  CachedProduct,
  OfflineState,
  GracePeriodState,
} from "./types";

export { getDB, closeDB } from "./idb";
export type { OfflineDBSchema } from "./idb";

export {
  enqueueSale,
  getPendingSales,
  getFailedSales,
  markSaleSynced,
  markSaleFailed,
  getQueueCount,
  clearSyncedSales,
} from "./sale-queue";

export {
  cacheProducts,
  getCachedProducts,
  isCacheStale,
  clearProductCache,
} from "./product-cache";

export { recordConnection, isGraceActive, getGraceState } from "./grace";

export { isOnline, onStatusChange } from "./connectivity";

export { flushSaleQueue, setupSyncListener, retryFailedSale } from "./sync";
