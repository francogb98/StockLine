import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import * as apiAuth from "@/lib/api-auth";

const mockTx = {
  category: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  product: {
    createMany: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
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

describe("POST /api/onboarding/complete", () => {
  it("reject missing categories", async () => {
    const req = new Request("http://localhost/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: [], products: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("complete onboarding with categories and products", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      mockTx.category.findFirst.mockResolvedValue(null);
      mockTx.category.create.mockResolvedValue({ id: "cat-new-1" });
      return cb(mockTx);
    });

    const req = new Request("http://localhost/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categories: [{ name: "Electrónica" }],
        products: [{ name: "Producto 1", categoryId: "cat-new-1", price: 100, cost: 50, stock: 10, minStock: 2 }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
