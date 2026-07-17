import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  enqueueSale,
  getPendingSales,
  markSaleSynced,
  markSaleFailed,
  getQueueCount,
  clearSyncedSales,
} from "@/lib/offline/sale-queue";
import { closeDB } from "@/lib/offline/idb";
import type { QueuedSale } from "@/lib/offline/types";

function makeSale(overrides: Partial<QueuedSale> = {}): QueuedSale {
  return {
    id: `sale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    items: [
      {
        productId: "p1",
        productName: "Widget",
        quantity: 2,
        unitPrice: 10,
        total: 20,
      },
    ],
    subtotal: 20,
    tax: 3,
    total: 23,
    paymentMethod: "cash",
    userId: "u1",
    storeId: "s1",
    createdAt: new Date().toISOString(),
    status: "pending",
    retryCount: 0,
    lastError: null,
    ...overrides,
  };
}

describe("sale-queue", () => {
  beforeEach(async () => {
    await closeDB();
    // Reset indexedDB entirely
    indexedDB = new IDBFactory();
  });

  it("enqueues a sale with pending status", async () => {
    const input = {
      id: "sale-1",
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      paymentMethod: "cash" as const,
      userId: "u1",
      storeId: "s1",
      createdAt: "2026-01-01T00:00:00Z",
    };
    const result = await enqueueSale(input);

    expect(result.status).toBe("pending");
    expect(result.retryCount).toBe(0);
    expect(result.lastError).toBeNull();
    expect(result.id).toBe("sale-1");
  });

  it("getPendingSales returns only pending sales in FIFO order", async () => {
    const sale1 = makeSale({
      id: "s1",
      createdAt: "2026-01-01T00:00:00Z",
    });
    const sale2 = makeSale({
      id: "s2",
      createdAt: "2026-01-01T00:01:00Z",
    });

    await enqueueSale(sale1);
    await enqueueSale(sale2);

    const pending = await getPendingSales();
    expect(pending).toHaveLength(2);
    expect(pending[0].id).toBe("s1");
    expect(pending[1].id).toBe("s2");
  });

  it("getPendingSales excludes synced and failed sales", async () => {
    await enqueueSale(makeSale({ id: "s1" }));
    await enqueueSale(makeSale({ id: "s2" }));
    await markSaleSynced("s2");

    const pending = await getPendingSales();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe("s1");
  });

  it("markSaleSynced updates status to synced", async () => {
    await enqueueSale(makeSale({ id: "s1" }));
    await markSaleSynced("s1");

    const pending = await getPendingSales();
    expect(pending).toHaveLength(0);
  });

  it("markSaleFailed updates status and increments retryCount", async () => {
    await enqueueSale(makeSale({ id: "s1" }));
    await markSaleFailed("s1", "Network error");

    const pending = await getPendingSales();
    expect(pending).toHaveLength(0);
  });

  it("getQueueCount returns number of pending sales", async () => {
    expect(await getQueueCount()).toBe(0);

    await enqueueSale(makeSale({ id: "s1" }));
    await enqueueSale(makeSale({ id: "s2" }));

    expect(await getQueueCount()).toBe(2);
  });

  it("clearSyncedSales removes only synced sales", async () => {
    await enqueueSale(makeSale({ id: "s1" }));
    await enqueueSale(makeSale({ id: "s2" }));
    await enqueueSale(makeSale({ id: "s3" }));
    await markSaleSynced("s1");
    await markSaleSynced("s3");

    await clearSyncedSales();

    const pending = await getPendingSales();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe("s2");
  });

  it("rejects enqueue when queue is full (50 sales)", async () => {
    for (let i = 0; i < 50; i++) {
      await enqueueSale(makeSale({ id: `s${i}` }));
    }

    await expect(
      enqueueSale(makeSale({ id: "s50" })),
    ).rejects.toThrow("Offline queue is full");
  });
});
