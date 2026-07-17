import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "./route";
import * as apiAuth from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const adminUser = {
  id: "user-1",
  email: "admin@store.com",
  name: "Admin",
  role: "admin",
  storeId: "store-1",
};

const employeeUser = {
  id: "user-2",
  email: "employee@store.com",
  name: "Employee",
  role: "employee",
  storeId: "store-1",
};

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/stock-movements/adjust", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/stock-movements/adjust", () => {
  it("returns 401 when not authenticated", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      response: new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    });
    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 5, reason: "Test" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: employeeUser,
    });

    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 5, reason: "Test" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Solo administradores pueden ajustar stock",
    });
  });

  it("returns 400 when productId is missing", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: adminUser,
    });

    const response = await POST(
      createRequest({ quantity: 5, reason: "Test" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(400);
  });

  it("returns 400 when quantity is zero", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: adminUser,
    });

    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 0, reason: "Test" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(400);
  });

  it("returns 400 when reason is empty", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: adminUser,
    });

    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 5, reason: "" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(400);
  });

  it("returns 404 for non-existent product", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: adminUser,
    });
    vi.spyOn(prisma.product, "findFirst").mockResolvedValue(null);

    const response = await POST(
      createRequest({ productId: "non-existent", quantity: 5, reason: "Test" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(404);
  });

  it("creates adjustment and updates stock", async () => {
    const product = {
      id: "prod-1",
      storeId: "store-1",
      name: "Test Product",
      stock: 10,
    };

    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: adminUser,
    });
    vi.spyOn(prisma.product, "findFirst").mockResolvedValue(product as any);

    const updatedProduct = { ...product, stock: 15 };
    vi.spyOn(prisma.product, "update").mockResolvedValue(updatedProduct as any);
    vi.spyOn(prisma.stockMovement, "create").mockResolvedValue({ id: "sm-new" } as any);
    vi.spyOn(prisma, "$transaction").mockImplementation(
      async (args: any) => Promise.all(args),
    );

    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 5, reason: "Ajuste manual" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.previousStock).toBe(10);
    expect(data.newStock).toBe(15);
    expect(data.quantity).toBe(5);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { stock: 15 },
    });
    expect(prisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "MANUAL_ADJUSTMENT",
          quantity: 5,
          reason: "Ajuste manual",
        }),
      }),
    );
  });

  it("handles negative stock adjustment", async () => {
    const product = {
      id: "prod-1",
      storeId: "store-1",
      name: "Test Product",
      stock: 10,
    };

    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: adminUser,
    });
    vi.spyOn(prisma.product, "findFirst").mockResolvedValue(product as any);

    const updatedProduct = { ...product, stock: 7 };
    vi.spyOn(prisma.product, "update").mockResolvedValue(updatedProduct as any);
    vi.spyOn(prisma.stockMovement, "create").mockResolvedValue({ id: "sm-new" } as any);
    vi.spyOn(prisma, "$transaction").mockImplementation(
      async (args: any) => Promise.all(args),
    );

    const response = await POST(
      createRequest({
        productId: "prod-1",
        quantity: -3,
        reason: "Devolución por daño",
      }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.previousStock).toBe(10);
    expect(data.newStock).toBe(7);
    expect(data.quantity).toBe(-3);
  });
});
