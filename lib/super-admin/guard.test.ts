import { afterEach, describe, expect, it, vi } from "vitest";
import { requireSuperAdmin } from "@/lib/api-auth";
import { getAuthenticatedSession } from "@/lib/auth-session";

vi.mock("@/lib/auth-session", () => ({
  getAuthenticatedSession: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const mockStoreAdminSession = {
  sessionId: "session-store-admin",
  user: {
    id: "user-store-admin",
    email: "admin@store.com",
    name: "Admin",
    role: "admin",
    storeId: "store-1",
    isSuperAdmin: false,
  },
};

const mockSuperAdminSession = {
  sessionId: "session-super-admin",
  user: {
    id: "user-super-admin",
    email: "super@platform.com",
    name: "Super Admin",
    role: "admin",
    storeId: "store-1",
    isSuperAdmin: true,
  },
};

describe("requireSuperAdmin", () => {
  it("returns 401 when there is no authenticated session", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(null);

    const result = await requireSuperAdmin();

    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(401);
  });

  it("returns 403 when the session user is not a Super Admin", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(
      mockStoreAdminSession as any,
    );

    const result = await requireSuperAdmin();

    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(403);
    expect(await result.response!.text()).toContain(
      "Acceso restringido a Super Admin",
    );
  });

  it("returns auth with isSuperAdmin true for a Super Admin session", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(
      mockSuperAdminSession as any,
    );

    const result = await requireSuperAdmin();

    expect(result.auth).toBeDefined();
    expect(result.auth!.user.isSuperAdmin).toBe(true);
    expect(result.response).toBeUndefined();
  });
});
