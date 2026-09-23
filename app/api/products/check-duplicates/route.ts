import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDuplicates } from "@/lib/duplicate-service";
import { z } from "zod";

const checkSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  categoryId: z.string().optional(),
  excludeId: z.string().optional(),
});

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

    const rawData = await request.json();
    const parseResult = checkSchema.safeParse(rawData);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return errorResponse(firstError?.message || "Datos inválidos", 400);
    }

    const { name, categoryId, excludeId } = parseResult.data;

    const result = await checkDuplicates(ctx, {
      name,
      categoryId,
      excludeId,
    });

    return jsonResponse({
      block: result.block
        ? {
            id: result.block.id,
            name: result.block.name,
            barcode: result.block.barcode,
            stock: result.block.stock,
            price: result.block.price,
          }
        : null,
      warnings: result.warnings.map((w) => ({
        id: w.product.id,
        name: w.product.name,
        barcode: w.product.barcode,
        stock: w.product.stock,
        price: w.product.price,
        categoryId: w.product.categoryId,
        score: w.score,
        reasons: w.reasons,
      })),
    });
  } catch (error) {
    console.error("POST /api/products/check-duplicates", error);
    return errorResponse("Error verificando duplicados", 500);
  }
}
