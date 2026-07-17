import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const { id } = await params;

    const session = await prisma.cashSession.findFirst({
      where: { id, storeId: auth.user.storeId },
      include: {
        user: { select: { name: true } },
        sales: {
          where: { status: "completed" },
          include: { items: true, user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!session) {
      return errorResponse("Sesión de caja no encontrada", 404);
    }

    const { user: sessionUser, sales, ...sessionData } = session;

    const cashTotal = sales
      .filter((s) => s.paymentMethod === "cash")
      .reduce((sum, s) => sum + Number(s.total), 0);

    const cardTotal = sales
      .filter((s) => s.paymentMethod === "card")
      .reduce((sum, s) => sum + Number(s.total), 0);

    const transferTotal = sales
      .filter((s) => s.paymentMethod === "transfer")
      .reduce((sum, s) => sum + Number(s.total), 0);

    return jsonResponse({
      ...sessionData,
      userName: sessionUser.name,
      sales: sales.map((s) => ({
        ...s,
        userName: s.user.name,
        user: undefined,
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
