import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { adjustStockSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    if (auth.user.role !== "admin") {
      return errorResponse("Solo administradores pueden ajustar stock", 403);
    }

    const rawData = await request.json();
    const parseResult = adjustStockSchema.safeParse(rawData);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return errorResponse(firstError?.message || "Datos inválidos", 400);
    }

    const { productId, quantity, reason } = parseResult.data;

    const product = await prisma.product.findFirst({
      where: { id: productId, storeId: auth.user.storeId },
    });

    if (!product) {
      return errorResponse("Producto no encontrado", 404);
    }

    const newStock = product.stock + quantity;
    if (newStock < 0) {
      return errorResponse("El stock no puede ser negativo", 400);
    }

    const [updated] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          storeId: auth.user.storeId,
          productId,
          userId: auth.user.id,
          type: "MANUAL_ADJUSTMENT",
          quantity,
          previousStock: product.stock,
          newStock,
          reason: reason.trim(),
        },
      }),
    ]);

    return jsonResponse({
      productId: updated.id,
      productName: updated.name,
      previousStock: product.stock,
      newStock: updated.stock,
      quantity,
      reason: reason.trim(),
    }, 201);
  } catch (error) {
    console.error("POST /api/stock-movements/adjust", error);
    return errorResponse("Error al ajustar stock", 500);
  }
}
