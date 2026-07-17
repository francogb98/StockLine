import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const { id } = await params;

    const existing = await prisma.suspendedSale.findFirst({
      where: { id, storeId: auth.user.storeId },
    });

    if (!existing) {
      return errorResponse("Venta en espera no encontrada", 404);
    }

    await prisma.suspendedSale.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("DELETE /api/suspended-sales/[id]", error);
    return errorResponse("Error al eliminar venta en espera", 500);
  }
}
