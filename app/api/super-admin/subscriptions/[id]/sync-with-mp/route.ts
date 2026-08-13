import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import { forceSync } from "@/lib/super-admin/subscriptions-service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  let body: { storeId?: string } = {};
  try {
    body = (await req.json()) as { storeId?: string };
  } catch {
    // empty body OK
  }

  const storeId = String(body?.storeId ?? "");
  if (!storeId) return errorResponse("storeId requerido", 400);

  try {
    const snapshot = await forceSync({
      storeId,
      adminUserId: auth.auth.user.id,
    });
    return jsonResponse({ ok: true, snapshot }, 200);
  } catch (e) {
    if (e instanceof Error) {
      return errorResponse(e.message, 500);
    }
    throw e;
  }
}
