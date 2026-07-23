import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/suspended-sales/route";
import { DELETE } from "@/app/api/suspended-sales/[id]/route";
import * as apiAuth from "@/lib/api-auth";
import * as testUsers from "@/lib/test-users";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/auth-session", () => ({
  getAuthenticatedSession: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({
  requireSessionUser: vi.fn(),
  requireAdminSessionUser: vi.fn(),
  requireAuthenticatedSession: vi.fn(),
  requirePermission: vi.fn(),
}));
vi.mock("@/lib/test-users", () => ({
  isTestUserEmail: vi.fn(),
}));

afterEach(() => { vi.restoreAllMocks(); });

const defaultAuthUser = {
  sessionId: "session-1",
  user: { id: "user-1", email: "admin@techmart.com", name: "Admin", role: "admin", storeId: "store-1" },
} as any;

beforeEach(() => {
  vi.mocked(apiAuth.requireSessionUser).mockResolvedValue(defaultAuthUser);
  vi.mocked(apiAuth.requireAdminSessionUser).mockResolvedValue(defaultAuthUser);
  vi.mocked(apiAuth.requireAuthenticatedSession).mockResolvedValue({ auth: defaultAuthUser } as any);
  vi.mocked(apiAuth.requirePermission).mockResolvedValue({ auth: defaultAuthUser } as any);
  vi.mocked(testUsers.isTestUserEmail).mockReturnValue(true);
});

describe("GET /api/suspended-sales", () => {
  it("return empty list initially", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("POST /api/suspended-sales", () => {
  it("create suspended sale", async () => {
    const req = new Request("http://localhost/api/suspended-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: "prod-1", productName: "Mouse", quantity: 2, unitPrice: 500, total: 1000 }],
        total: 1000,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.total).toBe(1000);
    expect(data.items).toHaveLength(1);
  });

  it("reject empty items", async () => {
    const req = new Request("http://localhost/api/suspended-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [], total: 0 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("reject invalid total", async () => {
    const req = new Request("http://localhost/api/suspended-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ productId: "p1", productName: "T", quantity: 1, unitPrice: 10, total: 10 }], total: -1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/suspended-sales/[id]", () => {
  it("reject delete non-existent", async () => {
    const req = new Request("http://localhost/api/suspended-sales/nope", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nope" }) } as any);
    expect(res.status).toBe(404);
  });

  it("delete existing suspended sale", async () => {
    const createReq = new Request("http://localhost/api/suspended-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: "prod-1", productName: "Mouse", quantity: 1, unitPrice: 100, total: 100 }],
        total: 100,
      }),
    });
    const created = await (await POST(createReq)).json();
    const req = new Request(`http://localhost/api/suspended-sales/${created.id}`, { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: created.id }) } as any);
    expect(res.status).toBe(200);
  });
});
