import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as logout } from "@/app/api/auth/logout/route";
import { invalidateCurrentSession, getAuthenticatedSession } from "@/lib/auth-session";

vi.mock("@/lib/auth-session", () => ({
  invalidateCurrentSession: vi.fn(),
  getAuthenticatedSession: vi.fn(),
}));

vi.mock("@/lib/audit-service", () => ({
  recordAuditEvent: vi.fn().mockResolvedValue({}),
  extractAuditContext: vi.fn().mockReturnValue({ ipAddress: "127.0.0.1", userAgent: "test" }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API /api/auth/logout", () => {
  it("invalida la sesión actual y responde 200", async () => {
    vi.mocked(getAuthenticatedSession).mockResolvedValue({
      sessionId: "session-1",
      user: { id: "user-1", email: "admin@test.com", name: "Test", role: "admin", storeId: "store-1", isSuperAdmin: false },
    } as any);
    vi.mocked(invalidateCurrentSession).mockResolvedValue();

    const req = new Request("http://localhost/api/auth/logout", { method: "POST" });
    const response = await logout(req as any);

    expect(response.status).toBe(200);
    expect(invalidateCurrentSession).toHaveBeenCalledTimes(1);
  });
});
