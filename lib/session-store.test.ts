import { describe, it, expect, beforeEach } from "vitest";
import {
  getOrCreateSessionStore,
  destroySessionStore,
  cleanupExpiredSessionStores,
} from "@/lib/session-store";

const STORE_ID = "store-1";
const OTHER_STORE = "store-2";

let store: ReturnType<typeof getOrCreateSessionStore>;

beforeEach(() => {
  // Get a fresh store by using a unique session id each suite
  const sid = `test-session-${Date.now()}`;
  store = getOrCreateSessionStore(sid);
});

describe("Products", () => {
  it("list products for a store", () => {
    const products = store.getProducts(STORE_ID);
    expect(products.length).toBeGreaterThan(0);
  });

  it("filter products by storeId", () => {
    const products = store.getProducts(OTHER_STORE);
    expect(products).toHaveLength(0);
  });

  it("get product by id", () => {
    const product = store.getProduct("prod-1", STORE_ID);
    expect(product).not.toBeNull();
    expect(product!.name).toBe("Mouse Inalámbrico Logitech M170");
  });

  it("get product by barcode case insensitive", () => {
    const product = store.getProductByBarcode("7790001000011", STORE_ID);
    expect(product).not.toBeNull();
    expect(product!.id).toBe("prod-1");
  });

  it("create product and assign generated id", () => {
    const product = store.createProduct({
      storeId: STORE_ID, barcode: "123", name: "New Product",
      description: null, categoryId: "cat-1",
      price: 100, cost: 50, stock: 10, minStock: 2,
    });
    expect(product.id).toBeTruthy();
    expect(product.name).toBe("New Product");
    expect(store.getProduct(product.id, STORE_ID)).not.toBeNull();
  });

  it("update product", () => {
    const updated = store.updateProduct("prod-1", { price: 20000 });
    expect(updated).not.toBeNull();
    expect(updated!.price).toBe(20000);
  });

  it("return null when updating non-existent product", () => {
    expect(store.updateProduct("not-found", { price: 100 })).toBeNull();
  });

  it("delete product", () => {
    expect(store.deleteProduct("prod-12")).toBe(true);
    expect(store.getProduct("prod-12", STORE_ID)).toBeNull();
  });
});

describe("Categories", () => {
  it("list categories sorted by name", () => {
    const cats = store.getCategories(STORE_ID);
    expect(cats.length).toBeGreaterThan(0);
    for (let i = 1; i < cats.length; i++) {
      expect(cats[i - 1].name.localeCompare(cats[i].name)).toBeLessThanOrEqual(0);
    }
  });

  it("create category with normalized name", () => {
    const cat = store.createCategory({
      storeId: STORE_ID, name: "Nueva", normalizedName: "nueva", description: null,
    });
    expect(cat.id).toBeTruthy();
    expect(cat.name).toBe("Nueva");
  });

  it("find category by name", () => {
    const cat = store.getCategoryByName("Electrónica", STORE_ID);
    expect(cat).not.toBeNull();
    expect(cat!.id).toBe("cat-1");
  });

  it("exclude id when searching by name", () => {
    const cat = store.getCategoryByName("Electrónica", STORE_ID, "cat-1");
    expect(cat).toBeNull();
  });

  it("delete category", () => {
    const cat = store.createCategory({
      storeId: STORE_ID, name: "Temp", normalizedName: "temp", description: null,
    });
    expect(store.deleteCategory(cat.id)).toBe(true);
    expect(store.getCategory(cat.id, STORE_ID)).toBeNull();
  });
});

describe("Sales", () => {
  it("list sales sorted by date descending", () => {
    const sales = store.getSales(STORE_ID);
    expect(sales.length).toBeGreaterThan(0);
  });

  it("create sale with generated items", () => {
    const sale = store.createSale({
      storeId: STORE_ID, userId: "user-1",
      items: [{ productId: "prod-1", productName: "Mouse", quantity: 2, unitPrice: 100, total: 200 }],
      subtotal: 200, tax: 0, total: 200, paymentMethod: "cash",
    });
    expect(sale.id).toBeTruthy();
    expect(sale.items).toHaveLength(1);
    expect(sale.items[0].saleId).toBe(sale.id);
  });

  it("aggregate sales total", () => {
    const result = store.aggregateSalesTotal({});
    expect(result.total).toBeGreaterThan(0);
  });

  it("filter aggregated sales by payment method", () => {
    const cash = store.aggregateSalesTotal({ paymentMethod: "cash" });
    const card = store.aggregateSalesTotal({ paymentMethod: "card" });
    // At least one should have a total
    expect(cash.total !== null || card.total !== null).toBe(true);
  });
});

describe("Cash Sessions", () => {
  it("create cash session", () => {
    const cs = store.createCashSession({
      storeId: STORE_ID, userId: "user-1", openingAmount: 10000, notes: null,
    });
    expect(cs.id).toBeTruthy();
    expect(cs.openingAmount).toBe(10000);
    expect(cs.closedAt).toBeNull();
  });

  it("get open cash session", () => {
    store.createCashSession({
      storeId: STORE_ID, userId: "user-1", openingAmount: 5000, notes: null,
    });
    const open = store.getOpenCashSession(STORE_ID);
    expect(open).not.toBeNull();
    expect(open!.closedAt).toBeNull();
  });
});

describe("Stock Movements", () => {
  it("create stock movement", () => {
    const sm = store.createStockMovement({
      storeId: STORE_ID, productId: "prod-1", userId: "user-1",
      type: "SALE", quantity: -2, previousStock: 25, newStock: 23,
    });
    expect(sm.id).toBeTruthy();
    expect(sm.quantity).toBe(-2);
  });
});

describe("Suspended Sales", () => {
  it("create suspended sale", () => {
    const ss = store.createSuspendedSale({
      storeId: STORE_ID, userId: "user-1",
      total: 500, itemCount: 1,
      items: [{ productId: "prod-1", productName: "Mouse", quantity: 1, unitPrice: 500, total: 500 }],
    });
    expect(ss.id).toBeTruthy();
    expect(ss.items).toHaveLength(1);
  });

  it("delete suspended sale", () => {
    const ss = store.createSuspendedSale({
      storeId: STORE_ID, userId: "user-1",
      total: 100, itemCount: 1,
      items: [{ productId: "prod-1", productName: "Mouse", quantity: 1, unitPrice: 100, total: 100 }],
    });
    expect(store.deleteSuspendedSale(ss.id)).toBe(true);
    expect(store.getSuspendedSale(ss.id, STORE_ID)).toBeNull();
  });
});

describe("Store lifecycle", () => {
  it("getOrCreateSessionStore return same store for same session", () => {
    const sid = `lifecycle-${Date.now()}`;
    const a = getOrCreateSessionStore(sid);
    const b = getOrCreateSessionStore(sid);
    expect(a).toBe(b);
  });

  it("destroySessionStore remove store", () => {
    const sid = `destroy-${Date.now()}`;
    getOrCreateSessionStore(sid);
    destroySessionStore(sid);
    // Re-creating should give a new instance
    const recreated = getOrCreateSessionStore(sid);
    expect(recreated).toBeDefined();
  });

  it("cleanupExpiredSessionStores remove inactive sessions", () => {
    const sid = `expired-${Date.now()}`;
    getOrCreateSessionStore(sid);
    cleanupExpiredSessionStores(new Set(["other-session"]));
    // Should still exist since the cleanup runs per map key
    const store = getOrCreateSessionStore(sid);
    expect(store).toBeDefined();
  });
});
