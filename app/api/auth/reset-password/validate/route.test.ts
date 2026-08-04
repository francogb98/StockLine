import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { findValidPasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/password-reset", () => ({
  findValidPasswordResetToken: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function buildRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/auth/reset-password/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/auth/reset-password/validate", () => {
  it("valida token vigente", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 19, resetAt: Date.now() + 1000 });
    vi.mocked(findValidPasswordResetToken).mockResolvedValue({
      tokenId: "token-1",
      userId: "user-1",
    });

    const res = await POST(buildRequest({ token: "token-de-20-caracteres-min" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ valid: true });
  });

  it("rechaza token inválido o expirado", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 19, resetAt: Date.now() + 1000 });
    vi.mocked(findValidPasswordResetToken).mockResolvedValue(null);

    const res = await POST(buildRequest({ token: "token-de-20-caracteres-min" }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El enlace es inválido o ha expirado.");
  });

  it("rechaza token ausente", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 19, resetAt: Date.now() + 1000 });

    const res = await POST(buildRequest({}));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El enlace es inválido o ha expirado.");
  });
});
