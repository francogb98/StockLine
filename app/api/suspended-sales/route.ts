import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const suspendedSales = await prisma.suspendedSale.findMany({
      where: { storeId: auth.user.storeId },
      include: {
        items: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = suspendedSales.map((s) => ({
      id: s.id,
      storeId: s.storeId,
      userId: s.userId,
      userName: s.user?.name ?? null,
      total: s.total,
      itemCount: s.itemCount,
      items: s.items,
      createdAt: s.createdAt,
    }));

    return jsonResponse(result);
  } catch (error) {
    console.error("GET /api/suspended-sales", error);
    return errorResponse("Error al obtener ventas en espera", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const data = await request.json();

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return errorResponse("La venta debe incluir items", 400);
    }

    if (typeof data.total !== "number" || data.total < 0) {
      return errorResponse("Total inválido", 400);
    }

    const itemCount = data.items.reduce(
      (sum: number, item: { quantity: number }) => sum + item.quantity,
      0,
    );

    const suspendedSale = await prisma.suspendedSale.create({
      data: {
        storeId: auth.user.storeId,
        userId: auth.user.id,
        total: data.total,
        itemCount,
        items: {
          create: data.items.map(
            (item: {
              productId: string;
              productName: string;
              quantity: number;
              unitPrice: number;
              total: number;
            }) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            }),
          ),
        },
      },
      include: {
        items: true,
        user: { select: { name: true } },
      },
    });

    return jsonResponse(
      {
        id: suspendedSale.id,
        storeId: suspendedSale.storeId,
        userId: suspendedSale.userId,
        userName: suspendedSale.user?.name ?? null,
        total: suspendedSale.total,
        itemCount: suspendedSale.itemCount,
        items: suspendedSale.items,
        createdAt: suspendedSale.createdAt,
      },
      201,
    );
  } catch (error) {
    console.error("POST /api/suspended-sales", error);
    return errorResponse("Error al crear venta en espera", 500);
  }
}
