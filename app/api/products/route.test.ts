import { describe, it, expect, vi, afterEach } from "vitest";
import * as apiAuth from "@/lib/api-auth";
import {
  GET as getProducts,
  POST as postProduct,
} from "@/app/api/products/route";
import {
  GET as getProductById,
  PUT as putProduct,
  DELETE as deleteProduct,
} from "@/app/api/products/[id]/route";
import { prisma } from "@/lib/prisma";

const tenantUser = {
  id: "user-1",
  email: "admin@store.com",
  name: "Admin",
  role: "admin",
  storeId: "store-1",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API /api/products", () => {
  it("GET returns products list with status 200", async () => {
    const expectedProducts = [
      {
        id: "prod-1",
        barcode: "111",
        name: "Test",
        price: 10,
        cost: 5,
        stock: 50,
        minStock: 5,
        categoryId: "cat-1",
        storeId: "store-1",
        quantityType: "DISCRETA",
        unit: "unit",
        presentations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.product, "findMany").mockResolvedValue(
      expectedProducts as any,
    );

    const response = await getProducts();
    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { storeId: "store-1" },
      orderBy: { createdAt: "desc" },
      include: { presentations: { orderBy: { sortOrder: "asc" } } },
    });
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toEqual(
      expect.objectContaining({
        id: "prod-1",
        barcode: "111",
        name: "Test",
        price: 10,
        cost: 5,
        stock: 50,
        minStock: 5,
        categoryId: "cat-1",
        storeId: "store-1",
        quantityType: "DISCRETA",
        unit: "unit",
        presentations: [],
      }),
    );
  });

  it("GET returns 500 when prisma fails", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.product, "findMany").mockRejectedValue(
      new Error("DB error"),
    );

    const response = await getProducts();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Error fetching products" });
  });

  it("POST creates a product and returns 201", async () => {
    const inputData = {
      barcode: "111",
      name: "Test",
      description: "desc",
      categoryId: "cat-1",
      price: 10,
      cost: 5,
      stock: 50,
      minStock: 5,
    };
    const returnedProduct = {
      id: "prod-1",
      ...inputData,
      storeId: "store-1",
      quantityType: "DISCRETA",
      unit: "unit",
      presentations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.category, "findFirst").mockResolvedValue({ id: "cat-1" } as any);
    vi.spyOn(prisma.product, "findFirst").mockResolvedValue(null);

    const tx = {
      product: { create: vi.fn().mockResolvedValue(returnedProduct) },
      stockMovement: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputData),
    });

    const response = await postProduct(request);
    expect(response.status).toBe(201);
    expect(tx.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ storeId: "store-1" }),
      }),
    );
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "PRODUCT_CREATION" }),
      }),
    );
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        id: "prod-1",
        name: "Test",
        quantityType: "DISCRETA",
        unit: "unit",
      }),
    );
  });

  it("POST creates a continuous product with presentations", async () => {
    const inputData = {
      name: "Dog Chow",
      categoryId: "cat-1",
      price: 3200,
      cost: 2500,
      stock: 125,
      minStock: 10,
      quantityType: "CONTINUA",
      unit: "kg",
      presentations: [
        { name: "Bolsa 15 kg", quantity: 15, unit: "kg", active: true, sortOrder: 0 },
        { name: "Bolsa 25 kg", quantity: 25, unit: "kg", active: true, sortOrder: 1 },
      ],
    };
    const returnedProduct = {
      id: "prod-2",
      ...inputData,
      barcode: null,
      description: null,
      storeId: "store-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.category, "findFirst").mockResolvedValue({ id: "cat-1" } as any);
    vi.spyOn(prisma.product, "findFirst").mockResolvedValue(null);

    const tx = {
      product: { create: vi.fn().mockResolvedValue(returnedProduct) },
      stockMovement: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputData),
    });

    const response = await postProduct(request);
    expect(response.status).toBe(201);
    expect(tx.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: "store-1",
          quantityType: "CONTINUA",
          unit: "kg",
          presentations: expect.objectContaining({ create: expect.any(Array) }),
        }),
      }),
    );
  });

  it("POST returns 400 when unit mismatches quantityType", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.category, "findFirst").mockResolvedValue({ id: "cat-1" } as any);

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bad",
        categoryId: "cat-1",
        price: 1,
        cost: 1,
        stock: 0,
        minStock: 0,
        quantityType: "DISCRETA",
        unit: "kg",
      }),
    });

    const response = await postProduct(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/unidad/i);
  });

  it("POST returns 400 when presentation unit mismatches product unit", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.category, "findFirst").mockResolvedValue({ id: "cat-1" } as any);
    vi.spyOn(prisma.product, "findFirst").mockResolvedValue(null);

    const tx = {
      product: { create: vi.fn() },
      stockMovement: { create: vi.fn() },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dog Chow",
        categoryId: "cat-1",
        price: 1,
        cost: 1,
        stock: 0,
        minStock: 0,
        quantityType: "CONTINUA",
        unit: "kg",
        presentations: [{ name: "Botella", quantity: 1, unit: "L" }],
      }),
    });

    const response = await postProduct(request);
    expect(response.status).toBe(400);
  });

  it("POST returns 404 when category belongs to another store", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.category, "findFirst").mockResolvedValue(null);

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        categoryId: "cat-x",
        price: 1,
        cost: 1,
        stock: 0,
        minStock: 0,
      }),
    });

    const response = await postProduct(request);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Categoría no encontrada" });
  });

  it("POST returns 500 when prisma.create fails", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.category, "findFirst").mockResolvedValue({ id: "cat-1" } as any);
    vi.spyOn(prisma, "$transaction").mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        categoryId: "cat-1",
        price: 1,
        cost: 1,
        stock: 0,
        minStock: 0,
      }),
    });

    const response = await postProduct(request);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Error creating product" });
  });
});

