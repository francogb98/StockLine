import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import { unsuspendCompany } from "@/lib/super-admin/companies-service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  let body: { notes?: string } = {};
  try {
    body = (await req.json()) as { notes?: string };
  } catch {
    // empty body is fine
  }

  await unsuspendCompany({
    id,
    notes: body.notes ? String(body.notes) : undefined,
    adminUserId: auth.auth.user.id,
  });

  return jsonResponse({ ok: true }, 200);
}
