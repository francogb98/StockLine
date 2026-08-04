import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePassword } from "@/lib/password-utils.server";
import { resetPasswordSchema } from "@/lib/validations";
import {
  findValidPasswordResetToken,
  hashResetToken,
  revokeAllUserSessions,
} from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";

const RESET_PASSWORD_RATE_LIMIT = { windowMs: 15 * 60 * 1000, maxRequests: 5 };

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const rateLimit = checkRateLimit(`reset-password:${ip}`, RESET_PASSWORD_RATE_LIMIT);

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

    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "El enlace es inválido o ha expirado";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { token, password } = parsed.data;

    const record = await findValidPasswordResetToken(token);

    if (!record) {
      return NextResponse.json(
        { error: "El enlace es inválido o ha expirado." },
        { status: 400 },
      );
    }

    const passwordValidation = validatePassword(password);

    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    const tokenHash = hashResetToken(token);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });

      await tx.passwordResetToken.deleteMany({
        where: { tokenHash },
      });

      await revokeAllUserSessions(record.userId, tx);
    });

    return NextResponse.json(
      { message: "Contraseña actualizada correctamente." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al restablecer la contraseña:", error);
    return NextResponse.json(
      { error: "Error al restablecer la contraseña" },
      { status: 500 },
    );
  }
}
