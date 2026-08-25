import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  createCoupon,
  listCoupons,
  CouponError,
} from "@/lib/super-admin/coupons-service";
import { generateUniqueCouponCode } from "@/lib/super-admin/coupon-code-generator";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if ("response" in auth) return auth.response;

    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const isActiveRaw = url.searchParams.get("isActive");
    const isActive = isActiveRaw === "true" ? true : isActiveRaw === "false" ? false : undefined;

    const pageRaw = url.searchParams.get("page");
    const limitRaw = url.searchParams.get("limit");
    const page = pageRaw && Number.isFinite(Number.parseInt(pageRaw, 10)) ? Number.parseInt(pageRaw, 10) : undefined;
    const limit = limitRaw && Number.isFinite(Number.parseInt(limitRaw, 10)) ? Number.parseInt(limitRaw, 10) : undefined;

    const result = await listCoupons({ q, isActive, page, limit });
    return jsonResponse(result, 200);
  } catch (error) {
    console.error("GET /api/super-admin/coupons", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body inválido", 400);
  }

  try {
    const discountType = body?.discountType === "FIXED"
      ? "FIXED"
      : body?.discountType === "FREE_TRIAL"
        ? "FREE_TRIAL"
        : "PERCENTAGE";

    let code = String(body?.code ?? "").trim();
    if (!code && body?.generateCode) {
      const durationDays = Number(body?.durationDays ?? 30);
      code = await generateUniqueCouponCode(durationDays);
    }

    if (!code) {
      return errorResponse("El código es requerido", 400);
    }

    const coupon = await createCoupon({
      code,
      description: body?.description ? String(body.description) : undefined,
      discountType,
      discountValue: Number(body?.discountValue ?? 0),
      durationDays: body?.durationDays ? Number(body.durationDays) : undefined,
      maxRedemptions: body?.maxRedemptions === null ? null : body?.maxRedemptions !== undefined ? Number(body.maxRedemptions) : undefined,
      applicablePlans: Array.isArray(body?.applicablePlans) ? (body.applicablePlans as unknown[]).map(String) : [],
      startsAt: body?.startsAt ? new Date(String(body.startsAt)) : undefined,
      expiresAt: body?.expiresAt === null ? null : body?.expiresAt ? new Date(String(body.expiresAt)) : undefined,
      isActive: body?.isActive === undefined ? true : Boolean(body.isActive),
      createdByUserId: auth.auth.user.id,
    });
    return jsonResponse(coupon, 201);
  } catch (e) {
    if (e instanceof CouponError) return errorResponse(e.message, e.statusCode);
    throw e;
  }
}
