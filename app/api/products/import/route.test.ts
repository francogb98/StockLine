import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
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

describe("POST /api/products/import", () => {
  it("import new products", async () => {
    const req = new Request("http://localhost/api/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        products: [{ name: "New Product", barcode: "888", price: 100, cost: 50, stock: 10 }],
        options: { mode: "create", matchBy: "barcode", updateFields: ["stock"] },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.created).toBe(1);
  });

  it("reject empty products array", async () => {
    const req = new Request("http://localhost/api/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: [], options: { mode: "create", matchBy: "barcode", updateFields: [] } }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
