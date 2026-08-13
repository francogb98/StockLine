import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import { getDashboardBundle } from "@/lib/super-admin/dashboard-service";

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const raw = url.searchParams.get("days");
  const parsed = raw ? Number.parseInt(raw, 10) : 30;
  const days = Number.isFinite(parsed) ? Math.min(365, Math.max(7, parsed)) : 30;

  try {
    const bundle = await getDashboardBundle(days);
    return jsonResponse(bundle, 200);
  } catch (error) {
    console.error("GET /api/super-admin/dashboard/metrics", error);
    return errorResponse("Error cargando métricas", 500);
  }
}
