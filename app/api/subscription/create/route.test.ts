import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import * as apiAuth from "@/lib/api-auth";
import * as mercadopago from "@/lib/mercadopago";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireSessionUser: vi.fn(),
  requireAdminSessionUser: vi.fn(),
  requireAuthenticatedSession: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.spyOn(mercadopago, "createMercadoPagoPreapproval").mockResolvedValue({
  id: "mp-123", initPoint: "https://mp.com/init", sandboxInitPoint: null,
});

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

describe("POST /api/subscription/create", () => {
  it("create monthly subscription", async () => {
    const req = new Request("http://localhost/api/subscription/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "monthly" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.plan).toBe("monthly");
    expect(data.preapprovalId).toBe("mp-123");
  });

  it("reject invalid plan", async () => {
    const req = new Request("http://localhost/api/subscription/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "weekly" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
