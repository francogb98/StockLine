import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/products/[id]/route";
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

describe("GET /api/products/[id]", () => {
  it("return product by id", async () => {
    const res = await GET(new Request("http://localhost/api/products/prod-1"), {
      params: Promise.resolve({ id: "prod-1" }),
    } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toContain("Mouse");
  });

  it("return 404 for non-existent", async () => {
    const res = await GET(new Request("http://localhost/api/products/nope"), {
      params: Promise.resolve({ id: "nope" }),
    } as any);
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/products/[id]", () => {
  it("update product", async () => {
    const req = new Request("http://localhost/api/products/prod-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Mouse", price: 20000 }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "prod-1" }) } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Updated Mouse");
  });

  it("return 404 for non-existent", async () => {
    const req = new Request("http://localhost/api/products/nope", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nope" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "nope" }) } as any);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/products/[id]", () => {
  it("delete existing product", async () => {
    const res = await DELETE(new Request("http://localhost/api/products/prod-10"), {
      params: Promise.resolve({ id: "prod-10" }),
    } as any);
    expect(res.status).toBe(204);
  });

  it("return 404 for non-existent", async () => {
    const res = await DELETE(new Request("http://localhost/api/products/nope"), {
      params: Promise.resolve({ id: "nope" }),
    } as any);
    expect(res.status).toBe(404);
  });
});
