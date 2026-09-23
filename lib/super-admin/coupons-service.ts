import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit-service";
import { invalidateSubscriptionCache } from "@/lib/subscription-service";
import { addDays, SUBSCRIPTION_PLANS, enumToStatus } from "@/lib/subscription-config";

export class CouponError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, statusCode = 400, code = "COUPON_INVALID") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface CouponsFilters {
  q?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CouponListItem {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED" | "FREE_TRIAL";
  discountValue: number;
  durationDays: number;
  redeemedCount: number;
  maxRedemptions: number | null;
  applicablePlans: string[];
  applicableTiers: string[];
  startsAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
  createdByUserId: string;
  createdAt: Date;
  redeemedByStoreName?: string | null;
  redeemedAt?: Date | null;
}

export interface CouponsListResult {
  items: CouponListItem[];
  total: number;
  page: number;
  limit: number;
}

const DEFAULT_LIMIT = 25;

export async function listCoupons(filters: CouponsFilters): Promise<CouponsListResult> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit ?? DEFAULT_LIMIT)));
  const where: Record<string, unknown> = {};
  if (filters.q) where.code = { contains: filters.q, mode: "insensitive" };
  if (typeof filters.isActive === "boolean") where.isActive = filters.isActive;

  const [items, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      include: {
        redemptions: {
          include: { store: { select: { name: true } } },
          orderBy: { redeemedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.coupon.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      redeemedByStoreName: item.redemptions?.[0]?.store?.name ?? null,
      redeemedAt: item.redemptions?.[0]?.redeemedAt ?? null,
    })) as unknown as CouponListItem[],
    total,
    page,
    limit,
  };
}

export async function getCouponDetail(id: string) {
  return prisma.coupon.findUnique({ where: { id } });
}

export interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED" | "FREE_TRIAL";
  discountValue: number;
  durationDays?: number;
  maxRedemptions?: number | null;
  applicablePlans: string[];
  applicableTiers: string[];
  startsAt?: Date;
  expiresAt?: Date | null;
  isActive?: boolean;
  createdByUserId: string;
}

export async function createCoupon(input: CreateCouponInput) {
  const normalizedCode = input.code.trim().toUpperCase();
  const existing = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
  if (existing) {
    throw new CouponError(`Ya existe un cupón con código ${normalizedCode}`, 409, "COUPON_DUPLICATE");
  }

  if (input.discountType === "PERCENTAGE" && (input.discountValue <= 0 || input.discountValue > 100)) {
    throw new CouponError("discountValue de PERCENTAGE debe estar entre 1 y 100", 400);
  }
  if (input.discountType === "FIXED" && input.discountValue <= 0) {
    throw new CouponError("discountValue de FIXED debe ser positivo", 400);
  }
  if (input.discountType === "FREE_TRIAL") {
    if (!input.durationDays || input.durationDays <= 0 || input.durationDays > 365) {
      throw new CouponError("durationDays debe estar entre 1 y 365 para FREE_TRIAL", 400);
    }
  }

  return prisma.coupon.create({
    data: {
      code: normalizedCode,
      description: input.description ?? null,
      discountType: input.discountType,
      discountValue: input.discountType === "FREE_TRIAL" ? 0 : input.discountValue,
      durationDays: input.durationDays ?? 30,
      maxRedemptions: input.discountType === "FREE_TRIAL" ? 1 : (input.maxRedemptions ?? null),
      applicablePlans: input.applicablePlans,
      applicableTiers: input.applicableTiers ?? [],
      startsAt: input.startsAt ?? new Date(),
      expiresAt: input.expiresAt ?? null,
      isActive: input.isActive ?? true,
      createdByUserId: input.createdByUserId,
    },
  });
}

export interface UpdateCouponInput {
  description?: string | null;
  maxRedemptions?: number | null;
  applicablePlans?: string[];
  applicableTiers?: string[];
  expiresAt?: Date | null;
  isActive?: boolean;
}

export async function updateCoupon(id: string, input: UpdateCouponInput) {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new CouponError("Cupón no encontrado", 404);

  const hasRedemptions = (existing.redeemedCount ?? 0) > 0;
  if (hasRedemptions) {
    throw new CouponError("No se puede modificar un cupón con redenciones existentes", 409);
  }

  return prisma.coupon.update({
    where: { id },
    data: {
      description: input.description ?? undefined,
      maxRedemptions: input.maxRedemptions ?? undefined,
      applicablePlans: input.applicablePlans ?? undefined,
      applicableTiers: input.applicableTiers ?? undefined,
      expiresAt: input.expiresAt ?? undefined,
      isActive: input.isActive ?? undefined,
    },
  });
}

export async function toggleCoupon(id: string, isActive: boolean, adminUserId: string) {
  const updated = await prisma.coupon.update({
    where: { id },
    data: { isActive },
  });
  await recordAuditEvent({
    actorType: "SUPER_ADMIN",
    actorUserId: adminUserId,
    action: "coupon.toggle",
    targetType: "Coupon",
    targetId: id,
    metadata: { code: updated.code, isActive },
  });
  return updated;
}

export async function getRedemptions(couponId: string) {
  return prisma.couponRedemption.findMany({
    where: { couponId },
    orderBy: { redeemedAt: "desc" },
  });
}

export interface ValidateAndRedeemInput {
  code: string;
  storeId: string;
  subscriptionId: string;
  plan: "monthly" | "annual";
  tier?: "simple" | "pro";
  redeemedByUserId?: string;
}

export interface ValidateAndRedeemResult {
  discountApplied: number;
  durationDays: number;
  couponCode: string;
  newPeriodEnd: Date;
}

