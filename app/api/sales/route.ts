import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { enforceSubscriptionAccess } from "@/lib/subscription-service";
import { requireSessionUser } from "@/lib/api-auth";
import { createSale as createSaleServer, SaleProcessingError } from "@/lib/sales-service";
import { createSaleSchema } from "@/lib/validations";
import { isTestUserEmail } from "@/lib/test-users";
import { reportError } from "@/lib/error-reporter";
import {
  findSales,
  findSale,
  findOpenCashSession,
  createSale as createSaleSession,
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      if (auth.user.role !== "admin") {
        return errorResponse("Solo administradores pueden ver el detalle", 403);
      }

      const sale = await findSale(ctx, id);
      if (!sale) {
        return errorResponse("Venta no encontrada", 404);
      }

      return jsonResponse({ ...sale, userName: auth.user.name });
    }

    const sales = await findSales(ctx);
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
    if ("response" in auth) return auth.response;

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

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
        : findOpenCashSession(ctx),
    ]);

    if (!salesAccess.allowed) {
      const message =
        salesAccess.reason === "STORE_SUSPENDED"
          ? "Tienda suspendida por el administrador. Contactá a soporte."
          : "Suscripción vencida. Activá un plan para volver a vender.";
      return errorResponse(message, 403);
    }

    const cashSessionId = data.cashSessionId ?? openSession?.id ?? undefined;

    if (isTestUser) {
      const sale = await createSaleSession(ctx, {
        items: data.items.map((item) => ({
          productId: item.productId,
          productName: item.productName ?? "",
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? 0,
          total: item.total ?? 0,
        })),
        subtotal: data.subtotal ?? 0,
        tax: data.tax ?? 0,
        total: data.total ?? 0,
        paymentMethod: data.paymentMethod,
        cashSessionId,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      });
      return jsonResponse(sale, 201);
    }

    const sale = await createSaleServer(data, {
      storeId: auth.user.storeId,
      userId: auth.user.id,
      cashSessionId,
    });

    return jsonResponse(sale, 201);
  } catch (error) {
    console.error("POST /api/sales", error);
    const err = error instanceof Error ? error : new Error(String(error));
    void reportError({
      source: "API",
      severity: "ERROR",
      message: err.message || "POST /api/sales failed",
      stack: err.stack,
      storeId: undefined,
      method: "POST",
      path: "/api/sales",
      statusCode: 500,
    }).catch(() => {});
    if (error instanceof SaleProcessingError) {
      return errorResponse(error.message, error.statusCode);
    }
    return errorResponse("Error creating sale", 500);
  }
}
