import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { checkRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/password-reset", () => ({
  createPasswordResetToken: vi.fn(),
}));

vi.mock("@/lib/email/resend", () => ({
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function buildRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/auth/forgot-password", () => {
  it("rechaza email inválido", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });

    const res = await POST(buildRequest({ email: "no-es-email" }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Email inválido");
  });

  it("aplica límite de intentos", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });

    const res = await POST(buildRequest({ email: "user@test.com" }));

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe("Demasiados intentos. Intentá de nuevo en unos minutos.");
  });

  it("usuario existente genera token y envía email", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1", email: "user@test.com" } as any);
    vi.mocked(createPasswordResetToken).mockResolvedValue({ token: "token-seguro" });
    vi.mocked(sendPasswordResetEmail).mockResolvedValue();

    const res = await POST(buildRequest({ email: "user@test.com" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe(
      "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
    );
    expect(createPasswordResetToken).toHaveBeenCalledWith("user-1");
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({
      to: "user@test.com",
      resetUrl: expect.stringContaining("/reset-password?token=token-seguro"),
    });
  });

  it("usuario inexistente responde mismo mensaje sin enviar email", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await POST(buildRequest({ email: "no-existe@test.com" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe(
      "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
    );
    expect(createPasswordResetToken).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("fallo al enviar email no rompe la respuesta", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1", email: "user@test.com" } as any);
    vi.mocked(createPasswordResetToken).mockResolvedValue({ token: "token-seguro" });
    vi.mocked(sendPasswordResetEmail).mockRejectedValue(new Error("SMTP down"));

    const res = await POST(buildRequest({ email: "user@test.com" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe(
      "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
    );
  });
});
