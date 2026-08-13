import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  reactivateSubscription,
  AdminSubscriptionError,
} from "@/lib/super-admin/subscriptions-service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;

  let body: { storeId?: string; notes?: string } = {};
  try {
    body = (await req.json()) as { storeId?: string; notes?: string };
  } catch {
    // empty body OK
  }

  const storeId = String(body?.storeId ?? "");
  if (!storeId) return errorResponse("storeId requerido", 400);

  try {
    const updated = await reactivateSubscription({
      storeId,
      adminUserId: auth.auth.user.id,
      notes: body.notes ? String(body.notes) : undefined,
    });
    return jsonResponse({ ok: true, subscription: { id: updated.id, status: updated.status } }, 200);
  } catch (e) {
    if (e instanceof AdminSubscriptionError) {
      return errorResponse(e.message, e.statusCode);
    }
    throw e;
  }
}
