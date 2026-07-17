import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password-utils.server";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  invalidateCurrentSession,
  setSessionCookie,
} from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";

const LOGIN_RATE_LIMIT = { windowMs: 15 * 60 * 1000, maxRequests: 10 };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 },
      );
    }

    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const rateKey = `login:${ip}:${email}`;
    const rateLimit = checkRateLimit(rateKey, LOGIN_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intentá de nuevo en unos minutos." },
        { status: 429 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        store: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    await invalidateCurrentSession();
    const session = await createSession(user.id);
    await setSessionCookie(session.token);

    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json(
      { message: "Login exitoso", user: userWithoutPassword },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error iniciando sesión:", error);
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 },
    );
  }
}
