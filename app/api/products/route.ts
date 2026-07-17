import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const products = await prisma.product.findMany({
      where: { storeId: auth.user.storeId },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(products);
  } catch (error) {
    console.error("GET /api/products", error);
    return errorResponse("Error fetching products", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const data = await request.json();

    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        storeId: auth.user.storeId,
      },
      select: { id: true },
    });

    if (!category) {
      return errorResponse("Categoría no encontrada", 404);
    }

    const barcode =
      typeof data.barcode === "string" && data.barcode.trim() !== ""
        ? data.barcode.trim()
        : null;

    if (barcode) {
      const existing = await prisma.product.findFirst({
        where: { barcode },
        select: { id: true },
      });
      if (existing) {
        return errorResponse("Ya existe un producto con ese código de barras", 409);
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          barcode,
          name: data.name,
          description: data.description ?? null,
          storeId: auth.user.storeId,
          categoryId: data.categoryId,
          price: data.price,
          cost: data.cost,
          stock: data.stock,
          minStock: data.minStock,
        },
      });

      if (created.stock > 0) {
        await tx.stockMovement.create({
          data: {
            storeId: auth.user.storeId,
            productId: created.id,
            userId: auth.user.id,
            type: "PRODUCT_CREATION",
            quantity: created.stock,
            previousStock: 0,
            newStock: created.stock,
            reason: "Creación del producto",
          },
        });
      }

      return created;
    });

    return jsonResponse(product, 201);
  } catch (error) {
    console.error("POST /api/products", error);
    return errorResponse("Error creating product", 500);
  }
}
