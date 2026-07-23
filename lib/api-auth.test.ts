import { afterEach, describe, expect, it, vi } from "vitest";
import {
  requireAuthenticatedSession,
  requireStoreId,
  requireRole,
  requirePermission,
  requireSessionUser,
  requireAdminSessionUser,
} from "@/lib/api-auth";
import { getAuthenticatedSession } from "@/lib/auth-session";

vi.mock("@/lib/auth-session", () => ({
  getAuthenticatedSession: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const mockAdminSession = {
  sessionId: "session-1",
  user: { id: "user-1", email: "admin@store.com", name: "Admin", role: "admin", storeId: "store-1" },
};

const mockEmployeeSession = {
  sessionId: "session-2",
  user: { id: "user-2", email: "emp@store.com", name: "Emp", role: "employee", storeId: "store-1" },
};

describe("requireAuthenticatedSession", () => {
  it("return session when authenticated", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockAdminSession as any);
    const result = await requireAuthenticatedSession();
    expect(result.auth).toBeDefined();
    expect(result.auth!.user.email).toBe("admin@store.com");
  });

  it("return 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(null);
    const result = await requireAuthenticatedSession();
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(401);
  });
});

describe("requireStoreId", () => {
  it("return storeId from session", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockAdminSession as any);
    const result = await requireStoreId();
    expect(result.storeId).toBe("store-1");
  });

  it("return 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(null);
    const result = await requireStoreId();
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(401);
  });
});

describe("requireRole", () => {
  it("allow user with matching role", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockAdminSession as any);
    const result = await requireRole(["admin"]);
    expect(result.auth).toBeDefined();
  });

  it("reject user without matching role", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockEmployeeSession as any);
    const result = await requireRole(["admin"]);
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(403);
  });
});

describe("requirePermission", () => {
  it("allow admin with sales:detail permission", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockAdminSession as any);
    const result = await requirePermission("sales:detail");
    expect(result.auth).toBeDefined();
  });

  it("reject employee with admin-only permission", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockEmployeeSession as any);
    const result = await requirePermission("users:manage");
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(403);
  });

  it("return 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(null);
    const result = await requirePermission("sales:detail");
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(401);
  });
});

describe("requireSessionUser", () => {
  it("return sessionId and user", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockAdminSession as any);
    const result = await requireSessionUser();
    expect(result.sessionId).toBe("session-1");
    expect(result.user!.id).toBe("user-1");
  });
});

describe("requireAdminSessionUser", () => {
  it("return session for admin", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockAdminSession as any);
    const result = await requireAdminSessionUser();
    expect(result.user!.role).toBe("admin");
  });

  it("reject employee", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue(mockEmployeeSession as any);
    const result = await requireAdminSessionUser();
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(403);
  });
});
