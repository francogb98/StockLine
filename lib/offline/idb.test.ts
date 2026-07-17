import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { getDB, closeDB } from "@/lib/offline/idb";

describe("idb", () => {
  beforeEach(async () => {
    await closeDB();
  });

  it("opens database with correct name and version", async () => {
    const db = await getDB();
    expect(db).toBeDefined();
    expect(db.objectStoreNames.contains("sales")).toBe(true);
    expect(db.objectStoreNames.contains("products")).toBe(true);
  });

  it("returns the same instance on subsequent calls", async () => {
    const db1 = await getDB();
    const db2 = await getDB();
    expect(db1).toBe(db2);
  });

  it("sales store has by-status index", async () => {
    const db = await getDB();
    const tx = db.transaction("sales");
    expect(tx.store.indexNames.contains("by-status")).toBe(true);
  });

  it("products store has by-storeId index", async () => {
    const db = await getDB();
    const tx = db.transaction("products");
    expect(tx.store.indexNames.contains("by-storeId")).toBe(true);
  });
});
