import { Resend } from "resend";
import { passwordResetEmailHtml } from "@/lib/email/templates/password-reset-email";

const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? "StockLine <no-reply@stockline.app>";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada");
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[dev] RESEND_API_KEY no configurada — enlace de recuperación para",
        to,
        ":",
        resetUrl,
      );
      return;
    }
    throw new Error("RESEND_API_KEY no está configurada");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const html = passwordResetEmailHtml({ resetUrl, appUrl });

  const result = await getResendClient().emails.send({
    from: RESEND_FROM,
    to,
    subject: "Restablecé tu contraseña — StockLine",
    html,
  });

  if (result.error) {
    throw new Error(
      `Resend error (${result.error.name ?? "unknown"}): ${result.error.message}`,
    );
  }
}
