import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const session = await prisma.cashSession.findFirst({
      where: { storeId: auth.user.storeId, closedAt: null },
      include: {
        user: { select: { name: true } },
        _count: { select: { sales: { where: { status: "completed" } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      return jsonResponse(null);
    }

    const cashSales = await prisma.sale.aggregate({
      where: {
        cashSessionId: session.id,
        paymentMethod: "cash",
        status: "completed",
      },
      _sum: { total: true },
    });

    const allSales = await prisma.sale.aggregate({
      where: { cashSessionId: session.id, status: "completed" },
      _sum: { total: true },
      _count: true,
    });

    return jsonResponse({
      id: session.id,
      storeId: session.storeId,
      userId: session.userId,
      userName: session.user.name,
      openingAmount: session.openingAmount,
      expectedAmount: session.expectedAmount,
      closingAmount: session.closingAmount,
      difference: session.difference,
      notes: session.notes,
      closedAt: session.closedAt,
      createdAt: session.createdAt,
      salesCount: session._count.sales,
      currentCashTotal: cashSales._sum.total ?? 0,
      currentTotal: allSales._sum.total ?? 0,
    });
  } catch (error) {
    console.error("GET /api/cash-sessions/current", error);
    return errorResponse("Error al obtener sesión actual", 500);
  }
}
