// Sale Queue Operations

import { getDB } from "./idb";
import type { QueuedSale } from "./types";

const MAX_QUEUE_SIZE = 50;

export async function enqueueSale(
  sale: Omit<QueuedSale, "status" | "retryCount" | "lastError">,
): Promise<QueuedSale> {
  const db = await getDB();
  const count = await db.count("sales");
  if (count >= MAX_QUEUE_SIZE) {
    throw new Error(
      `Offline queue is full (${MAX_QUEUE_SIZE} sales). Cannot enqueue more.`,
    );
  }

  const queuedSale: QueuedSale = {
    ...sale,
    status: "pending",
    retryCount: 0,
    lastError: null,
  };

  await db.put("sales", queuedSale);
  return queuedSale;
}

export async function getPendingSales(): Promise<QueuedSale[]> {
  const db = await getDB();
  const all = await db.getAll("sales");
  return all
    .filter((s) => s.status === "pending")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

export async function getFailedSales(): Promise<QueuedSale[]> {
  const db = await getDB();
  const all = await db.getAll("sales");
  return all
    .filter((s) => s.status === "failed")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

export async function markSaleSynced(id: string): Promise<void> {
  const db = await getDB();
  const sale = await db.get("sales", id);
  if (sale) {
    await db.put("sales", { ...sale, status: "synced" });
  }
}

export async function markSaleFailed(
  id: string,
  error: string,
): Promise<void> {
  const db = await getDB();
  const sale = await db.get("sales", id);
  if (sale) {
    await db.put("sales", {
      ...sale,
      status: "failed",
      retryCount: sale.retryCount + 1,
      lastError: error,
    });
  }
}

export async function getQueueCount(): Promise<number> {
  const db = await getDB();
  const all = await db.getAll("sales");
  return all.filter((s) => s.status === "pending").length;
}

export async function clearSyncedSales(): Promise<void> {
  const db = await getDB();
  const all = await db.getAll("sales");
  const synced = all.filter((s) => s.status === "synced");
  const tx = db.transaction("sales", "readwrite");
  for (const sale of synced) {
    await tx.store.delete(sale.id);
  }
  await tx.done;
}
