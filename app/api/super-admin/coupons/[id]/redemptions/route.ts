import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import { getRedemptions } from "@/lib/super-admin/coupons-service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin();
    if ("response" in auth) return auth.response;

    const { id } = await ctx.params;
    const redemptions = await getRedemptions(id);
    return jsonResponse({ items: redemptions }, 200);
  } catch (error) {
    console.error("GET /api/super-admin/coupons/[id]/redemptions", error);
    return errorResponse("Error interno del servidor", 500);
  }
}
