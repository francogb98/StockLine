import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { isDemoSession } from "@/lib/auth-session";
import {
  findProducts,
  findProductByBarcode,
  findCategory,
  createProduct,
  findOrCreateGlobalProduct,
  findGlobalProduct,
} from "@/lib/data-access";
import { createProductSchema } from "@/lib/validations";
import { assertValidUnitForQuantityType, normalizeQuantityType, normalizeUnit } from "@/lib/decimal";

export async function GET() {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const products = await findProducts(ctx);
    return jsonResponse(products);
  } catch (error) {
    console.error("GET /api/products", error);
    return errorResponse("Error fetching products", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    if (await isDemoSession()) {
      return errorResponse("No se pueden crear productos en modo demo", 403);
    }

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const rawData = await request.json();
    const parseResult = createProductSchema.safeParse(rawData);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return errorResponse(firstError?.message || "Datos inválidos", 400);
    }
    const data = parseResult.data;

    const category = await findCategory(ctx, data.categoryId);
    if (!category) {
      return errorResponse("Categoría no encontrada", 404);
    }

    const barcode =
      typeof data.barcode === "string" && data.barcode.trim() !== ""
        ? data.barcode.trim()
        : null;

    if (barcode) {
      const existing = await findProductByBarcode(ctx, barcode);
      if (existing) {
        return errorResponse("Ya existe un producto con ese código de barras", 409);
      }
    }

    const quantityType = normalizeQuantityType(data.quantityType);
    if (
      quantityType === "DISCRETA" &&
      data.unit !== undefined &&
      data.unit !== "unit"
    ) {
      return errorResponse(
        "Un producto DISCRETO solo puede utilizar la unidad 'unit'",
        400,
      );
    }
    if (
      quantityType === "CONTINUA" &&
      data.unit !== undefined &&
      data.unit === "unit"
    ) {
      return errorResponse(
        "Un producto continuo no puede utilizar la unidad 'unit'",
        400,
      );
    }
    const unit = normalizeUnit(data.unit, quantityType);
    try {
      assertValidUnitForQuantityType(unit, quantityType);
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : "Unidad inválida",
        400,
      );
    }

    // Resolve globalProductId
    let globalProductId: string | null = data.globalProductId ?? null;

    if (globalProductId) {
      // Verify the provided globalProductId exists
      const existing = await findGlobalProduct(globalProductId);
      if (!existing) {
        return errorResponse("El producto global especificado no existe", 404);
      }
    } else {
      // Find or create global product based on barcode/name
      const globalProduct = await findOrCreateGlobalProduct({
        name: data.name,
        barcode,
        unit,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl ?? null,
        cloudinaryPublicId: data.cloudinaryPublicId ?? null,
      });
      globalProductId = globalProduct.id;
    }

    const product = await createProduct(ctx, {
      barcode,
      name: data.name,
      description: data.description ?? null,
      categoryId: data.categoryId,
      globalProductId,
      price: data.price,
      cost: data.cost,
      stock: data.stock,
      minStock: data.minStock,
      quantityType,
      unit,
      presentations: data.presentations ?? [],
      imageUrl: data.imageUrl ?? null,
      cloudinaryPublicId: data.cloudinaryPublicId ?? null,
    });

    return jsonResponse(product, 201);
  } catch (error) {
    if (error instanceof Error && /presentaci/i.test(error.message)) {
      return errorResponse(error.message, 400);
    }
    console.error("POST /api/products", error);
    return errorResponse("Error creating product", 500);
  }
}
