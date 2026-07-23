import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
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

vi.mock("@/lib/subscription-service", () => ({
  resolveSubscriptionSnapshot: vi.fn().mockResolvedValue({
    status: "trial", plan: "monthly",
    currentPeriodStart: new Date(), currentPeriodEnd: new Date(),
    trialEndsAt: new Date(), daysRemaining: 15,
  }),
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

describe("GET /api/subscription/status", () => {
  it("return subscription status", async () => {
    const req = new Request("http://localhost/api/subscription/status");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("active");
  });
});
