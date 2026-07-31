import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  setSessionCookie,
  invalidateCurrentSession,
} from "@/lib/auth-session";
import { SUBSCRIPTION_TRIAL_DAYS, addDays } from "@/lib/subscription-config";
import { checkRateLimit } from "@/lib/rate-limit";

const GOOGLE_RATE_LIMIT = { windowMs: 15 * 60 * 1000, maxRequests: 10 };

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const rateLimit = checkRateLimit(`google:${ip}`, GOOGLE_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intentá de nuevo en unos minutos." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token requerido" },
        { status: 400 },
      );
    }

    const userInfoRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
    );

    if (!userInfoRes.ok) {
      return NextResponse.json(
        { error: "Token de Google inválido o expirado" },
        { status: 401 },
      );
    }

    const userInfo: { email: string; name: string; picture?: string } =
      await userInfoRes.json();

    if (!userInfo.email) {
      return NextResponse.json(
        { error: "No se pudo obtener el email de la cuenta de Google" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: userInfo.email },
      include: { store: true },
    });

    if (existingUser) {
      await invalidateCurrentSession();
      const session = await createSession(existingUser.id);
      await setSessionCookie(session.token);

      const { passwordHash, ...userWithoutPassword } = existingUser;
      return NextResponse.json({
        message: "Login exitoso",
        user: userWithoutPassword,
        isNewUser: false,
      });
    }

    const now = new Date();
    const trialEndsAt = addDays(now, SUBSCRIPTION_TRIAL_DAYS);

    const newUser = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: `Tienda de ${userInfo.name || userInfo.email.split("@")[0]}`,
          address: "",
          phone: "",
        },
      });

      await tx.subscription.create({
        data: {
          storeId: store.id,
          status: "trial",
          plan: "monthly",
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
          trialEndsAt,
        },
      });

      return tx.user.create({
        data: {
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split("@")[0],
          role: "admin",
          passwordHash: "",
          storeId: store.id,
        },
        include: { store: true },
      });
    });

    await invalidateCurrentSession();
    const session = await createSession(newUser.id);
    await setSessionCookie(session.token);

    return NextResponse.json({
      message: "Usuario creado exitosamente",
      user: newUser,
      isNewUser: true,
    });
  } catch (error) {
    console.error("Error en autenticación con Google:", error);
    return NextResponse.json(
      { error: "Error al autenticar con Google" },
      { status: 500 },
    );
  }
}
