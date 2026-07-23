import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import {
  findProducts,
  findProductByBarcode,
  findCategory,
  createProduct,
} from "@/lib/data-access";

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

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const data = await request.json();

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

    const product = await createProduct(ctx, {
      barcode,
      name: data.name,
      description: data.description ?? null,
      categoryId: data.categoryId,
      price: data.price,
      cost: data.cost,
      stock: data.stock,
      minStock: data.minStock,
    });

    return jsonResponse(product, 201);
  } catch (error) {
    console.error("POST /api/products", error);
    return errorResponse("Error creating product", 500);
  }
}
