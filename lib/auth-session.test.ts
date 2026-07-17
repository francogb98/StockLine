import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedSession } from "@/lib/auth-session";
import { cookies } from "next/headers";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("lib/auth-session", () => {
  it("retorna null sin autenticación", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
      delete: vi.fn(),
      set: vi.fn(),
    } as any);

    const session = await getAuthenticatedSession();

    expect(session).toBeNull();
  });

  it("retorna null con sesión manipulada", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token-manipulado" }),
      delete: vi.fn(),
      set: vi.fn(),
    } as any);

    vi.spyOn(prisma.session, "findUnique").mockResolvedValue(null as any);

    const session = await getAuthenticatedSession();

    expect(session).toBeNull();
  });

  it("retorna null con sesión inválida (revocada)", async () => {
    const deleteCookie = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token-revocado" }),
      delete: deleteCookie,
      set: vi.fn(),
    } as any);

    vi.spyOn(prisma.session, "findUnique").mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      user: {
        id: "user-1",
        email: "admin@store.com",
        name: "Admin",
        role: "admin",
        storeId: "store-1",
      },
    } as any);

    const session = await getAuthenticatedSession();

    expect(session).toBeNull();
    expect(deleteCookie).toHaveBeenCalledTimes(1);
  });
});
