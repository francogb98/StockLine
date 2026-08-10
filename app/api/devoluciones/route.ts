import { NextRequest, NextResponse } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { createDevolucionSchema } from "@/lib/validations";
import {
  createDevolucion,
  findDevoluciones,
  DevolucionProcessingError,
} from "@/lib/devoluciones-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const url = new URL(request.url);
    const ventaId = url.searchParams.get("ventaId") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const offset = Number(url.searchParams.get("offset") ?? "0");

    if (Number.isNaN(limit) || limit <= 0 || limit > 200) {
      return errorResponse("limit inválido (1-200)", 400);
    }
    if (Number.isNaN(offset) || offset < 0) {
      return errorResponse("offset inválido", 400);
    }

    const result = await findDevoluciones(
      {
        storeId: auth.user.storeId,
        userId: auth.user.id,
        userEmail: auth.user.email,
        sessionId: auth.sessionId,
      },
      { ventaId, limit, offset },
    );

    return jsonResponse(result);
  } catch (error) {
    console.error("GET /api/devoluciones", error);
    return errorResponse("Error al listar devoluciones", 500);
  }
}

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
        total: data.total === true,
        detalles: (data.detalles ?? []).map((d) => ({
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