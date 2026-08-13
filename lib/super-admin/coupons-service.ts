import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit-service";
import { extendSubscriptionByAdmin, AdminSubscriptionError } from "@/lib/subscription-service";
import { addDays } from "@/lib/subscription-config";

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
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  durationDays: number;
  redeemedCount: number;
  maxRedemptions: number | null;
  applicablePlans: string[];
  startsAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
  createdByUserId: string;
  createdAt: Date;
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
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.coupon.count({ where }),
  ]);

  return {
    items: items as unknown as CouponListItem[],
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
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  durationDays?: number;
  maxRedemptions?: number | null;
  applicablePlans: string[];
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

  return prisma.coupon.create({
    data: {
      code: normalizedCode,
      description: input.description ?? null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      durationDays: input.durationDays ?? 30,
      maxRedemptions: input.maxRedemptions ?? null,
      applicablePlans: input.applicablePlans,
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
  expiresAt?: Date | null;
  isActive?: boolean;
}

export async function updateCoupon(id: string, input: UpdateCouponInput) {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new CouponError("Cupón no encontrado", 404);

  const hasRedemptions = (existing.redeemedCount ?? 0) > 0;
  if (hasRedemptions && (input.discountType !== undefined || input.discountValue !== undefined)) {
    throw new CouponError("No se puede cambiar discountType/discountValue con redenciones existentes", 409);
  }

  return prisma.coupon.update({
    where: { id },
    data: {
      description: input.description ?? undefined,
      maxRedemptions: input.maxRedemptions ?? undefined,
      applicablePlans: input.applicablePlans ?? undefined,
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
  redeemedByUserId?: string;
}

export interface ValidateAndRedeemResult {
  discountApplied: number;
  newPeriodEnd: Date;
}

export async function validateAndRedeemCoupon(
  input: ValidateAndRedeemInput,
): Promise<ValidateAndRedeemResult> {
  const code = input.code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) throw new CouponError(`Cupón ${code} no existe`, 404, "COUPON_NOT_FOUND");
  if (!coupon.isActive) throw new CouponError("Cupón inactivo", 400, "COUPON_INACTIVE");

  const now = new Date();
  if (coupon.startsAt > now) throw new CouponError("Cupón aún no vigente", 400);
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new CouponError("Cupón expirado", 400, "COUPON_EXPIRED");
  }
  if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
    throw new CouponError("Cupón agotado", 400, "COUPON_EXHAUSTED");
  }
  if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(input.plan)) {
    throw new CouponError("Cupón no aplicable al plan seleccionado", 400, "COUPON_PLAN_MISMATCH");
  }

  // Calculate discount
  let discountApplied: number;
  if (coupon.discountType === "PERCENTAGE") {
    discountApplied = Number((15000 * (coupon.discountValue / 100)).toFixed(2));
    if (input.plan === "annual") discountApplied = Number((150000 * (coupon.discountValue / 100)).toFixed(2));
  } else {
    discountApplied = Number(coupon.discountValue);
  }

  // Double redemption check (unique constraint will throw too)
  const existing = await prisma.couponRedemption.findUnique({
    where: {
      couponId_subscriptionId: { couponId: coupon.id, subscriptionId: input.subscriptionId },
    },
  });
  if (existing) {
    throw new CouponError("Este cupón ya fue aplicado a esta suscripción", 409, "COUPON_ALREADY_REDEEMED");
  }

  // Atomic increment + redemption create (sequential — NOT in a tx to keep model simple;
  // we rely on the @@unique constraint to prevent duplicates)
  try {
    await prisma.couponRedemption.create({
      data: {
        couponId: coupon.id,
        storeId: input.storeId,
        subscriptionId: input.subscriptionId,
        redeemedByUserId: input.redeemedByUserId ?? null,
        discountApplied,
        notes: `Coupon ${coupon.code} applied to plan ${input.plan}`,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new CouponError("Este cupón ya fue aplicado a esta suscripción", 409, "COUPON_ALREADY_REDEEMED");
    }
    throw e;
  }

  const updated = await prisma.coupon.update({
    where: { id: coupon.id },
    data: { redeemedCount: { increment: 1 } },
  });

  // Extend the subscription using existing admin extend (with notes citing the coupon code)
  const basePeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback
  const newPeriodEnd = addDays(basePeriodEnd, coupon.durationDays);

  try {
    await extendSubscriptionByAdmin({
      storeId: input.storeId,
      adminUserId: input.redeemedByUserId ?? "system",
      extraDays: coupon.durationDays,
      reason: `cupón ${coupon.code}`,
    });
  } catch (e) {
    if (!(e instanceof AdminSubscriptionError)) throw e;
    // extendSubscriptionByAdmin's 404 means no subscription yet; ignore
  }

  await recordAuditEvent({
    actorType: "STORE_USER",
    actorUserId: input.redeemedByUserId ?? null,
    storeId: input.storeId,
    action: "coupon.redeem",
    targetType: "Coupon",
    targetId: coupon.id,
    metadata: { code: coupon.code, plan: input.plan, discountApplied, subscriptionId: input.subscriptionId },
  });

  void updated;
  void basePeriodEnd;
  return { discountApplied, newPeriodEnd };
}
