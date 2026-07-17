// Product Catalog Cache

import { getDB } from "./idb";
import type { CachedProduct } from "./types";
import type { Product } from "@/lib/types";

const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export async function cacheProducts(products: Product[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("products", "readwrite");
  for (const p of products) {
    const cached: CachedProduct = {
      id: p.id,
      storeId: p.storeId,
      name: p.name,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      minStock: p.minStock,
      categoryId: p.categoryId,
      barcode: p.barcode,
      description: p.description ?? "",
      updatedAt: new Date().toISOString(),
    };
    await tx.store.put(cached);
  }
  await tx.done;
}

export async function getCachedProducts(): Promise<CachedProduct[]> {
  const db = await getDB();
  return db.getAll("products");
}

export async function isCacheStale(
  maxAgeMs: number = DEFAULT_MAX_AGE_MS,
): Promise<boolean> {
  const db = await getDB();
  const products = await db.getAll("products");
  if (products.length === 0) return true;

  const now = Date.now();
  const oldest = Math.min(
    ...products.map((p) => new Date(p.updatedAt).getTime()),
  );
  return now - oldest > maxAgeMs;
}

export async function clearProductCache(): Promise<void> {
  const db = await getDB();
  await db.clear("products");
}
