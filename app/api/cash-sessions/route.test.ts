import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/cash-sessions/route";
import { prisma } from "@/lib/prisma";
import * as apiAuth from "@/lib/api-auth";

const tenantAdmin = {
  id: "admin-1",
  email: "admin@store.com",
  name: "Admin",
  role: "admin",
  storeId: "store-1",
};

const tenantEmployee = {
  id: "emp-1",
  email: "emp@store.com",
  name: "Employee",
  role: "employee",
  storeId: "store-1",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/cash-sessions", () => {
  it("returns cash sessions for the store", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });

    const mockSessions = [
      {
        id: "cs-1",
        storeId: "store-1",
        userId: "admin-1",
        openingAmount: 50000,
        expectedAmount: 185000,
        closingAmount: 185500,
        difference: 500,
        closedAt: new Date(),
        createdAt: new Date(),
        notes: "Cierre turno mañana",
        user: { name: "Admin" },
        _count: { sales: 15 },
      },
    ];

    vi.spyOn(prisma.cashSession, "findMany").mockResolvedValue(mockSessions as any);

    const response = await GET(new Request("http://localhost/api/cash-sessions"));
    if (!response) throw new Error("Expected response");

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe("cs-1");
    expect(data[0].userName).toBe("Admin");
    expect(data[0].salesCount).toBe(15);
  });

  it("filters by status=open", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });

    vi.spyOn(prisma.cashSession, "findMany").mockResolvedValue([]);

    const response = await GET(
      new Request("http://localhost/api/cash-sessions?status=open"),
    );
    if (!response) throw new Error("Expected response");

    expect(response.status).toBe(200);
    expect(prisma.cashSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ closedAt: null }),
      }),
    );
  });

  it("employee can only see own sessions", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantEmployee,
    });

    vi.spyOn(prisma.cashSession, "findMany").mockResolvedValue([]);

    await GET(new Request("http://localhost/api/cash-sessions"));

    expect(prisma.cashSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "emp-1" }),
      }),
    );
  });

  it("returns 401 if not authenticated", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      response: new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    });

    const response = await GET(new Request("http://localhost/api/cash-sessions"));
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(401);
  });
});

describe("POST /api/cash-sessions", () => {
  it("creates a new cash session", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });

    vi.spyOn(prisma.cashSession, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma.cashSession, "create").mockResolvedValue({
      id: "cs-new",
      storeId: "store-1",
      userId: "admin-1",
      openingAmount: 50000,
      expectedAmount: null,
      closingAmount: null,
      difference: null,
      notes: "Apertura",
      closedAt: null,
      createdAt: new Date(),
      user: { name: "Admin" },
    } as any);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (fn: any) => fn(prisma));

    const request = new Request("http://localhost/api/cash-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingAmount: 50000, notes: "Apertura" }),
    });

    const response = await POST(request);
    if (!response) throw new Error("Expected response");

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.openingAmount).toBe(50000);
    expect(data.userName).toBe("Admin");
  });

  it("rejects if there is already an open session", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });

    vi.spyOn(prisma.cashSession, "findFirst").mockResolvedValue({
      id: "cs-open",
      closedAt: null,
    } as any);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (fn: any) => fn(prisma));

    const request = new Request("http://localhost/api/cash-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingAmount: 0 }),
    });

    const response = await POST(request);
    if (!response) throw new Error("Expected response");

    expect(response.status).toBe(409);
  });

  it("defaults openingAmount to 0 if not provided", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });

    vi.spyOn(prisma.cashSession, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma.cashSession, "create").mockResolvedValue({
      id: "cs-new",
      storeId: "store-1",
      userId: "admin-1",
      openingAmount: 0,
      expectedAmount: null,
      closingAmount: null,
      difference: null,
      notes: null,
      closedAt: null,
      createdAt: new Date(),
      user: { name: "Admin" },
    } as any);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (fn: any) => fn(prisma));

    const request = new Request("http://localhost/api/cash-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(201);
    expect((await response.json()).openingAmount).toBe(0);
  });
});
