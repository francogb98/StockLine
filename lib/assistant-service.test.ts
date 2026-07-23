// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getTodaySales,
  getLowStockProducts,
  getProductStats,
  getCashStatus,
  getStoreInfo,
  getCategoryStats,
  getTopProducts,
  getUsersSummary,
  processFreeText,
  resolveAnswer,
} from "@/lib/assistant-service";
import type { Product, Sale, SaleItem } from "@/lib/types";

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: "sale-1", storeId: "store-1", userId: "user-1",
    cashSessionId: null,
    items: [{ id: "item-1", saleId: "sale-1", productId: "prod-1", productName: "Mouse", quantity: 2, unitPrice: 500, total: 1000 }],
    subtotal: 1000, tax: 0, total: 1000,
    paymentMethod: "cash", status: "completed",
    createdAt: today,
    ...overrides,
  };
}

const mockProducts: Product[] = [
  { id: "p1", storeId: "store-1", barcode: null, name: "Mouse", description: null, categoryId: "cat-1", price: 500, cost: 300, stock: 3, minStock: 5, createdAt: new Date(), updatedAt: new Date() },
  { id: "p2", storeId: "store-1", barcode: null, name: "Teclado", description: null, categoryId: "cat-1", price: 1000, cost: 600, stock: 10, minStock: 3, createdAt: new Date(), updatedAt: new Date() },
  { id: "p3", storeId: "store-1", barcode: null, name: "Monitor", description: null, categoryId: "cat-1", price: 50000, cost: 30000, stock: 2, minStock: 1, createdAt: new Date(), updatedAt: new Date() },
];

describe("getTodaySales", () => {
  it("return message when no sales today", () => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const result = getTodaySales([makeSale({ createdAt: yesterday })]);
    expect(result.text).toContain("Hoy no se registraron ventas");
  });

  it("summarize today sales", () => {
    const result = getTodaySales([
      makeSale({ total: 1000 }),
      makeSale({ id: "sale-2", total: 2000 }),
    ]);
    expect(result.text).toContain("vendiste");
    expect(result.text).toContain("2 transacciones");
    expect(result.action).toBeDefined();
  });
});

describe("getLowStockProducts", () => {
  it("return none when all stock is fine", () => {
    const products = [{ ...mockProducts[1] }]; // Teclado: stock 10, min 3
    const result = getLowStockProducts(products);
    expect(result.text).toContain("No hay productos con stock bajo");
  });

  it("list low stock products", () => {
    const result = getLowStockProducts(mockProducts);
    expect(result.text).toContain("Hay");
    expect(result.text).toContain("con stock bajo");
    expect(result.text).toContain("Mouse");
  });
});

describe("getProductStats", () => {
  it("count products and stock", () => {
    const result = getProductStats(mockProducts);
    expect(result.text).toContain("3 productos");
    expect(result.text).toContain("15 unidades");
  });

  it("handle empty list", () => {
    const result = getProductStats([]);
    expect(result.text).toContain("0 productos");
  });
});

describe("getCashStatus", () => {
  it("show message when no cash session", () => {
    const result = getCashStatus(null);
    expect(result.text).toContain("No hay una sesión de caja abierta");
  });

  it("show cash session details", () => {
    const result = getCashStatus({ currentTotal: 50000, salesCount: 15, openingAmount: 10000 });
    expect(result.text).toContain("50.000");
    expect(result.text).toContain("15");
    expect(result.text).toContain("10.000");
  });
});

describe("getStoreInfo", () => {
  it("show message when no store", () => {
    const result = getStoreInfo(null);
    expect(result.text).toContain("No hay información");
  });

  it("format store details", () => {
    const store = { id: "s1", name: "Mi Tienda", address: "Calle 123", phone: "+54 11 1234", createdAt: new Date() };
    const result = getStoreInfo(store);
    expect(result.text).toContain("Mi Tienda");
    expect(result.text).toContain("Calle 123");
  });
});

describe("getCategoryStats", () => {
  it("show categories count", () => {
    const result = getCategoryStats([{ id: "c1", name: "Cat1" }], mockProducts);
    expect(result.text).toContain("1 categoría");
    expect(result.text).toContain("3 productos");
  });
});

describe("getTopProducts", () => {
  it("show top products from today sales", () => {
    const result = getTopProducts(mockProducts, [
      makeSale({ items: [{
        id: "i1", saleId: "s1", productId: "p1", productName: "Mouse", quantity: 5, unitPrice: 500, total: 2500,
      }] }),
    ]);
    expect(result.text).toContain("Mouse");
    expect(result.text).toContain("5 uds");
  });
});

describe("getUsersSummary", () => {
  it("singular", () => {
    expect(getUsersSummary(1).text).toContain("1 usuario");
  });

  it("plural", () => {
    expect(getUsersSummary(3).text).toContain("3 usuarios");
  });
});

describe("processFreeText", () => {
  it("handle empty text", () => {
    const result = processFreeText("", { sales: [], products: [], categories: [], store: null, cashSession: null, userCount: 0 });
    expect(result.text).toContain("Escribí una pregunta");
  });

  it("match sales intent", () => {
    const data = { sales: [makeSale()], products: [], categories: [], store: null, cashSession: null, userCount: 0 };
    const result = processFreeText("cuánto vendí hoy?", data);
    expect(result.text).toContain("vendiste");
  });

  it("match low stock intent", () => {
    const data = { sales: [], products: mockProducts, categories: [], store: null, cashSession: null, userCount: 0 };
    const result = processFreeText("hay productos con stock bajo?", data);
    expect(result.text).toContain("stock bajo");
  });

  it("fallback to help message", () => {
    const data = { sales: [], products: [], categories: [], store: null, cashSession: null, userCount: 0 };
    const result = processFreeText("qué es la vida?", data);
    expect(result.text).toContain("No entendí tu pregunta");
  });

  it("combine multiple intents", () => {
    const data = { sales: [makeSale()], products: mockProducts, categories: [{ id: "c1", name: "Cat" }], store: null, cashSession: null, userCount: 0 };
    const result = processFreeText("cuanto vendi hoy y productos?", data);
    expect(result.text).toContain("---");
  });
});

describe("resolveAnswer", () => {
  it("return null for unknown faqId", () => {
    const result = resolveAnswer("non-existent", {} as any);
    expect(result).toBeNull();
  });
});
