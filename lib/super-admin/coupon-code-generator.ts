import { prisma } from "@/lib/prisma";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SUFFIX_LENGTH = 5;
const MAX_RETRIES = 5;

function randomSuffix(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

function durationLabel(days: number): string {
  if (days % 30 === 0 && days >= 30) {
    return `${days / 30}M`;
  }
  if (days % 7 === 0) {
    return `${days / 7}D`;
  }
  return `${days}D`;
}

export async function generateUniqueCouponCode(
  durationDays: number,
): Promise<string> {
  const label = durationLabel(durationDays);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = `PRUEBA-${label}-${randomSuffix(SUFFIX_LENGTH)}`;
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (!existing) {
      return code;
    }
  }

  throw new Error(
    "No se pudo generar un código único después de varios intentos",
  );
}
