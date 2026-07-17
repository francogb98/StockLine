import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cash-sessions/[id]/close/route";
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
  id: "emp-2",
  email: "emp@store.com",
  name: "Employee",
  role: "employee",
  storeId: "store-1",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/cash-sessions/[id]/close", () => {
  it("closes a session and calculates difference correctly", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });

    vi.spyOn(prisma.cashSession, "findFirst").mockResolvedValue({
      id: "cs-1",
      storeId: "store-1",
      userId: "admin-1",
      openingAmount: 50000,
      closedAt: null,
    } as any);

    vi.spyOn(prisma.sale, "aggregate").mockResolvedValue({
      _sum: { total: 150000 },
      _count: 10,
      _avg: null,
      _max: null,
      _min: null,
    } as any);

    vi.spyOn(prisma.cashSession, "update").mockResolvedValue({
      id: "cs-1",
      storeId: "store-1",
      userId: "admin-1",
      openingAmount: 50000,
      expectedAmount: 200000,
      closingAmount: 200000,
      difference: 0,
      notes: "Sin novedades",
      closedAt: new Date(),
      createdAt: new Date(),
      user: { name: "Admin" },
      _count: { sales: 10 },
    } as any);

    vi.spyOn(prisma, "$transaction").mockImplementation(async (fn: any) => fn(prisma));

    const request = new Request(
      "http://localhost/api/cash-sessions/cs-1/close",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingAmount: 200000, notes: "Sin novedades" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "cs-1" }),
    });
    if (!response) throw new Error("Expected response");

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.expectedAmount).toBe(200000);
    expect(data.closingAmount).toBe(200000);
    expect(data.difference).toBe(0);
  });

  it("detects surplus when closing amount exceeds expected", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });

    vi.spyOn(prisma.cashSession, "findFirst").mockResolvedValue({
      id: "cs-1",
      storeId: "store-1",
      userId: "admin-1",
      openingAmount: 50000,
      closedAt: null,
    } as any);

    vi.spyOn(prisma.sale, "aggregate").mockResolvedValue({
      _sum: { total: 150000 },
    } as any);

    vi.spyOn(prisma.cashSession, "update").mockResolvedValue({
      id: "cs-1",
      storeId: "store-1",
      openingAmount: 50000,
      expectedAmount: 200000,
      closingAmount: 210000,
      difference: 10000,
      notes: null,
      closedAt: new Date(),
      createdAt: new Date(),
      userId: "admin-1",
      user: { name: "Admin" },
      _count: { sales: 5 },
    } as any);

    vi.spyOn(prisma, "$transaction").mockImplementation(async (fn: any) => fn(prisma));

    const request = new Request(
      "http://localhost/api/cash-sessions/cs-1/close",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingAmount: 210000 }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "cs-1" }),
    });
    if (!response) throw new Error("Expected response");

    const data = await response.json();
    expect(data.difference).toBe(10000);
  });

  it("rejects if session is already closed", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });

    vi.spyOn(prisma.cashSession, "findFirst").mockResolvedValue({
      id: "cs-1",
      storeId: "store-1",
      closedAt: new Date(),
    } as any);

    vi.spyOn(prisma, "$transaction").mockImplementation(async (fn: any) => fn(prisma));

    const request = new Request(
      "http://localhost/api/cash-sessions/cs-1/close",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingAmount: 0 }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "cs-1" }),
    });
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(409);
  });

  it("rejects if closingAmount is not a valid number", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });

    const request = new Request(
      "http://localhost/api/cash-sessions/cs-1/close",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingAmount: -100 }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "cs-1" }),
    });
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(400);
  });

  it("employee cannot close another user's session", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantEmployee,
    });

    vi.spyOn(prisma.cashSession, "findFirst").mockResolvedValue({
      id: "cs-1",
      storeId: "store-1",
      userId: "admin-1",
      openingAmount: 0,
      closedAt: null,
    } as any);

    vi.spyOn(prisma, "$transaction").mockImplementation(async (fn: any) => fn(prisma));

    const request = new Request(
      "http://localhost/api/cash-sessions/cs-1/close",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingAmount: 0 }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "cs-1" }),
    });
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(403);
  });
});
