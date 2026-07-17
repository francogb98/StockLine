// IndexedDB Wrapper using idb library

import { openDB, type IDBPDatabase, type DBSchema } from "idb";

export interface OfflineDBSchema extends DBSchema {
  sales: {
    key: string;
    value: import("./types").QueuedSale;
    indexes: { "by-status": string };
  };
  products: {
    key: string;
    value: import("./types").CachedProduct;
    indexes: { "by-storeId": string };
  };
}

const DB_NAME = "techmart-offline";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const salesStore = db.createObjectStore("sales", { keyPath: "id" });
      salesStore.createIndex("by-status", "status");

      const productsStore = db.createObjectStore("products", { keyPath: "id" });
      productsStore.createIndex("by-storeId", "storeId");
    },
  });

  return dbInstance;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
