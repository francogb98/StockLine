import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Resend } from "resend";
import { sendPasswordResetEmail } from "./resend";

vi.mock("resend", () => ({
  Resend: vi.fn(),
}));

async function setup() {
  vi.resetModules();
  const { Resend: ResendMock } = await import("resend");
  const resend = vi.mocked(ResendMock);
  const sendMock = vi.fn();
  resend.mockImplementation(
    class {
      emails = { send: sendMock };
    } as unknown as typeof Resend,
  );
  const mod = await import("./resend");
  return { sendPasswordResetEmail: mod.sendPasswordResetEmail, sendMock };
}

describe("sendPasswordResetEmail", () => {
  const originalApiKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test-key";
    process.env.RESEND_FROM_EMAIL = "StockLine <no-reply@stockline.app>";
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
  });

  it("lanza error cuando Resend devuelve un error de API", async () => {
    const { sendPasswordResetEmail, sendMock } = await setup();
    sendMock.mockResolvedValue({
      data: null,
      error: {
        name: "validation_error",
        message: "The gmail.com domain is not verified",
      },
    });

    await expect(
      sendPasswordResetEmail({
        to: "user@test.com",
        resetUrl: "https://app.com/reset-password?token=abc",
      }),
    ).rejects.toThrow(/gmail.com domain is not verified/);
  });

  it("no lanza error cuando Resend confirma el envío", async () => {
    const { sendPasswordResetEmail, sendMock } = await setup();
    sendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });

    await expect(
      sendPasswordResetEmail({
        to: "user@test.com",
        resetUrl: "https://app.com/reset-password?token=abc",
      }),
    ).resolves.toBeUndefined();
  });

  it("usa el email y resetUrl provistos", async () => {
    const { sendPasswordResetEmail, sendMock } = await setup();
    sendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });

    await sendPasswordResetEmail({
      to: "user@test.com",
      resetUrl: "https://app.com/reset-password?token=abc",
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@test.com",
        subject: "Restablecé tu contraseña — StockLine",
      }),
    );
    expect(String(sendMock.mock.calls[0][0].html)).toContain(
      "https://app.com/reset-password?token=abc",
    );
  });
});
