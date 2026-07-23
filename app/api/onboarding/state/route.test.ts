import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "./route";
import * as apiAuth from "@/lib/api-auth";

const mockUser = {
  id: "user-1", email: "admin@store.com", name: "Admin",
  role: "admin", storeId: "store-1",
  onboardingStep: 3, draftOnboardingState: { categories: ["Cat1"] },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

describe("GET /api/onboarding/state", () => {
  it("return onboarding state", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currentStep).toBe(3);
    expect(data.draftOnboardingState).toEqual({ categories: ["Cat1"] });
  });

  it("return 404 when user not found", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/onboarding/state", () => {
  it("update onboarding state", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

    const req = new Request("http://localhost/api/onboarding/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStep: 4, draftOnboardingState: { categories: ["Cat1", "Cat2"] } }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
