import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { isTestUserEmail } from "@/lib/test-users";
import { deleteImage } from "@/lib/cloudinary/image-service";
import {
  findProduct,
  findCategory,
  findProductByBarcode,
  updateProduct,
  deleteProduct,
} from "@/lib/data-access";
import { createProductSchema } from "@/lib/validations";
import { assertValidUnitForQuantityType, normalizeQuantityType, normalizeUnit } from "@/lib/decimal";

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
    const rawData = await request.json();
    const parseResult = createProductSchema.partial().safeParse(rawData);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return errorResponse(firstError?.message || "Datos inválidos", 400);
    }
    const data = parseResult.data;

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

    const mergedQuantityType = normalizeQuantityType(
      data.quantityType ?? existing.quantityType,
    );
    const mergedUnit = normalizeUnit(
      data.unit ?? existing.unit,
      mergedQuantityType,
    );
    try {
      assertValidUnitForQuantityType(mergedUnit, mergedQuantityType);
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : "Unidad inválida",
        400,
      );
    }

    const updateData: Record<string, unknown> = {
      barcode,
      name: data.name,
      description: data.description ?? null,
      categoryId: data.categoryId,
      price: data.price,
      cost: data.cost,
      stock: data.stock,
      minStock: data.minStock,
      quantityType: mergedQuantityType,
      unit: mergedUnit,
      presentations: data.presentations,
      reason: data.reason,
    };
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.cloudinaryPublicId !== undefined) {
      updateData.cloudinaryPublicId = data.cloudinaryPublicId;
    }

    const updated = await updateProduct(ctx, id, updateData as any);

    const { oldCloudinaryPublicId } = data;
    if (
      oldCloudinaryPublicId &&
      oldCloudinaryPublicId === existing.cloudinaryPublicId &&
      !isTestUserEmail(auth.user.email)
    ) {
      await deleteImage(oldCloudinaryPublicId);
    }

    return jsonResponse(updated);
  } catch (error) {
    if (error instanceof Error && /presentaci/i.test(error.message)) {
      return errorResponse(error.message, 400);
    }
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

    const cloudinaryPublicId = existing.cloudinaryPublicId;

    await deleteProduct(ctx, id);

    if (cloudinaryPublicId && !isTestUserEmail(auth.user.email)) {
      await deleteImage(cloudinaryPublicId);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/products/[id]", error);
    return errorResponse("Error deleting product", 500);
  }
}
