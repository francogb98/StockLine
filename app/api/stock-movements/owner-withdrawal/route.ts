import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { recordOwnerWithdrawal } from "@/lib/data-access";
import { ownerWithdrawalSchema } from "@/lib/validations";

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

    if (auth.user.role !== "admin") {
      return errorResponse("Solo administradores pueden registrar retiro de dueño", 403);
    }

    const rawData = await request.json();
    const parseResult = ownerWithdrawalSchema.safeParse(rawData);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return errorResponse(firstError?.message || "Datos inválidos", 400);
    }

    const movement = await recordOwnerWithdrawal(ctx, parseResult.data);
    return jsonResponse(movement, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return errorResponse("Producto no encontrado", 404);
    }
    if (error instanceof Error && error.message === "STOCK_NEGATIVE") {
      return errorResponse("El stock no puede ser negativo", 400);
    }
    console.error("POST /api/stock-movements/owner-withdrawal", error);
    return errorResponse("Error al registrar retiro", 500);
  }
}
