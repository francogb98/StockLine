import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import { markResolved } from "@/lib/super-admin/errors-service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  let body: { notes?: string };
  try {
    body = (await req.json()) as { notes?: string };
  } catch {
    body = {};
  }

  try {
    const updated = await markResolved({
      id,
      adminUserId: auth.auth.user.id,
      notes: body.notes ? String(body.notes) : undefined,
    });
    return jsonResponse(updated, 200);
  } catch (e) {
    if (e instanceof Error && /Record to update not found/i.test(e.message)) {
      return errorResponse("Error no encontrado", 404);
    }
    throw e;
  }
}
