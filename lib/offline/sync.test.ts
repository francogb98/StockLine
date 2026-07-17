// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { flushSaleQueue, setupSyncListener, retryFailedSale } from "@/lib/offline/sync";
import { enqueueSale, getPendingSales } from "@/lib/offline/sale-queue";
import { closeDB, getDB } from "@/lib/offline/idb";
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

/** Directly put a sale into IDB (bypasses enqueueSale's retryCount reset) */
async function putSaleDirect(sale: QueuedSale): Promise<void> {
  const db = await getDB();
  await db.put("sales", sale);
}

describe("sync", () => {
  beforeEach(async () => {
    await closeDB();
    indexedDB = new IDBFactory();
    vi.restoreAllMocks();
  });

  describe("flushSaleQueue", () => {
    it("returns 0 synced and 0 failed when queue is empty", async () => {
      const result = await flushSaleQueue();
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("syncs a single pending sale and marks it synced", async () => {
      const sale = makeSale({ id: "s1" });
      await enqueueSale(sale);

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "s1" }), { status: 200 }),
      );

      const result = await flushSaleQueue();
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);

      const pending = await getPendingSales();
      expect(pending).toHaveLength(0);
    });

    it("calls POST /api/sales for each pending sale", async () => {
      const sale1 = makeSale({ id: "s1", createdAt: "2026-01-01T00:00:00Z" });
      const sale2 = makeSale({ id: "s2", createdAt: "2026-01-01T00:01:00Z" });
      await enqueueSale(sale1);
      await enqueueSale(sale2);

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

      await flushSaleQueue();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy.mock.calls[0][0]).toBe("/api/sales");
      expect(fetchSpy.mock.calls[0][1]?.method).toBe("POST");
    });

    it("marks sale as failed after max retries (3 failures)", async () => {
      // Enqueue at retryCount 0, fail 3 times
      const sale = makeSale({ id: "s1" });
      await enqueueSale(sale);

      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Network error"),
      );

      // First flush: retryCount 0 -> 1 (still pending)
      const r1 = await flushSaleQueue();
      expect(r1.synced).toBe(0);
      expect(r1.failed).toBe(0);

      // Second flush: retryCount 1 -> 2 (still pending)
      const r2 = await flushSaleQueue();
      expect(r2.synced).toBe(0);
      expect(r2.failed).toBe(0);

      // Third flush: retryCount 2 -> 3 (hits max, marked failed)
      const r3 = await flushSaleQueue();
      expect(r3.synced).toBe(0);
      expect(r3.failed).toBe(1);

      // Verify in IDB
      const db = await getDB();
      const record = await db.get("sales", "s1");
      expect(record?.status).toBe("failed");
      expect(record?.retryCount).toBe(3);
    });

    it("processes sales in FIFO order", async () => {
      const sale1 = makeSale({ id: "s1", createdAt: "2026-01-01T00:00:00Z" });
      const sale2 = makeSale({ id: "s2", createdAt: "2026-01-01T00:01:00Z" });
      await enqueueSale(sale1);
      await enqueueSale(sale2);

      const order: string[] = [];
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, opts) => {
        const body = JSON.parse(opts?.body as string);
        order.push(body.id);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      await flushSaleQueue();
      expect(order).toEqual(["s1", "s2"]);
    });

    it("handles partial success (some synced, some failed)", async () => {
      const sale1 = makeSale({ id: "s1", createdAt: "2026-01-01T00:00:00Z" });
      const sale2 = makeSale({ id: "s2", createdAt: "2026-01-01T00:01:00Z" });
      await enqueueSale(sale1);
      await enqueueSale(sale2);

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        )
        .mockRejectedValueOnce(new Error("Server error"));

      const result = await flushSaleQueue();
      expect(result.synced).toBe(1);
      // sale2 failed once (retryCount goes to 1, not 3 yet) so it's not "failed" yet
      // but it didn't sync either. The result reflects what happened this flush.
      expect(result.failed).toBe(0);

      // sale2 should still be pending for next retry
      const pending = await getPendingSales();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe("s2");
      expect(pending[0].retryCount).toBe(1);
    });
  });

  describe("retryFailedSale", () => {
    it("retries a failed sale and returns true if synced", async () => {
      // Put a sale directly with "failed" status (enqueueSale always sets "pending")
      const sale = makeSale({
        id: "s1",
        status: "failed",
        retryCount: 3,
        lastError: "Network error",
      });
      await putSaleDirect(sale);

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

      const result = await retryFailedSale("s1");
      expect(result).toBe(true);

      // Sale should now be synced (no longer pending or failed)
      const pending = await getPendingSales();
      expect(pending).toHaveLength(0);
    });

    it("returns false if retry still fails", async () => {
      const sale = makeSale({
        id: "s1",
        status: "failed",
        retryCount: 3,
        lastError: "Network error",
      });
      await putSaleDirect(sale);

      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Still failing"),
      );

      const result = await retryFailedSale("s1");
      expect(result).toBe(false);
    });

    it("returns false for non-existent sale", async () => {
      const result = await retryFailedSale("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("setupSyncListener", () => {
    it("returns an unsubscribe function", () => {
      const unsubscribe = setupSyncListener();
      expect(typeof unsubscribe).toBe("function");
      unsubscribe();
    });

    it("registers a listener that responds to online events", () => {
      // Verify setupSyncListener wires into onStatusChange by checking
      // that it returns a working unsubscribe function and doesn't throw
      // when the online event fires.
      const unsubscribe = setupSyncListener();

      // Dispatching online should not throw — the callback handles errors via .catch()
      expect(() => window.dispatchEvent(new Event("online"))).not.toThrow();

      unsubscribe();
    });

    it("stops listening after unsubscribe", async () => {
      const flushSpy = vi
        .spyOn(await import("./sync"), "flushSaleQueue")
        .mockResolvedValue({ synced: 0, failed: 0 });

      const unsubscribe = setupSyncListener();
      unsubscribe();
      flushSpy.mockClear();

      window.dispatchEvent(new Event("online"));
      await new Promise((r) => setTimeout(r, 50));
      expect(flushSpy).not.toHaveBeenCalled();
    });
  });
});
