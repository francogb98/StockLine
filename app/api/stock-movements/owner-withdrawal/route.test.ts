import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "./route";
import * as apiAuth from "@/lib/api-auth";
import * as dataAccess from "@/lib/data-access";

vi.mock("@/lib/data-access", async () => {
  const actual = await vi.importActual<typeof dataAccess>("@/lib/data-access");
  return {
    ...actual,
    recordOwnerWithdrawal: vi.fn(),
  };
});

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
  return new Request("http://localhost/api/stock-movements/owner-withdrawal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/stock-movements/owner-withdrawal", () => {
  it("returns 401 when not authenticated", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      response: new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    });
    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 3, reason: "Personal" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: employeeUser,
    });

    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 3, reason: "Personal" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Solo administradores pueden registrar retiro de dueño",
    });
  });

  it("returns 400 when productId is missing", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });

    const response = await POST(
      createRequest({ quantity: 3, reason: "Personal" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(400);
  });

  it("returns 400 when quantity is zero", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });

    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 0, reason: "Personal" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(400);
  });

  it("returns 400 when quantity is negative", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });

    const response = await POST(
      createRequest({ productId: "prod-1", quantity: -2, reason: "Personal" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(400);
  });

  it("accepts empty reason (optional field)", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });
    vi.mocked(dataAccess.recordOwnerWithdrawal).mockResolvedValue({
      productId: "prod-1",
      previousStock: 10,
      newStock: 7,
      quantity: -3,
      reason: "",
    });

    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 3, reason: "" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(201);
  });

  it("returns 400 STOCK_NEGATIVE when qty exceeds stock", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });
    vi.mocked(dataAccess.recordOwnerWithdrawal).mockRejectedValue(
      new Error("STOCK_NEGATIVE"),
    );

    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 100, reason: "Personal" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "El stock no puede ser negativo",
    });
  });

  it("returns 404 when product is not found", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });
    vi.mocked(dataAccess.recordOwnerWithdrawal).mockRejectedValue(
      new Error("NOT_FOUND"),
    );

    const response = await POST(
      createRequest({ productId: "non-existent", quantity: 3, reason: "Personal" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Producto no encontrado",
    });
  });

  it("creates withdrawal and returns 201 with real previousStock/newStock", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });
    vi.mocked(dataAccess.recordOwnerWithdrawal).mockResolvedValue({
      productId: "prod-1",
      previousStock: 10,
      newStock: 7,
      quantity: -3,
      reason: "Personal",
    });

    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 3, reason: "Personal" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.previousStock).toBe(10);
    expect(data.newStock).toBe(7);
    expect(data.quantity).toBe(-3);
  });

  it("returns 500 on unexpected error", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });
    vi.mocked(dataAccess.recordOwnerWithdrawal).mockRejectedValueOnce(
      new Error("boom"),
    );

    const response = await POST(
      createRequest({ productId: "prod-1", quantity: 3, reason: "Personal" }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(500);
  });
});
