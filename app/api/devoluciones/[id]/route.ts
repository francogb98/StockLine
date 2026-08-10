import { NextRequest, NextResponse } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { findDevolucion } from "@/lib/devoluciones-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    if (!id) {
      return errorResponse("Devolución id requerido", 400);
    }

    const devolucion = await findDevolucion(
      {
        storeId: auth.user.storeId,
        userId: auth.user.id,
        userEmail: auth.user.email,
        sessionId: auth.sessionId,
      },
      id,
    );

    if (!devolucion) {
      return errorResponse("Devolución no encontrada", 404);
    }

    return jsonResponse(devolucion);
  } catch (error) {
    console.error("GET /api/devoluciones/:id", error);
    return errorResponse("Error al obtener la devolución", 500);
  }
}
