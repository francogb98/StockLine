import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import * as apiAuth from "@/lib/api-auth";

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
});

describe("POST /api/auth/hash-password", () => {
  it("hash a password", async () => {
    const req = new Request("http://localhost/api/auth/hash-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "Test1234!" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hashedPassword).toBeTruthy();
    expect(data.hashedPassword).not.toBe("Test1234!");
  });

  it("reject missing password", async () => {
    const req = new Request("http://localhost/api/auth/hash-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("reject unauthenticated", async () => {
    vi.mocked(apiAuth.requireAdminSessionUser).mockResolvedValue({
      response: new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 }),
    } as any);

    const req = new Request("http://localhost/api/auth/hash-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
