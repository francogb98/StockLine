import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as logout } from "@/app/api/auth/logout/route";
import { invalidateCurrentSession } from "@/lib/auth-session";

vi.mock("@/lib/auth-session", () => ({
  invalidateCurrentSession: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API /api/auth/logout", () => {
  it("invalida la sesión actual y responde 200", async () => {
    vi.mocked(invalidateCurrentSession).mockResolvedValue();

    const response = await logout();

    expect(response.status).toBe(200);
    expect(invalidateCurrentSession).toHaveBeenCalledTimes(1);
  });
});
