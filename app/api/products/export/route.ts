import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { isDemoSession } from "@/lib/auth-session";
import { enforceFeatureAccess } from "@/lib/subscription-service";
import { generateProductExport } from "@/lib/export/product-export-service";
import { errorResponse } from "@/lib/api-helpers";

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    if (await isDemoSession()) {
      return errorResponse("No se pueden exportar productos en modo demo", 403);
    }

    // Enforce export feature (requires Pro tier)
    const isSuperAdmin = auth.user.isSuperAdmin === true;
    const exportCheck = await enforceFeatureAccess(auth.user.storeId, "export", isSuperAdmin);
    if (!exportCheck.allowed) {
      return errorResponse(
        "La exportación a Excel requiere Plan Pro. Actualizá tu plan para acceder a esta función.",
        403,
      );
    }

    const buffer = await generateProductExport(auth.user.storeId);

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `productos_${timestamp}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("GET /api/products/export", error);
    return errorResponse("Error exportando productos", 500);
  }
}
