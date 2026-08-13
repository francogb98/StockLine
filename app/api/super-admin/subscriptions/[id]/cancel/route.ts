import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  cancelSubscription,
  AdminSubscriptionError,
} from "@/lib/super-admin/subscriptions-service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;

  let body: { storeId?: string; reason?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const storeId = String(body?.storeId ?? "");
  if (!storeId) return errorResponse("storeId requerido", 400);
  const reason = String(body?.reason ?? "");
  if (!reason) return errorResponse("reason requerido", 400);
  const notes = body?.notes ? String(body.notes) : undefined;

  try {
    const updated = await cancelSubscription({
      storeId,
      adminUserId: auth.auth.user.id,
      reason,
      notes,
    });
    return jsonResponse({ ok: true, subscription: { id: updated.id, status: updated.status } }, 200);
  } catch (e) {
    if (e instanceof AdminSubscriptionError) {
      return errorResponse(e.message, e.statusCode);
    }
    throw e;
  }
}
