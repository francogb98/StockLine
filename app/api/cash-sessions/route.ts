import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = { storeId: auth.user.storeId };

    if (status === "open") where.closedAt = null;
    if (status === "closed") where.closedAt = { not: null };
    if (userId) {
      if (auth.user.role !== "admin" && userId !== auth.user.id) {
        return errorResponse("No tenés permisos para ver sesiones de otros usuarios", 403);
      }
      where.userId = userId;
    }

    if (auth.user.role !== "admin" && !userId) {
      where.userId = auth.user.id;
    }

    const sessions = await prisma.cashSession.findMany({
      where: where as any,
      include: {
        user: { select: { name: true } },
        _count: { select: { sales: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const mapped = sessions.map((s) => ({
      id: s.id,
      storeId: s.storeId,
      userId: s.userId,
      userName: s.user.name,
      openingAmount: s.openingAmount,
      expectedAmount: s.expectedAmount,
      closingAmount: s.closingAmount,
      difference: s.difference,
      notes: s.notes,
      closedAt: s.closedAt,
      createdAt: s.createdAt,
      salesCount: s._count.sales,
    }));

    return jsonResponse(mapped);
  } catch (error) {
    console.error("GET /api/cash-sessions", error);
    return errorResponse("Error al obtener sesiones de caja", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const { openingAmount, notes } = await request.json();

    if (openingAmount !== undefined && openingAmount !== null && openingAmount !== "") {
      if (typeof openingAmount !== "number" || !Number.isFinite(openingAmount) || openingAmount < 0) {
        return errorResponse("El monto de apertura debe ser un número válido y no negativo", 400);
      }
    }

    const safeOpeningAmount = typeof openingAmount === "number" && Number.isFinite(openingAmount) && openingAmount >= 0
      ? openingAmount
      : 0;

    const session = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingOpen = await tx.cashSession.findFirst({
        where: { storeId: auth.user.storeId, closedAt: null },
      });

      if (existingOpen) {
        throw new Error("SESSION_EXISTS");
      }

      return tx.cashSession.create({
        data: {
          storeId: auth.user.storeId,
          userId: auth.user.id,
          openingAmount: safeOpeningAmount,
          notes: notes ?? null,
        },
        include: {
          user: { select: { name: true } },
        },
      });
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
      salesCount: 0,
      currentCashTotal: 0,
      currentTotal: 0,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_EXISTS") {
      return errorResponse("Ya hay una sesión de caja abierta. Cerrala antes de abrir una nueva.", 409);
    }
    console.error("POST /api/cash-sessions", error);
    return errorResponse("Error al abrir sesión de caja", 500);
  }
}
