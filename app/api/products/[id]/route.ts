import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import type { Prisma } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const { id } = await params;
    const product = await prisma.product.findFirst({
      where: { id, storeId: auth.user.storeId },
    });
    if (!product) return errorResponse("Product not found", 404);
    return jsonResponse(product);
  } catch (error) {
    console.error("GET /api/products/[id]", error);
    return errorResponse("Error fetching product", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const { id } = await params;
    const data = await request.json();

    const existing = await prisma.product.findFirst({
      where: { id, storeId: auth.user.storeId },
    });

    if (!existing) {
      return errorResponse("Product not found", 404);
    }

    if (data.categoryId) {
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
    }

    const barcode =
      typeof data.barcode === "string" && data.barcode.trim() !== ""
        ? data.barcode.trim()
        : null;

    if (barcode) {
      const duplicate = await prisma.product.findFirst({
        where: { barcode, storeId: auth.user.storeId, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        return errorResponse("Ya existe un producto con ese código de barras", 409);
      }
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.product.findFirst({
        where: { id, storeId: auth.user.storeId },
        select: { stock: true },
      });
      if (!current) throw new Error("Product not found");

      const stockChanged = data.stock !== undefined && data.stock !== current.stock;

      const product = await tx.product.update({
        where: { id },
        data: {
          barcode,
          name: data.name,
          description: data.description ?? null,
          categoryId: data.categoryId,
          price: data.price,
          cost: data.cost,
          stock: data.stock,
          minStock: data.minStock,
        },
      });

      if (stockChanged) {
        await tx.stockMovement.create({
          data: {
            storeId: auth.user.storeId,
            productId: id,
            userId: auth.user.id,
            type: "STOCK_CORRECTION",
            quantity: product.stock - current.stock,
            previousStock: current.stock,
            newStock: product.stock,
            reason: data.reason?.trim() ?? null,
          },
        });
      }

      return product;
    });

    return jsonResponse(updated);
  } catch (error) {
    console.error("PUT /api/products/[id]", error);
    return errorResponse("Error updating product", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const { id } = await params;
    const existing = await prisma.product.findFirst({
      where: { id, storeId: auth.user.storeId },
      select: { id: true },
    });

    if (!existing) {
      return errorResponse("Product not found", 404);
    }

    await prisma.product.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/products/[id]", error);
    return errorResponse("Error deleting product", 500);
  }
}
