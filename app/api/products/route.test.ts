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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
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
    });
    expect(await response.json()).toEqual(
      JSON.parse(JSON.stringify(expectedProducts)),
    );
  });

  it("GET returns 500 when prisma fails", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
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
    expect(await response.json()).toEqual(
      JSON.parse(JSON.stringify(returnedProduct)),
    );
  });

  it("POST returns 404 when category belongs to another store", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantUser,
    });
    vi.spyOn(prisma.category, "findFirst").mockResolvedValue(null);

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "cat-x" }),
    });

    const response = await postProduct(request);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Categoría no encontrada" });
  });

  it("POST returns 500 when prisma.create fails", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantUser,
    });
    vi.spyOn(prisma.category, "findFirst").mockResolvedValue({ id: "cat-1" } as any);
    vi.spyOn(prisma, "$transaction").mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
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
    expect(await response.json()).toEqual(
      JSON.parse(JSON.stringify(expectedProduct)),
    );
  });

  it("GET returns 404 when product not found", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantUser,
    });
    vi.spyOn(prisma.category, "findFirst").mockResolvedValue({ id: "cat-1" } as any);
    vi.spyOn(prisma.product, "findFirst")
      .mockResolvedValueOnce({ id: "prod-1" } as any)
      .mockResolvedValueOnce(null);

    const tx = {
      product: {
        findFirst: vi.fn().mockResolvedValue({ stock: 50 }),
        update: vi.fn().mockResolvedValue(returnedProduct),
      },
      stockMovement: { create: vi.fn().mockResolvedValue({}) },
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
        data: expect.objectContaining({ type: "STOCK_CORRECTION", quantity: -2 }),
      }),
    );
    expect(await response.json()).toEqual(
      JSON.parse(JSON.stringify(returnedProduct)),
    );
  });

  it("PUT blocks updates for product from another store", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
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
