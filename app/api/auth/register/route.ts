import { NextRequest, NextResponse } from "next/server";
import { hashPassword, validatePassword } from "@/lib/password-utils.server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { SUBSCRIPTION_TRIAL_DAYS, addDays } from "@/lib/subscription-config";
import { checkRateLimit } from "@/lib/rate-limit";

const REGISTER_RATE_LIMIT = { windowMs: 60 * 60 * 1000, maxRequests: 5 };

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const rateLimit = checkRateLimit(`register:${ip}`, REGISTER_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiados registros desde esta IP. Intentá más tarde." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { email, password, name, storeName, storeAddress, storePhone } = body;

    // Validaciones
    if (!email || !password || !name || !storeName) {
      return NextResponse.json(
        { error: "Email, password, nombre y nombre de empresa son requeridos" },
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

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 },
      );
    }

    // Encriptar la contraseña
    const passwordHash = await hashPassword(password);

    const now = new Date();
    const trialEndsAt = addDays(now, SUBSCRIPTION_TRIAL_DAYS);

    // Crear store, usuario admin y suscripción trial en una transacción.
    const newUser = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const store = await tx.store.create({
        data: {
          name: storeName,
          address: storeAddress || "",
          phone: storePhone || "",
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
          email,
          name,
          role: "admin",
          passwordHash,
          storeId: store.id,
        },
      });
    });

    return NextResponse.json(
      { message: "Usuario y tienda creados exitosamente", user: newUser },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error registrando usuario:", error);
    return NextResponse.json(
      { error: "Error al registrar el usuario" },
      { status: 500 },
    );
  }
}
