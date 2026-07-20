import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedSession } from "@/lib/api-auth";

// GET - Obtener el usuario autenticado actualmente
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedSession();
    if ("response" in auth) {
      return auth.response;
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.auth.user.id },
      include: {
        store: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const openSession = await prisma.cashSession.findFirst({
      where: { storeId: user.storeId, closedAt: null },
      include: {
        user: { select: { name: true } },
        _count: { select: { sales: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let pendingCashSession = null;

    if (openSession) {
      const cashSales = await prisma.sale.aggregate({
        where: {
          cashSessionId: openSession.id,
          paymentMethod: "cash",
          status: "completed",
        },
        _sum: { total: true },
      });

      const allSales = await prisma.sale.aggregate({
        where: { cashSessionId: openSession.id, status: "completed" },
        _sum: { total: true },
      });

      pendingCashSession = {
        id: openSession.id,
        userName: openSession.user.name,
        openingAmount: Number(openSession.openingAmount),
        createdAt: openSession.createdAt.toISOString(),
        salesCount: openSession._count.sales,
        currentCashTotal: Number(cashSales._sum.total ?? 0),
        currentTotal: Number(allSales._sum.total ?? 0),
      };
    }

    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json(
      { user: userWithoutPassword, pendingCashSession },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error obteniendo usuario actual:", error);
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 },
    );
  }
}
