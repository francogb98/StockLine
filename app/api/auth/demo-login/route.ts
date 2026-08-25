import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { demoUsers } from "@/lib/mock-data";
import { getOrCreateSessionStore } from "@/lib/session-store";

const DEMO_SESSION_COOKIE = "demo-session";
const DEMO_TOKEN_COOKIE = "session-token";
const SESSION_TTL_SECONDS = 60 * 60 * 6; // 6 hours

export async function POST() {
  try {
    const demoUser = demoUsers[0];
    const token = randomBytes(32).toString("base64url");
    const sessionId = `demo-${Date.now()}`;

    // Initialize in-memory session store with demo data
    getOrCreateSessionStore(sessionId);

    const cookieStore = await cookies();

    // Set the demo session cookie (stores sessionId for lookup)
    cookieStore.set(DEMO_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });

    // Also set the standard session-token cookie so middleware passes through
    cookieStore.set(DEMO_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });

    return NextResponse.json({
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        storeId: demoUser.storeId,
        isSuperAdmin: false,
        hasCompletedOnboarding: true,
        createdAt: demoUser.createdAt,
        store: {
          id: "store-1",
          name: "Kiosco Don Carlos",
          address: "Av. San Martín 1847, Lanús, Buenos Aires",
          phone: "+54 11 4234-5678",
          createdAt: new Date("2024-03-01"),
        },
      },
    });
  } catch (error) {
    console.error("Error en demo-login:", error);
    return NextResponse.json(
      { error: "Error al iniciar demo" },
      { status: 500 },
    );
  }
}
