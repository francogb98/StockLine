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

vi.mock("@/lib/auth-session", () => ({
  isDemoSession: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/subscription-service", () => ({
  enforceFeatureAccess: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock("@/lib/data-access", async () => {
  const actual = await vi.importActual<any>("@/lib/data-access");
  return {
    ...actual,
    findOrCreateGlobalProduct: vi.fn().mockResolvedValue({ id: "gp-1" }),
    findGlobalProduct: vi.fn().mockResolvedValue({ id: "gp-1" }),
  };
});

const tenantUser = {
  id: "user-1",
  email: "admin@techmart.com",
  name: "Admin",
  role: "admin",
  storeId: "store-1",
  isSuperAdmin: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API /api/products", () => {
  it("GET returns products list with status 200", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const response = await getProducts();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toEqual(
      expect.objectContaining({
        id: "prod-1",
        storeId: "store-1",
      }),
    );
  });

  it("POST creates a product and returns 201", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barcode: "999-NEW",
        name: "New Test Product",
        description: "A test product",
        categoryId: "cat-1",
        price: 100,
        cost: 50,
        stock: 10,
        minStock: 2,
      }),
    });

    const response = await postProduct(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.name).toBe("New Test Product");
    expect(body.storeId).toBe("store-1");
  });

  it("POST creates a continuous product with presentations", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    const response = await postProduct(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.quantityType).toBe("CONTINUA");
    expect(body.unit).toBe("kg");
  });

  it("POST returns 400 when unit mismatches quantityType", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

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

  it("POST returns 404 when category not found", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        categoryId: "cat-x-nonexistent",
        price: 1,
        cost: 1,
        stock: 0,
        minStock: 0,
      }),
    });

    const response = await postProduct(request);
    expect(response.status).toBe(404);
  });

  it("POST returns 400 with invalid data", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        categoryId: "cat-1",
        price: 1,
        cost: 1,
        stock: 0,
        minStock: 0,
      }),
    });

    const response = await postProduct(request);
    expect(response.status).toBe(400);
  });
});

describe("API /api/products/[id]", () => {
  it("GET returns product by id with status 200", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const response = await getProductById(
      new Request("http://localhost/api/products/prod-1"),
      { params: Promise.resolve({ id: "prod-1" }) } as any,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        id: "prod-1",
        name: "Coca Cola 500ml",
        storeId: "store-1",
      }),
    );
  });

  it("GET returns 404 when product not found", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const response = await getProductById(
      new Request("http://localhost/api/products/nonexistent"),
      { params: Promise.resolve({ id: "nonexistent" }) } as any,
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Product not found" });
  });

  it("PUT updates product and returns 200", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const response = await putProduct(
      new Request("http://localhost/api/products/prod-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Coca Cola",
          categoryId: "cat-1",
          price: 2000,
          cost: 900,
          stock: 24,
          minStock: 6,
        }),
      }),
      { params: Promise.resolve({ id: "prod-1" }) } as any,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("Updated Coca Cola");
  });

  it("PUT returns 404 for non-existent product", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const response = await putProduct(
      new Request("http://localhost/api/products/nonexistent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated",
          categoryId: "cat-1",
          price: 100,
          cost: 50,
          stock: 10,
          minStock: 2,
        }),
      }),
      { params: Promise.resolve({ id: "nonexistent" }) } as any,
    );
    expect(response.status).toBe(404);
  });

  it("DELETE removes product and returns 204", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const response = await deleteProduct(
      new Request("http://localhost/api/products/prod-10", { method: "DELETE" }),
      { params: Promise.resolve({ id: "prod-10" }) } as any,
    );
    expect(response.status).toBe(204);
  });

  it("DELETE returns 404 for non-existent product", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: tenantUser,
    });

    const response = await deleteProduct(
      new Request("http://localhost/api/products/nonexistent", { method: "DELETE" }),
      { params: Promise.resolve({ id: "nonexistent" }) } as any,
    );
    expect(response.status).toBe(404);
  });
});
