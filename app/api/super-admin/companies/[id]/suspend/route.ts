import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import { suspendCompany } from "@/lib/super-admin/companies-service";

const VALID_REASONS = new Set(["MANUAL_ADMIN", "PAYMENT_FRAUD", "POLICY_VIOLATION", "OTHER"]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin();
    if ("response" in auth) return auth.response;

    const { id } = await ctx.params;
    let body: { reason?: string; notes?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Body inválido", 400);
    }

    const reason = String(body?.reason ?? "");
    if (!VALID_REASONS.has(reason)) {
      return errorResponse("Reason inválido. Debe ser uno de: MANUAL_ADMIN, PAYMENT_FRAUD, POLICY_VIOLATION, OTHER", 400);
    }
    const notes = body?.notes ? String(body.notes) : undefined;

    await suspendCompany({
      id,
      reason,
      notes,
      adminUserId: auth.auth.user.id,
    });

    return jsonResponse({ ok: true, suspendedAt: new Date().toISOString() }, 200);
  } catch (error) {
    console.error("POST /api/super-admin/companies/[id]/suspend", error);
    return errorResponse("Error interno del servidor", 500);
  }
}
