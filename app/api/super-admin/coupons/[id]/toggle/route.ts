import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import { toggleCoupon } from "@/lib/super-admin/coupons-service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  let body: { isActive?: boolean };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body inválido", 400);
  }

  if (typeof body?.isActive !== "boolean") {
    return errorResponse("isActive debe ser boolean", 400);
  }

  const updated = await toggleCoupon(id, body.isActive, auth.auth.user.id);
  return jsonResponse(updated, 200);
}
