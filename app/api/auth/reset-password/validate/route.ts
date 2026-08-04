import { NextRequest, NextResponse } from "next/server";
import { findValidPasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";

const RESET_PASSWORD_VALIDATE_RATE_LIMIT = { windowMs: 15 * 60 * 1000, maxRequests: 20 };

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const rateLimit = checkRateLimit(`reset-password-validate:${ip}`, RESET_PASSWORD_VALIDATE_RATE_LIMIT);

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

    const token = typeof body === "object" && body !== null ? (body as { token?: unknown }).token : undefined;

    if (typeof token !== "string" || token.length === 0) {
      return NextResponse.json(
        { error: "El enlace es inválido o ha expirado." },
        { status: 400 },
      );
    }

    const record = await findValidPasswordResetToken(token);

    if (!record) {
      return NextResponse.json(
        { error: "El enlace es inválido o ha expirado." },
        { status: 400 },
      );
    }

    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error) {
    console.error("Error al validar el enlace:", error);
    return NextResponse.json(
      { error: "Error al validar el enlace" },
      { status: 500 },
    );
  }
}
