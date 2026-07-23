import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { findStockMovements } from "@/lib/data-access";

export async function GET(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const { searchParams } = new URL(request.url);

    const movements = await findStockMovements(ctx, {
      productId: searchParams.get("productId") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    return jsonResponse(movements);
  } catch (error) {
    console.error("GET /api/stock-movements", error);
    return errorResponse("Error al obtener movimientos de stock", 500);
  }
}
