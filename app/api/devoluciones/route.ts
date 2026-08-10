import { NextRequest, NextResponse } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { createDevolucionSchema } from "@/lib/validations";
import {
  createDevolucion,
  DevolucionProcessingError,
} from "@/lib/devoluciones-service";

export async function POST(request: NextRequest) {
  try {
    const [auth, rawData] = await Promise.all([
      requireSessionUser(),
      request.json(),
    ]);
    if ("response" in auth) return auth.response;

    const parseResult = createDevolucionSchema.safeParse(rawData);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return errorResponse(firstError?.message || "Datos inválidos", 400);
    }

    const data = parseResult.data;
    const devolucion = await createDevolucion(
      {
        ventaId: data.ventaId,
        motivo: data.motivo,
        observaciones: data.observaciones,
        detalles: data.detalles.map((d) => ({
          saleItemId: d.saleItemId,
          cantidad: d.cantidad,
          disposicion: d.disposicion,
        })),
      },
      {
        storeId: auth.user.storeId,
        userId: auth.user.id,
        userEmail: auth.user.email,
        sessionId: auth.sessionId,
      },
    );

    return jsonResponse(devolucion, 201);
  } catch (error) {
    if (error instanceof DevolucionProcessingError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error("POST /api/devoluciones", error);
    return errorResponse("Error al crear la devolución", 500);
  }
}
