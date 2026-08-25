import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { checkRateLimit } from "@/lib/rate-limit";

const FORGOT_PASSWORD_RATE_LIMIT = { windowMs: 60 * 60 * 1000, maxRequests: 5 };

const GENERIC_MESSAGE =
  "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const rateLimit = checkRateLimit(`forgot-password:${ip}`, FORGOT_PASSWORD_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intentá de nuevo en unos minutos." },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 },
      );
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      const { token } = await createPasswordResetToken(user.id);
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;

      try {
        await sendPasswordResetEmail({ to: user.email, resetUrl });
      } catch (error) {
        console.error("Error enviando email de recuperación:", error);
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error("Error al enviar el correo de recuperación:", error);
    return NextResponse.json(
      { error: "Error al enviar el correo de recuperación" },
      { status: 500 },
    );
  }
}
