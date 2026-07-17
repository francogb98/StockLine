import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { enforceSubscriptionAccess } from "@/lib/subscription-service";
import { requireSessionUser } from "@/lib/api-auth";
import { createSale, SaleProcessingError } from "@/lib/sales-service";
import { createSaleSchema } from "@/lib/validations";
import { isTestUserEmail } from "@/lib/test-users";

export async function GET(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      if (auth.user.role !== "admin") {
        return errorResponse("Solo administradores pueden ver el detalle", 403);
      }

      const sale = await prisma.sale.findFirst({
        where: {
          id,
          storeId: auth.user.storeId,
        },
        include: {
          items: true,
          user: { select: { name: true } },
        },
      });

      if (!sale) {
        return errorResponse("Venta no encontrada", 404);
      }

      const { user: saleUser, ...saleData } = sale;
      return jsonResponse({ ...saleData, userName: saleUser?.name ?? null });
    }

    const sales = await prisma.sale.findMany({
      where: { storeId: auth.user.storeId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(sales);
  } catch (error) {
    console.error("GET /api/sales", error);
    return errorResponse("Error fetching sales", 500);
  }
}

export async function POST(request: Request) {
  try {
    const [auth, rawData] = await Promise.all([
      requireSessionUser(),
      request.json(),
    ]);
    if ("response" in auth) {
      return auth.response;
    }

    const parseResult = createSaleSchema.safeParse(rawData);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return errorResponse(firstError?.message || "Datos inválidos", 400);
    }

    const data = parseResult.data;

    // Test users bypass subscription enforcement
    const isTestUser = isTestUserEmail(auth.user.email);

    const [salesAccess, openSession] = await Promise.all([
      isTestUser
        ? Promise.resolve({ allowed: true })
        : enforceSubscriptionAccess(auth.user.storeId, "sales"),
      data.cashSessionId
        ? null
        : prisma.cashSession.findFirst({
            where: { storeId: auth.user.storeId, closedAt: null },
            orderBy: { createdAt: "desc" },
          }),
    ]);

    if (!salesAccess.allowed) {
      return errorResponse(
        "Suscripción vencida. Activá un plan para volver a vender.",
        403,
      );
    }

    const cashSessionId = data.cashSessionId ?? openSession?.id ?? undefined;

    const sale = await createSale(data, {
      storeId: auth.user.storeId,
      userId: auth.user.id,
      cashSessionId,
    });

    return jsonResponse(sale, 201);
  } catch (error) {
    console.error("POST /api/sales", error);
    if (error instanceof SaleProcessingError) {
      return errorResponse(error.message, error.statusCode);
    }
    return errorResponse("Error creating sale", 500);
  }
}
