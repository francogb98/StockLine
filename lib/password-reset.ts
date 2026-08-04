import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string): Promise<{ token: string }> {
  const { token, tokenHash } = generateResetToken();

  await cleanupExpiredPasswordResetTokens();

  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  return { token };
}

export async function findValidPasswordResetToken(
  token: string,
): Promise<{ tokenId: string; userId: string } | null> {
  const tokenHash = hashResetToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    return null;
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return {
    tokenId: record.id,
    userId: record.userId,
  };
}

export async function deletePasswordResetToken(tokenHash: string): Promise<void> {
  await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
}

export async function cleanupExpiredPasswordResetTokens(): Promise<void> {
  await prisma.passwordResetToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function revokeAllUserSessions(
  userId: string,
  client: Prisma.TransactionClient = prisma,
): Promise<void> {
  await client.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
