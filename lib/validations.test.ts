import { describe, it, expect } from "vitest";
import {
  createSaleSchema,
  adjustStockSchema,
  createProductSchema,
  createCategorySchema,
  loginSchema,
  registerSchema,
  suspendedSaleSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateImageFile,
  MAX_IMAGE_SIZE,
} from "@/lib/validations";

describe("validateImageFile", () => {
  it("accept valid jpg image under 5MB", () => {
    expect(
      validateImageFile({ type: "image/jpeg", size: 1024 }),
    ).toBeNull();
  });

  it("accept valid png/webp/gif", () => {
    expect(validateImageFile({ type: "image/png", size: 100 })).toBeNull();
    expect(validateImageFile({ type: "image/webp", size: 100 })).toBeNull();
    expect(validateImageFile({ type: "image/gif", size: 100 })).toBeNull();
  });

  it("reject non-image file", () => {
    expect(
      validateImageFile({ type: "application/pdf", size: 1024 }),
    ).toMatch(/imagen/i);
  });

  it("reject image over 5MB", () => {
    expect(
      validateImageFile({ type: "image/png", size: MAX_IMAGE_SIZE + 1 }),
    ).toMatch(/5 MB/i);
  });

  it("accept image exactly at 5MB limit", () => {
    expect(
      validateImageFile({ type: "image/png", size: MAX_IMAGE_SIZE }),
    ).toBeNull();
  });
});


describe("createSaleSchema", () => {
  it("accept valid sale", () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: "p1", productName: "Test", quantity: 2, unitPrice: 100, total: 200 }],
      total: 200,
      paymentMethod: "cash",
    });
    expect(result.success).toBe(true);
  });

  it("reject empty items", () => {
    const result = createSaleSchema.safeParse({
      items: [],
      total: 0,
      paymentMethod: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("reject invalid payment method", () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: "p1", productName: "Test", quantity: 1 }],
      total: 100,
      paymentMethod: "bitcoin",
    });
    expect(result.success).toBe(false);
  });

  it("reject negative quantity", () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: "p1", productName: "Test", quantity: -1 }],
      total: 100,
      paymentMethod: "card",
    });
    expect(result.success).toBe(false);
  });
});

describe("adjustStockSchema", () => {
  it("accept valid adjustment", () => {
    expect(adjustStockSchema.safeParse({ productId: "p1", quantity: 5, reason: "Ajuste" }).success).toBe(true);
  });

  it("reject zero quantity", () => {
    expect(adjustStockSchema.safeParse({ productId: "p1", quantity: 0, reason: "Nada" }).success).toBe(false);
  });

  it("reject empty reason", () => {
    expect(adjustStockSchema.safeParse({ productId: "p1", quantity: 5, reason: "" }).success).toBe(false);
  });

  it("reject empty productId", () => {
    expect(adjustStockSchema.safeParse({ productId: "", quantity: 5, reason: "Test" }).success).toBe(false);
  });
});

describe("createProductSchema", () => {
  it("accept valid product", () => {
    expect(
      createProductSchema.safeParse({
        name: "Producto",
        categoryId: "cat-1",
        price: 100,
        cost: 50,
        stock: 10,
        minStock: 2,
      }).success,
    ).toBe(true);
  });

  it("reject empty name", () => {
    expect(
      createProductSchema.safeParse({
        name: "",
        categoryId: "cat-1",
        price: 100,
        cost: 50,
        stock: 10,
        minStock: 2,
      }).success,
    ).toBe(false);
  });

  it("reject negative price", () => {
    expect(
      createProductSchema.safeParse({
        name: "Test",
        categoryId: "cat-1",
        price: -10,
        cost: 50,
        stock: 10,
        minStock: 2,
      }).success,
    ).toBe(false);
  });
});

describe("createCategorySchema", () => {
  it("accept valid category", () => {
    expect(createCategorySchema.safeParse({ name: "Electrónica" }).success).toBe(true);
  });

  it("reject empty name", () => {
    expect(createCategorySchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accept category with description", () => {
    expect(createCategorySchema.safeParse({ name: "Test", description: "Una descripción" }).success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accept valid login", () => {
    expect(loginSchema.safeParse({ email: "test@test.com", password: "123456" }).success).toBe(true);
  });

  it("reject invalid email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "123456" }).success).toBe(false);
  });

  it("reject empty password", () => {
    expect(loginSchema.safeParse({ email: "test@test.com", password: "" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accept valid registration", () => {
    expect(
      registerSchema.safeParse({
        email: "test@test.com",
        password: "12345678",
        name: "User",
        storeName: "Store",
      }).success,
    ).toBe(true);
  });

  it("reject short password", () => {
    expect(
      registerSchema.safeParse({
        email: "test@test.com",
        password: "123",
        name: "User",
        storeName: "Store",
      }).success,
    ).toBe(false);
  });

  it("reject empty name", () => {
    expect(
      registerSchema.safeParse({
        email: "test@test.com",
        password: "12345678",
        name: "",
        storeName: "Store",
      }).success,
    ).toBe(false);
  });
});

describe("suspendedSaleSchema", () => {
  it("accept valid suspended sale", () => {
    expect(
      suspendedSaleSchema.safeParse({
        items: [{ productId: "p1", productName: "Test", quantity: 1, unitPrice: 100, total: 100 }],
        total: 100,
      }).success,
    ).toBe(true);
  });

  it("reject empty items", () => {
    expect(suspendedSaleSchema.safeParse({ items: [], total: 0 }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accept valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "test@test.com" }).success).toBe(true);
  });

  it("reject invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  it("trim whitespace around email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "  test@test.com  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@test.com");
    }
  });
});

describe("resetPasswordSchema", () => {
  it("accept valid token and password", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "token-de-al-menos-20-caracteres",
        password: "12345678",
      }).success,
    ).toBe(true);
  });

  it("reject short token", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "short",
        password: "12345678",
      }).success,
    ).toBe(false);
  });

  it("reject short password", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "token-de-al-menos-20-caracteres",
        password: "123",
      }).success,
    ).toBe(false);
  });
});
