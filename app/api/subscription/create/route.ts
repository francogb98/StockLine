import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/api-auth";
import {
  SUBSCRIPTION_PLANS,
  isSubscriptionPlan,
  addDays,
} from "@/lib/subscription-config";
import { createMercadoPagoPreapproval } from "@/lib/mercadopago";
import { recordAuditEvent, extractAuditContext } from "@/lib/audit-service";
import {
  validateAndRedeemCoupon,
  CouponError,
} from "@/lib/super-admin/coupons-service";
import { reportError } from "@/lib/error-reporter";

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("subscription:manage");
    if ("response" in auth) {
      return auth.response;
    }

    const currentUser = auth.auth.user;

    const body = await req.json();
    const planRaw = String(body?.plan ?? "");

    if (!isSubscriptionPlan(planRaw)) {
      return errorResponse("Plan inválido. Debe ser monthly o annual", 400);
    }

    const plan = planRaw;
    const planConfig = SUBSCRIPTION_PLANS[plan];

    const preapproval = await createMercadoPagoPreapproval({
      plan,
      payerEmail: currentUser.email,
      externalReference: currentUser.storeId,
    });

    const now = new Date();
    let currentPeriodEnd = addDays(now, planConfig.intervalDays);

    let couponResult: { discountApplied: number; couponCode: string } | null = null;
    const couponCode = body?.couponCode ? String(body.couponCode) : null;
    if (couponCode) {
      try {
        const sub = await prisma.subscription.findUnique({
          where: { storeId: currentUser.storeId },
          select: { id: true },
        });
        const subscriptionIdForCoupon =
          sub?.id ?? `pending-${currentUser.storeId}-${Date.now()}`;
        const result = await validateAndRedeemCoupon({
          code: couponCode,
          storeId: currentUser.storeId,
          subscriptionId: subscriptionIdForCoupon,
          plan,
          redeemedByUserId: currentUser.id,
        });
        currentPeriodEnd = result.newPeriodEnd;
        couponResult = { discountApplied: result.discountApplied, couponCode };
      } catch (e) {
        if (e instanceof CouponError) {
          return errorResponse(e.message, e.statusCode);
        }
        throw e;
      }
    }

    await prisma.subscription.upsert({
      where: { storeId: currentUser.storeId },
      create: {
        storeId: currentUser.storeId,
        status: "trial",
        plan,
        currentPeriodStart: now,
        currentPeriodEnd,
        mercadoPagoPreapprovalId: preapproval.id,
      },
      update: {
        plan,
        currentPeriodStart: now,
        currentPeriodEnd,
        mercadoPagoPreapprovalId: preapproval.id,
      },
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    void recordAuditEvent({
      actorType: "STORE_USER",
      actorUserId: currentUser.id,
      storeId: currentUser.storeId,
      action: "subscription.preapproval_created",
      targetType: "Subscription",
      targetId: preapproval.id,
      metadata: { plan, preapprovalId: preapproval.id },
      ipAddress,
      userAgent,
    }).catch(() => {});

    return jsonResponse(
      {
        plan,
        amountArs: planConfig.amountArs,
        preapprovalId: preapproval.id,
        initPoint: preapproval.initPoint,
        sandboxInitPoint: preapproval.sandboxInitPoint,
        coupon: couponResult,
      },
      201,
    );
  } catch (error) {
    console.error("POST /api/subscription/create", error);
    const err = error instanceof Error ? error : new Error(String(error));
    void reportError({
      source: "API",
      severity: "ERROR",
      message: err.message || "POST /api/subscription/create failed",
      stack: err.stack,
      method: "POST",
      path: "/api/subscription/create",
      statusCode: 500,
    }).catch(() => {});
    return errorResponse("Error creando la suscripción", 500);
  }
}
