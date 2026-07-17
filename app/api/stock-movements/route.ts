import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = { storeId: auth.user.storeId };

    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to);
      where.createdAt = createdAt;
    }

    const movements = await prisma.stockMovement.findMany({
      where: where as any,
      include: {
        user: { select: { name: true } },
        product: { select: { name: true, barcode: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const mapped = movements.map((m) => ({
      id: m.id,
      storeId: m.storeId,
      productId: m.productId,
      productName: m.product.name,
      productBarcode: m.product.barcode,
      userId: m.userId,
      userName: m.user.name,
      type: m.type,
      quantity: m.quantity,
      previousStock: m.previousStock,
      newStock: m.newStock,
      referenceId: m.referenceId,
      reason: m.reason,
      createdAt: m.createdAt,
    }));

    return jsonResponse(mapped);
  } catch (error) {
    console.error("GET /api/stock-movements", error);
    return errorResponse("Error al obtener movimientos de stock", 500);
  }
}
