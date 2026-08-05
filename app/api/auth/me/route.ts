import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedSession } from "@/lib/api-auth";
import { isTestUserEmail } from "@/lib/test-users";
import { getOrCreateSessionStore } from "@/lib/session-store";

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

    let pendingCashSession = null;

    if (isTestUserEmail(user.email)) {
      const store = getOrCreateSessionStore(auth.auth.sessionId);
      const openSession = store.getOpenCashSession(user.storeId);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (
        openSession &&
        (openSession.createdAt < todayStart || openSession.userId !== user.id)
      ) {
        const cashTotal = store.aggregateSalesTotal({
          cashSessionId: openSession.id,
          paymentMethod: "cash",
          status: "completed",
        });
        const allTotal = store.aggregateSalesTotal({
          cashSessionId: openSession.id,
          status: "completed",
        });

        pendingCashSession = {
          id: openSession.id,
          userName: openSession.userName ?? openSession.userId,
          openingAmount: openSession.openingAmount,
          createdAt: openSession.createdAt instanceof Date
            ? openSession.createdAt.toISOString()
            : openSession.createdAt,
          salesCount: store.countSales({
            cashSessionId: openSession.id,
            status: "completed",
          }),
          currentCashTotal: cashTotal.total ?? 0,
          currentTotal: allTotal.total ?? 0,
        };
      }
    } else {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const openSession = await prisma.cashSession.findFirst({
        where: {
          storeId: user.storeId,
          closedAt: null,
          OR: [{ createdAt: { lt: todayStart } }, { userId: { not: user.id } }],
        },
        include: {
          user: { select: { name: true } },
          _count: { select: { sales: true } },
        },
        orderBy: { createdAt: "desc" },
      });

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
          userName: openSession.user.name ?? openSession.userId,
          openingAmount: Number(openSession.openingAmount),
          createdAt: openSession.createdAt.toISOString(),
          salesCount: openSession._count.sales,
          currentCashTotal: Number(cashSales._sum.total ?? 0),
          currentTotal: Number(allSales._sum.total ?? 0),
        };
      }
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
