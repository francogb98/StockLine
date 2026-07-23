import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isTestUserEmail } from "@/lib/test-users";
import {
  getOrCreateSessionStore,
  destroySessionStore,
  cleanupExpiredSessionStores,
} from "@/lib/session-store";

let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 min

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  storeId: string;
}

export interface AuthenticatedSession {
  sessionId: string;
  user: SessionUser;
}

const SESSION_COOKIE_NAME = "session-token";
const SESSION_TTL_SECONDS = 60 * 60 * 6; // 6 hours

function getTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const tokenHash = getTokenHash(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
    select: {
      id: true,
    },
  });

  return {
    token,
    sessionId: session.id,
  };
}

async function getSessionTokenFromCookie() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie) {
    return null;
  }

  const token = sessionCookie.value?.trim();
  if (!token) {
    return null;
  }

  return token;
}

export async function invalidateSessionToken(token: string) {
  const tokenHash = getTokenHash(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: { id: true },
  });

  await prisma.session.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  if (session) {
    destroySessionStore(session.id);
  }
}

export async function invalidateCurrentSession() {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    await clearSessionCookie();
    return;
  }

  await invalidateSessionToken(token);
  await clearSessionCookie();
}

export async function getAuthenticatedSession(): Promise<AuthenticatedSession | null> {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    const activeSessions = await prisma.session.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    cleanupExpiredSessionStores(new Set(activeSessions.map((s) => s.id)));
  }

  const token = await getSessionTokenFromCookie();
  if (!token) {
    return null;
  }

  const tokenHash = getTokenHash(token);
  const session = await prisma.session.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          storeId: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.revokedAt) {
    await clearSessionCookie();
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    destroySessionStore(session.id);
    await clearSessionCookie();
    return null;
  }

  return {
    sessionId: session.id,
    user: session.user,
  };
}

export async function getSessionUser() {
  const authSession = await getAuthenticatedSession();
  return authSession?.user ?? null;
}
