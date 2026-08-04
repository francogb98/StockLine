import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePassword } from "@/lib/password-utils.server";
import {
  findValidPasswordResetToken,
  hashResetToken,
  revokeAllUserSessions,
} from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { update: vi.fn() },
    passwordResetToken: { deleteMany: vi.fn() },
    session: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/password-reset", () => ({
  findValidPasswordResetToken: vi.fn(),
  hashResetToken: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  createPasswordResetToken: vi.fn(),
  deletePasswordResetToken: vi.fn(),
}));

vi.mock("@/lib/password-utils.server", () => ({
  hashPassword: vi.fn(),
  validatePassword: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function buildRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/auth/reset-password", () => {
  it("rechaza token inválido o expirado", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });
    vi.mocked(findValidPasswordResetToken).mockResolvedValue(null);

    const res = await POST(
      buildRequest({ token: "token-de-20-caracteres-min", password: "NuevaPassword123" }),
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El enlace es inválido o ha expirado.");
  });

  it("rechaza contraseña débil", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });
    vi.mocked(findValidPasswordResetToken).mockResolvedValue({
      tokenId: "token-1",
      userId: "user-1",
    });
    vi.mocked(validatePassword).mockReturnValue({
      isValid: false,
      error: "La contraseña debe tener al menos 8 caracteres",
    });

    const res = await POST(
      buildRequest({ token: "token-de-20-caracteres-min", password: "NuevaPassword123" }),
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("La contraseña debe tener al menos 8 caracteres");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("restablece contraseña, elimina token y revoca sesiones", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });
    vi.mocked(findValidPasswordResetToken).mockResolvedValue({
      tokenId: "token-1",
      userId: "user-1",
    });
    vi.mocked(validatePassword).mockReturnValue({ isValid: true });
    vi.mocked(hashPassword).mockResolvedValue("nuevo-hash-bcrypt");
    vi.mocked(hashResetToken).mockReturnValue("hash-del-token");
    vi.mocked(revokeAllUserSessions).mockResolvedValue();

    const tx = {
      user: { update: vi.fn().mockResolvedValue({ id: "user-1" }) },
      passwordResetToken: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx));

    const res = await POST(
      buildRequest({ token: "token-de-20-caracteres-min", password: "NuevaPassword123" }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("Contraseña actualizada correctamente.");
    expect(hashPassword).toHaveBeenCalledWith("NuevaPassword123");
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "nuevo-hash-bcrypt" },
    });
    expect(tx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: "hash-del-token" },
    });
    expect(revokeAllUserSessions).toHaveBeenCalledWith("user-1", tx);
  });
});
