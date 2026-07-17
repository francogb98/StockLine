import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  cacheProducts,
  getCachedProducts,
  isCacheStale,
  clearProductCache,
} from "@/lib/offline/product-cache";
import { closeDB } from "@/lib/offline/idb";
import type { Product } from "@/lib/types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    storeId: "s1",
    barcode: "123456789",
    name: "Widget",
    description: "A widget",
    categoryId: "cat1",
    price: 10,
    cost: 5,
    stock: 100,
    minStock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("product-cache", () => {
  beforeEach(async () => {
    await closeDB();
    indexedDB = new IDBFactory();
  });

  it("cacheProducts stores products and getCachedProducts retrieves them", async () => {
    const products = [
      makeProduct({ id: "p1", name: "Widget A" }),
      makeProduct({ id: "p2", name: "Widget B" }),
    ];

    await cacheProducts(products);
    const cached = await getCachedProducts();

    expect(cached).toHaveLength(2);
    expect(cached[0].name).toBe("Widget A");
    expect(cached[1].name).toBe("Widget B");
  });

  it("getCachedProducts returns empty array when no cache exists", async () => {
    const cached = await getCachedProducts();
    expect(cached).toEqual([]);
  });

  it("isCacheStale returns true when cache is empty", async () => {
    expect(await isCacheStale()).toBe(true);
  });

  it("isCacheStale returns false when cache is fresh", async () => {
    const products = [makeProduct({ id: "p1" })];
    await cacheProducts(products);

    expect(await isCacheStale()).toBe(false);
  });

  it("isCacheStale returns true when cache exceeds maxAgeMs", async () => {
    const products = [makeProduct({ id: "p1" })];
    await cacheProducts(products);

    // Cache was just created, so it's fresh for any reasonable maxAgeMs
    expect(await isCacheStale(60_000)).toBe(false);
    // But it IS stale if maxAgeMs is negative (always stale)
    expect(await isCacheStale(-1)).toBe(true);
  });

  it("clearProductCache removes all cached products", async () => {
    const products = [
      makeProduct({ id: "p1" }),
      makeProduct({ id: "p2" }),
    ];
    await cacheProducts(products);
    expect(await getCachedProducts()).toHaveLength(2);

    await clearProductCache();
    expect(await getCachedProducts()).toHaveLength(0);
  });

  it("cacheProducts upserts by id (no duplicates)", async () => {
    const p1 = makeProduct({ id: "p1", name: "Version 1" });
    await cacheProducts([p1]);

    const p1Updated = makeProduct({ id: "p1", name: "Version 2" });
    await cacheProducts([p1Updated]);

    const cached = await getCachedProducts();
    expect(cached).toHaveLength(1);
    expect(cached[0].name).toBe("Version 2");
  });
});
