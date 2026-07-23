import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import * as apiAuth from "@/lib/api-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    cashSession: {
      findFirst: vi.fn(),
    },
    sale: {
      aggregate: vi.fn(),
    },
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

describe("GET /api/auth/me", () => {
  it("return 401 when not authenticated", async () => {
    vi.mocked(apiAuth.requireAuthenticatedSession).mockResolvedValue({
      response: new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 }),
    } as any);

    const req = new Request("http://localhost/api/auth/me");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("return authenticated user", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1", email: "admin@store.com", name: "Admin",
      role: "admin", storeId: "store-1", passwordHash: "hash",
      store: { id: "store-1", name: "Store" },
      hasCompletedOnboarding: false, onboardingStep: null, draftOnboardingState: null,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValue(null);

    const req = new Request("http://localhost/api/auth/me");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.passwordHash).toBeUndefined();
  });
});