describe("API /api/products/[id]", () => {
  it("GET returns product by id with status 200", async () => {
    const expectedProduct = {
      id: "prod-1",
      barcode: "111",
      name: "Test",
      price: 10,
      cost: 5,
      stock: 50,
      minStock: 5,
      categoryId: "cat-1",
      storeId: "store-1",
      quantityType: "DISCRETA",
      unit: "unit",
      presentations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.product, "findFirst").mockResolvedValue(
      expectedProduct as any,
    );

    const response = await getProductById(
      new Request("http://localhost/api/products/prod-1"),
      { params: Promise.resolve({ id: "prod-1" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        id: "prod-1",
        name: "Test",
        quantityType: "DISCRETA",
        unit: "unit",
      }),
    );
  });

  it("GET returns 404 when product not found", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.product, "findFirst").mockResolvedValue(null);

    const response = await getProductById(
      new Request("http://localhost/api/products/prod-1"),
      { params: Promise.resolve({ id: "prod-1" }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Product not found" });
  });

  it("PUT updates product and returns 200", async () => {
    const inputData = {
      barcode: "111",
      name: "Test updated",
      description: "desc",
      categoryId: "cat-1",
      price: 12,
      cost: 6,
      stock: 48,
      minStock: 5,
    };
    const returnedProduct = {
      id: "prod-1",
      ...inputData,
      storeId: "store-1",
      quantityType: "DISCRETA",
      unit: "unit",
      presentations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.category, "findFirst").mockResolvedValue({ id: "cat-1" } as any);
    vi.spyOn(prisma.product, "findFirst")
      .mockResolvedValueOnce({
        id: "prod-1",
        quantityType: "DISCRETA",
        unit: "unit",
        cloudinaryPublicId: null,
      } as any)
      .mockResolvedValueOnce(null);

    const tx = {
      product: {
        findFirst: vi.fn().mockResolvedValue({ stock: 50 }),
        update: vi.fn().mockResolvedValue(returnedProduct),
      },
      stockMovement: { create: vi.fn().mockResolvedValue({}) },
      productPresentation: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const request = new Request("http://localhost/api/products/prod-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputData),
    });

    const response = await putProduct(request, {
      params: Promise.resolve({ id: "prod-1" }),
    });
    expect(response.status).toBe(200);
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "STOCK_CORRECTION" }),
      }),
    );
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        id: "prod-1",
        name: "Test updated",
        quantityType: "DISCRETA",
        unit: "unit",
      }),
    );
  });

  it("PUT blocks updates for product from another store", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.product, "findFirst").mockResolvedValue(null);
    const updateSpy = vi.spyOn(prisma.product, "update");

    const request = new Request("http://localhost/api/products/prod-2", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Should fail" }),
    });

    const response = await putProduct(request, {
      params: Promise.resolve({ id: "prod-2" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Product not found" });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("DELETE removes product and returns 204", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.product, "findFirst").mockResolvedValue({ id: "prod-1" } as any);
    vi.spyOn(prisma.product, "delete").mockResolvedValue({} as any);

    const response = await deleteProduct(
      new Request("http://localhost/api/products/prod-1"),
      { params: Promise.resolve({ id: "prod-1" }) },
    );
    expect(response.status).toBe(204);
  });

  it("DELETE blocks removal for product from another store", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });
    vi.spyOn(prisma.product, "findFirst").mockResolvedValue(null);
    const deleteSpy = vi.spyOn(prisma.product, "delete");

    const response = await deleteProduct(
      new Request("http://localhost/api/products/prod-2"),
      { params: Promise.resolve({ id: "prod-2" }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Product not found" });
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
