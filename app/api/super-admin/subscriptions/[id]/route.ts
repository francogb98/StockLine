import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import { getSubscriptionDetail } from "@/lib/super-admin/subscriptions-service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin();
    if ("response" in auth) return auth.response;

    const { id } = await ctx.params;
    const detail = await getSubscriptionDetail(id);
    if (!detail) return errorResponse("Subscription no encontrada", 404);
    return jsonResponse(detail, 200);
  } catch (error) {
    console.error("GET /api/super-admin/subscriptions/[id]", error);
    return errorResponse("Error interno del servidor", 500);
  }
}
