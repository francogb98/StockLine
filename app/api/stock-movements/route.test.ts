import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "./route";
import * as apiAuth from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const tenantUser = {
  id: "user-1",
  email: "admin@store.com",
  name: "Admin",
  role: "admin",
  storeId: "store-1",
};

function createRequest(url: string): Request {
  return new Request(url);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/stock-movements", () => {
  it("returns 401 when not authenticated", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      response: new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    });
    const response = await GET(createRequest("http://localhost/api/stock-movements"));
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(401);
  });

  it("returns a list of movements", async () => {
    const mockMovements = [
      {
        id: "sm-1",
        storeId: "store-1",
        productId: "prod-1",
        userId: "user-1",
        type: "SALE",
        quantity: -2,
        previousStock: 25,
        newStock: 23,
        referenceId: "sale-1",
        reason: null,
        createdAt: new Date(),
        user: { name: "Admin" },
        product: { name: "Producto 1", barcode: "111" },
      },
    ];

    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantUser,
    });
    vi.spyOn(prisma.stockMovement, "findMany").mockResolvedValue(
      mockMovements as any,
    );

    const response = await GET(
      createRequest("http://localhost/api/stock-movements"),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.length).toBe(1);
    expect(data[0].userName).toBe("Admin");
    expect(data[0].productName).toBe("Producto 1");
  });

  it("returns empty array when no movements exist", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantUser,
    });
    vi.spyOn(prisma.stockMovement, "findMany").mockResolvedValue([]);

    const response = await GET(
      createRequest("http://localhost/api/stock-movements?productId=nonexistent"),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it("returns 500 when prisma fails", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantUser,
    });
    vi.spyOn(prisma.stockMovement, "findMany").mockRejectedValue(
      new Error("DB error"),
    );

    const response = await GET(
      createRequest("http://localhost/api/stock-movements"),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Error al obtener movimientos de stock",
    });
  });
});
