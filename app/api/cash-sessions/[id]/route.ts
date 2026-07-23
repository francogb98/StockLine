import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { findCashSession, findSales } from "@/lib/data-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const { id } = await params;

    const session = await findCashSession(ctx, id);
    if (!session) {
      return errorResponse("Sesión de caja no encontrada", 404);
    }

    const allSales = await findSales(ctx);
    const sessionSales = allSales.filter(
      (s) => s.cashSessionId === id && s.status === "completed",
    );

    const cashTotal = sessionSales
      .filter((s) => s.paymentMethod === "cash")
      .reduce((sum, s) => sum + Number(s.total), 0);

    const cardTotal = sessionSales
      .filter((s) => s.paymentMethod === "card")
      .reduce((sum, s) => sum + Number(s.total), 0);

    const transferTotal = sessionSales
      .filter((s) => s.paymentMethod === "transfer")
      .reduce((sum, s) => sum + Number(s.total), 0);

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
      sales: sessionSales.map((s) => ({
        ...s,
        userName: auth.user.name,
      })),
      cashTotal,
      cardTotal,
      transferTotal,
      total: cashTotal + cardTotal + transferTotal,
    });
  } catch (error) {
    console.error("GET /api/cash-sessions/[id]", error);
    return errorResponse("Error al obtener sesión de caja", 500);
  }
}
