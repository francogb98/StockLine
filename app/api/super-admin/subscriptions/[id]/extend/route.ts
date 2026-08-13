import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  extendSubscription,
  AdminSubscriptionError,
} from "@/lib/super-admin/subscriptions-service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;

  let body: { storeId?: string; extraDays?: number; reason?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const storeId = String(body?.storeId ?? "");
  if (!storeId) return errorResponse("storeId requerido", 400);

  const extraDays = Number(body?.extraDays);
  if (!Number.isFinite(extraDays) || extraDays <= 0 || extraDays > 365) {
    return errorResponse("extraDays debe estar entre 1 y 365", 400);
  }

  const reason = String(body?.reason ?? "");
  if (!reason) return errorResponse("reason requerido", 400);

  try {
    const updated = await extendSubscription({
      storeId,
      adminUserId: auth.auth.user.id,
      extraDays,
      reason,
      notes: body.notes ? String(body.notes) : undefined,
    });
    return jsonResponse({ ok: true, subscription: { id: updated.id, currentPeriodEnd: updated.currentPeriodEnd } }, 200);
  } catch (e) {
    if (e instanceof AdminSubscriptionError) {
      return errorResponse(e.message, e.statusCode);
    }
    throw e;
  }
}
