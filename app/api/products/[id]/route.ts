import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import {
  findProduct,
  findCategory,
  findProductByBarcode,
  updateProduct,
  deleteProduct,
} from "@/lib/data-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const { id } = await params;
    const product = await findProduct(ctx, id);
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
    if ("response" in auth) return auth.response;

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const { id } = await params;
    const data = await request.json();

    const existing = await findProduct(ctx, id);
    if (!existing) {
      return errorResponse("Product not found", 404);
    }

    if (data.categoryId) {
      const category = await findCategory(ctx, data.categoryId);
      if (!category) {
        return errorResponse("Categoría no encontrada", 404);
      }
    }

    const barcode =
      typeof data.barcode === "string" && data.barcode.trim() !== ""
        ? data.barcode.trim()
        : null;

    if (barcode) {
      const duplicate = await findProductByBarcode(ctx, barcode, id);
      if (duplicate) {
        return errorResponse("Ya existe un producto con ese código de barras", 409);
      }
    }

    const updated = await updateProduct(ctx, id, {
      barcode,
      name: data.name,
      description: data.description ?? null,
      categoryId: data.categoryId,
      price: data.price,
      cost: data.cost,
      stock: data.stock,
      minStock: data.minStock,
      reason: data.reason,
    });

    return jsonResponse(updated);
  } catch (error) {
    console.error("PUT /api/products/[id]", error);
    return errorResponse("Error updating product", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const { id } = await params;
    const existing = await findProduct(ctx, id);
    if (!existing) {
      return errorResponse("Product not found", 404);
    }

    await deleteProduct(ctx, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/products/[id]", error);
    return errorResponse("Error deleting product", 500);
  }
}
