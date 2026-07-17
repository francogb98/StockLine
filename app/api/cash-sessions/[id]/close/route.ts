import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const { closingAmount, notes } = await request.json();

    if (typeof closingAmount !== "number" || !Number.isFinite(closingAmount) || closingAmount < 0) {
      return errorResponse("El monto de cierre debe ser un número válido", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.findFirst({
        where: { id, storeId: auth.user.storeId },
      });

      if (!session) {
        throw new Error("NOT_FOUND");
      }

      if (session.closedAt) {
        throw new Error("ALREADY_CLOSED");
      }

      if (auth.user.role !== "admin" && session.userId !== auth.user.id) {
        throw new Error("FORBIDDEN");
      }

      const cashSales = await tx.sale.aggregate({
        where: {
          cashSessionId: id,
          paymentMethod: "cash",
          status: "completed",
        },
        _sum: { total: true },
      });

      const total = cashSales._sum.total ? Number(cashSales._sum.total) : 0;
      const expectedAmount = Number(session.openingAmount) + total;
      const difference = closingAmount - expectedAmount;

      return tx.cashSession.update({
        where: { id },
        data: {
          expectedAmount,
          closingAmount,
          difference,
          notes: notes ?? null,
          closedAt: new Date(),
        },
        include: {
          user: { select: { name: true } },
          _count: { select: { sales: true } },
        },
      });
    });

    return jsonResponse({
      id: updated.id,
      storeId: updated.storeId,
      userId: updated.userId,
      userName: updated.user.name,
      openingAmount: updated.openingAmount,
      expectedAmount: updated.expectedAmount,
      closingAmount: updated.closingAmount,
      difference: updated.difference,
      notes: updated.notes,
      closedAt: updated.closedAt,
      createdAt: updated.createdAt,
      salesCount: updated._count.sales,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return errorResponse("Sesión de caja no encontrada", 404);
      }
      if (error.message === "ALREADY_CLOSED") {
        return errorResponse("Esta sesión de caja ya está cerrada", 409);
      }
      if (error.message === "FORBIDDEN") {
        return errorResponse("Solo podés cerrar tus propias sesiones de caja", 403);
      }
    }
    console.error("POST /api/cash-sessions/[id]/close", error);
    return errorResponse("Error al cerrar sesión de caja", 500);
  }
}
