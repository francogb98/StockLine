import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import {
  findCashSessions,
  createCashSession,
  CashSessionExistsError,
} from "@/lib/data-access";

export async function GET(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const sessions = await findCashSessions(ctx);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const filterUserId = searchParams.get("userId");

    let filtered = sessions.filter((s) => {
      if (status === "open" && s.closedAt) return false;
      if (status === "closed" && !s.closedAt) return false;
      if (filterUserId) {
        if (auth.user.role !== "admin" && filterUserId !== auth.user.id) return false;
        return s.userId === filterUserId;
      }
      if (auth.user.role !== "admin" && !filterUserId) {
        return s.userId === auth.user.id;
      }
      return true;
    });

    const mapped = filtered.map((s) => ({
      id: s.id,
      storeId: s.storeId,
      userId: s.userId,
      userName: s.userName ?? null,
      openingAmount: s.openingAmount,
      expectedAmount: s.expectedAmount,
      closingAmount: s.closingAmount,
      difference: s.difference,
      notes: s.notes,
      closedAt: s.closedAt,
      createdAt: s.createdAt,
      salesCount: 0,
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

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const { openingAmount, notes } = await request.json();

    if (openingAmount !== undefined && openingAmount !== null && openingAmount !== "") {
      if (typeof openingAmount !== "number" || !Number.isFinite(openingAmount) || openingAmount < 0) {
        return errorResponse("El monto de apertura debe ser un número válido y no negativo", 400);
      }
    }

    const safeOpeningAmount = typeof openingAmount === "number" && Number.isFinite(openingAmount) && openingAmount >= 0
      ? openingAmount
      : 0;

    const session = await createCashSession(ctx, {
      openingAmount: safeOpeningAmount,
      notes: notes ?? null,
      userName: auth.user.name,
    });

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
      salesCount: 0,
      currentCashTotal: 0,
      currentTotal: 0,
    }, 201);
  } catch (error) {
    if (error instanceof CashSessionExistsError) {
      return errorResponse(
        "Ya hay una sesión de caja abierta. Cerrala antes de abrir una nueva.",
        409,
        { openSessionId: error.openSessionId },
      );
    }
    console.error("POST /api/cash-sessions", error);
    return errorResponse("Error al abrir sesión de caja", 500);
  }
}
