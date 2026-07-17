import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password-utils.server";
import {
  createSession,
  invalidateCurrentSession,
  setSessionCookie,
} from "@/lib/auth-session";

vi.mock("@/lib/password-utils.server", () => ({
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  createSession: vi.fn(),
  invalidateCurrentSession: vi.fn(),
  setSessionCookie: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("API /api/auth/login", () => {
  it("permite login exitoso", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-1",
      email: "admin@store.com",
      name: "Admin",
      role: "admin",
      passwordHash: "hash",
      storeId: "store-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      store: {
        id: "store-1",
        name: "Store",
        address: "",
        phone: "",
        createdAt: new Date(),
      },
    } as any);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(invalidateCurrentSession).mockResolvedValue();
    vi.mocked(createSession).mockResolvedValue({
      token: "token-seguro",
      sessionId: "session-1",
    });
    vi.mocked(setSessionCookie).mockResolvedValue();

    const response = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@store.com",
          password: "Password123",
        }),
      }) as any,
    );

    expect(response.status).toBe(200);
    expect(invalidateCurrentSession).toHaveBeenCalled();
    expect(createSession).toHaveBeenCalledWith("user-1");
    expect(setSessionCookie).toHaveBeenCalledWith("token-seguro");
  });

  it("rechaza login inválido", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    const response = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@store.com",
          password: "incorrecta",
        }),
      }) as any,
    );

    expect(response.status).toBe(401);
    expect(createSession).not.toHaveBeenCalled();
    expect(setSessionCookie).not.toHaveBeenCalled();
  });
});