export async function validateAndRedeemCoupon(
  input: ValidateAndRedeemInput,
): Promise<ValidateAndRedeemResult> {
  const code = input.code.trim().toUpperCase();

  // ── Pre-validation (read-only, before transaction) ──
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) throw new CouponError(`Cupón ${code} no existe`, 404, "COUPON_NOT_FOUND");
  if (!coupon.isActive) throw new CouponError("Cupón inactivo", 400, "COUPON_INACTIVE");

  const now = new Date();
  if (coupon.startsAt > now) throw new CouponError("Cupón aún no vigente", 400);
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new CouponError("Cupón expirado", 400, "COUPON_EXPIRED");
  }
  // Fast-path: avoid entering the transaction for obviously exhausted coupons.
  // The authoritative check happens inside the transaction with FOR UPDATE.
  if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
    throw new CouponError("Cupón agotado", 400, "COUPON_EXHAUSTED");
  }
  if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(input.plan)) {
    throw new CouponError("Cupón no aplicable al plan seleccionado", 400, "COUPON_PLAN_MISMATCH");
  }
  if (coupon.applicableTiers.length > 0 && input.tier && !coupon.applicableTiers.includes(input.tier)) {
    throw new CouponError("Cupón no aplicable al tier seleccionado", 400, "COUPON_TIER_MISMATCH");
  }

  // Double redemption check (fast path — avoids entering the tx if already redeemed)
  const existing = await prisma.couponRedemption.findUnique({
    where: {
      couponId_subscriptionId: { couponId: coupon.id, subscriptionId: input.subscriptionId },
    },
  });
  if (existing) {
    throw new CouponError("Este cupón ya fue aplicado a esta suscripción", 409, "COUPON_ALREADY_REDEEMED");
  }

  // ── Calculate discount (server-authoritative, from DB coupon config) ──
  let discountApplied: number;
  if (coupon.discountType === "FREE_TRIAL") {
    discountApplied = 0;
  } else if (coupon.discountType === "PERCENTAGE") {
    const value = Number(coupon.discountValue);
    const base = input.plan === "annual"
      ? Number(SUBSCRIPTION_PLANS.annual.amountArs)
      : Number(SUBSCRIPTION_PLANS.monthly.amountArs);
    discountApplied = Number((base * (value / 100)).toFixed(2));
  } else {
    discountApplied = Number(coupon.discountValue);
  }

  // ── Atomic transaction: check-and-decrement maxRedemptions + create redemption ──
  // This prevents race conditions where N concurrent requests all pass the
  // redeemedCount check and exceed maxRedemptions.
  let newPeriodEnd: Date;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock the coupon row to prevent concurrent modifications
      const lockedCoupon = await tx.$queryRaw<Array<{ id: string; redeemedCount: number; maxRedemptions: number | null; durationDays: number }>>`
        SELECT id, redeemed_count as "redeemedCount", max_redemptions as "maxRedemptions", duration_days as "durationDays"
        FROM coupons
        WHERE id = ${coupon.id}
        FOR UPDATE
      `;

      if (!lockedCoupon.length) {
        throw new CouponError("Cupón no encontrado", 404, "COUPON_NOT_FOUND");
      }

      const c = lockedCoupon[0];
      if (c.maxRedemptions !== null && c.redeemedCount >= c.maxRedemptions) {
        throw new CouponError("Cupón agotado", 400, "COUPON_EXHAUSTED");
      }

      // Create redemption + atomically increment count
      await tx.couponRedemption.create({
        data: {
          couponId: coupon.id,
          storeId: input.storeId,
          subscriptionId: input.subscriptionId,
          redeemedByUserId: input.redeemedByUserId ?? null,
          discountApplied,
          notes: `Coupon ${coupon.code} applied to plan ${input.plan}`,
        },
      });

      await tx.coupon.update({
        where: { id: coupon.id },
        data: { redeemedCount: { increment: 1 } },
      });

      // Extend subscription within the same transaction
      // Use the real subscription period end, not a hardcoded fallback
      const subscription = await tx.subscription.findUnique({
        where: { storeId: input.storeId },
      });

      let computedPeriodEnd: Date;
      if (subscription) {
        const appStatus = enumToStatus[subscription.status] ?? "past_due";
        const baseEnd =
          appStatus === "trial" && subscription.trialEndsAt && subscription.trialEndsAt > now
            ? subscription.trialEndsAt
            : subscription.currentPeriodEnd;
        computedPeriodEnd = addDays(baseEnd, coupon.durationDays);

        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodEnd: computedPeriodEnd,
            adminNotes: [
              subscription.adminNotes ?? null,
              `[coupon:${coupon.code}] +${coupon.durationDays}d`,
            ]
              .filter(Boolean)
              .join("\n") || null,
          },
        });
      } else {
        // No subscription yet — compute from now
        computedPeriodEnd = addDays(now, coupon.durationDays);
      }

      return { computedPeriodEnd };
    });

    newPeriodEnd = result.computedPeriodEnd;
  } catch (e: any) {
    if (e instanceof CouponError) throw e;
    if (e?.code === "P2002") {
      throw new CouponError("Este cupón ya fue aplicado a esta suscripción", 409, "COUPON_ALREADY_REDEEMED");
    }
    throw e;
  }

  // Invalidate cache after transaction commits
  invalidateSubscriptionCache(input.storeId);

  await recordAuditEvent({
    actorType: "STORE_USER",
    actorUserId: input.redeemedByUserId ?? null,
    storeId: input.storeId,
    action: "coupon.redeem",
    targetType: "Coupon",
    targetId: coupon.id,
    metadata: { code: coupon.code, plan: input.plan, discountApplied, subscriptionId: input.subscriptionId },
  });

  return { discountApplied, durationDays: coupon.durationDays, couponCode: coupon.code, newPeriodEnd };
}
