import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/api-auth";
import {
  validateAndRedeemCoupon,
  CouponError,
} from "@/lib/super-admin/coupons-service";
import { getOrCreateSubscription } from "@/lib/subscription-service";
import { recordAuditEvent, extractAuditContext } from "@/lib/audit-service";
import { reportError } from "@/lib/error-reporter";

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("subscription:manage");
    if ("response" in auth) {
      return auth.response;
    }

    const currentUser = auth.auth.user;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Body inválido", 400);
    }

    const code = body?.code ? String(body.code).trim() : "";
    if (!code) {
      return errorResponse("El código es requerido", 400);
    }

    const subscription = await getOrCreateSubscription(currentUser.storeId);

    const result = await validateAndRedeemCoupon({
      code,
      storeId: currentUser.storeId,
      subscriptionId: subscription.id,
      plan: subscription.plan as "monthly" | "annual",
      redeemedByUserId: currentUser.id,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    void recordAuditEvent({
      actorType: "STORE_USER",
      actorUserId: currentUser.id,
      storeId: currentUser.storeId,
      action: "coupon.redeem_by_admin",
      targetType: "Coupon",
      metadata: { code: result.couponCode, daysAdded: result.durationDays },
      ipAddress,
      userAgent,
    }).catch(() => {});

    return jsonResponse({
      success: true,
      message: `Código aplicado correctamente. Tu suscripción fue extendida por ${result.durationDays} días.`,
      daysAdded: result.durationDays,
      newPeriodEnd: result.newPeriodEnd,
    });
  } catch (error) {
    if (error instanceof CouponError) {
      const messages: Record<string, string> = {
        COUPON_NOT_FOUND: "El código ingresado no es válido",
        COUPON_INACTIVE: "Este código no está disponible",
        COUPON_EXPIRED: "Este código promocional está vencido",
        COUPON_EXHAUSTED: "Este código ya fue utilizado",
        COUPON_ALREADY_REDEEMED: "Este código ya fue utilizado",
      };
      return errorResponse(
        messages[error.code] || error.message,
        error.statusCode,
      );
    }

    console.error("POST /api/subscription/redeem-coupon", error);
    const err = error instanceof Error ? error : new Error(String(error));
    void reportError({
      source: "API",
      severity: "ERROR",
      message: err.message || "POST /api/subscription/redeem-coupon failed",
      stack: err.stack,
      method: "POST",
      path: "/api/subscription/redeem-coupon",
      statusCode: 500,
    }).catch(() => {});
    return errorResponse("No pudimos aplicar el código. Intentá nuevamente.", 500);
  }
}
