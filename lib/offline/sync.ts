// Background Sync Engine

import { getPendingSales, markSaleSynced, markSaleFailed, clearSyncedSales } from "./sale-queue";
import { recordConnection } from "./grace";
import { onStatusChange } from "./connectivity";
import { getDB } from "./idb";
import type { QueuedSale } from "./types";

const MAX_RETRIES = 3;

interface SyncResult {
  synced: number;
  failed: number;
}

/**
 * Build the payload to send to /api/sales.
 * Strips client-computed subtotal/tax/total so the server recalculates
 * from current product prices — avoids amount-mismatch failures on
 * stale offline sales.
 * Also strips internal queue fields (status, retryCount, lastError)
 * that would fail Zod validation on the server.
 */
function buildSalePayload(sale: QueuedSale) {
  const { subtotal, tax, total, status, retryCount, lastError, ...rest } = sale;
  return rest;
}

/**
 * Flush all pending sales from the offline queue to the API.
 * Processes in FIFO order. Marks sales as synced or failed.
 */
export async function flushSaleQueue(): Promise<SyncResult> {
  const pending = await getPendingSales();
  let synced = 0;
  let failed = 0;

  for (const sale of pending) {
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSalePayload(sale)),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      await markSaleSynced(sale.id);
      await recordConnection();
      synced++;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown sync error";
      const newRetryCount = sale.retryCount + 1;

      if (newRetryCount >= MAX_RETRIES) {
        await markSaleFailed(sale.id, errorMsg);
        failed++;
      } else {
        // Mark as pending with incremented retry count for next attempt
        const db = await getDB();
        await db.put("sales", {
          ...sale,
          retryCount: newRetryCount,
          lastError: errorMsg,
        });
      }
    }
  }

  return { synced, failed };
}

/**
 * Listen for online events and flush the queue when back online.
 * Returns an unsubscribe function.
 */
export function setupSyncListener(): () => void {
  return onStatusChange((online) => {
    if (online) {
      window.dispatchEvent(new CustomEvent("sync-started"));
      flushSaleQueue()
        .then(({ failed }) => {
          if (failed === 0) {
            clearSyncedSales().catch(() => {});
            window.dispatchEvent(new CustomEvent("sync-completed"));
          } else {
            window.dispatchEvent(new CustomEvent("sync-failed"));
          }
        })
        .catch((err) => {
          console.error("Sync flush failed:", err);
          window.dispatchEvent(new CustomEvent("sync-failed"));
        });
    }
  });
}

/**
 * Re-attempt a specific failed sale.
 * Returns true if synced, false if still failing.
 */
export async function retryFailedSale(saleId: string): Promise<boolean> {
  const db = await getDB();
  const sale = await db.get("sales", saleId);

  if (!sale || sale.status !== "failed") {
    return false;
  }

  try {
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSalePayload(sale)),
    });

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }

    await markSaleSynced(sale.id);
    await recordConnection();
    return true;
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown retry error";
    await markSaleFailed(sale.id, errorMsg);
    return false;
  }
}
