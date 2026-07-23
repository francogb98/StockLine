import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { findSuspendedSale, deleteSuspendedSale } from "@/lib/data-access";

export async function DELETE(
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

    const existing = await findSuspendedSale(ctx, id);
    if (!existing) {
      return errorResponse("Venta en espera no encontrada", 404);
    }

    await deleteSuspendedSale(ctx, id);
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("DELETE /api/suspended-sales/[id]", error);
    return errorResponse("Error al eliminar venta en espera", 500);
  }
}
