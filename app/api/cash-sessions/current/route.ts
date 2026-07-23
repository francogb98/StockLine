import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import {
  findOpenCashSession,
  aggregateSales,
  countSales,
} from "@/lib/data-access";

export async function GET() {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const session = await findOpenCashSession(ctx);
    if (!session) return jsonResponse(null);

    const [cashSales, allSales, completedCount] = await Promise.all([
      aggregateSales(ctx, {
        cashSessionId: session.id,
        paymentMethod: "cash",
        status: "completed",
      }),
      aggregateSales(ctx, {
        cashSessionId: session.id,
        status: "completed",
      }),
      countSales(ctx, {
        cashSessionId: session.id,
        status: "completed",
      }),
    ]);

    return jsonResponse({
      id: session.id,
      storeId: session.storeId,
      userId: session.userId,
      userName: session.userName ?? null,
      openingAmount: session.openingAmount,
      expectedAmount: session.expectedAmount,
      closingAmount: session.closingAmount,
      difference: session.difference,
      notes: session.notes,
      closedAt: session.closedAt,
      createdAt: session.createdAt,
      salesCount: completedCount,
      currentCashTotal: cashSales.total ?? 0,
      currentTotal: allSales.total ?? 0,
    });
  } catch (error) {
    console.error("GET /api/cash-sessions/current", error);
    return errorResponse("Error al obtener sesión actual", 500);
  }
}
