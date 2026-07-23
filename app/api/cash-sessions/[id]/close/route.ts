import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { findCashSession, closeCashSession } from "@/lib/data-access";

export async function POST(
  request: Request,
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
    const { closingAmount, notes } = await request.json();

    if (typeof closingAmount !== "number" || !Number.isFinite(closingAmount) || closingAmount < 0) {
      return errorResponse("El monto de cierre debe ser un número válido", 400);
    }

    const session = await findCashSession(ctx, id);
    if (!session) return errorResponse("Sesión de caja no encontrada", 404);
    if (session.closedAt) return errorResponse("Esta sesión de caja ya está cerrada", 409);
    if (auth.user.role !== "admin" && session.userId !== auth.user.id) {
      return errorResponse("Solo podés cerrar tus propias sesiones de caja", 403);
    }

    const updated = await closeCashSession(ctx, id, {
      closingAmount,
      notes: notes ?? null,
    });

    return jsonResponse({
      id: updated.id,
      storeId: updated.storeId,
      userId: updated.userId,
      userName: updated.userName ?? null,
      openingAmount: updated.openingAmount,
      expectedAmount: updated.expectedAmount,
      closingAmount: updated.closingAmount,
      difference: updated.difference,
      notes: updated.notes,
      closedAt: updated.closedAt,
      createdAt: updated.createdAt,
      salesCount: 0,
    });
  } catch (error) {
    console.error("POST /api/cash-sessions/[id]/close", error);
    return errorResponse("Error al cerrar sesión de caja", 500);
  }
}
