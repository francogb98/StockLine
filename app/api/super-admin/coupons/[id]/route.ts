import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  getCouponDetail,
  updateCoupon,
  CouponError,
} from "@/lib/super-admin/coupons-service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  const coupon = await getCouponDetail(id);
  if (!coupon) return errorResponse("Cupón no encontrado", 404);
  return jsonResponse(coupon, 200);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body inválido", 400);
  }

  try {
    const updated = await updateCoupon(id, {
      description: body.description === null ? null : body.description !== undefined ? String(body.description) : undefined,
      maxRedemptions:
        body.maxRedemptions === null ? null : body.maxRedemptions !== undefined ? Number(body.maxRedemptions) : undefined,
      applicablePlans: Array.isArray(body.applicablePlans) ? (body.applicablePlans as unknown[]).map(String) : undefined,
      expiresAt:
        body.expiresAt === null ? null : body.expiresAt ? new Date(String(body.expiresAt)) : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    });
    return jsonResponse(updated, 200);
  } catch (e) {
    if (e instanceof CouponError) return errorResponse(e.message, e.statusCode);
    throw e;
  }
}
