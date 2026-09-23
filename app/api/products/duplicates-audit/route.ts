import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { findFuzzyDuplicateGroups } from "@/lib/duplicate-service";
import { z } from "zod";

const auditSchema = z.object({
  threshold: z.number().min(0.5).max(1).optional().default(0.75),
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

    let threshold = 0.75;
    try {
      const rawData = await request.json();
      const parseResult = auditSchema.safeParse(rawData);
      if (parseResult.success) {
        threshold = parseResult.data.threshold;
      }
    } catch {
      // Body may be empty for a simple trigger — use default threshold
    }

    const groups = await findFuzzyDuplicateGroups(ctx, threshold);

    const serialized = groups.map((g) => ({
      key: g.key,
      products: g.products.map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        stock: p.stock,
        price: p.price,
        cost: p.cost,
        categoryId: p.categoryId,
        imageUrl: p.imageUrl,
      })),
      pairs: g.pairs.map((p) => ({
        productAId: p.productA.id,
        productBId: p.productB.id,
        similarity: p.similarity,
        reason: p.reason,
      })),
    }));

    return jsonResponse({ groups: serialized });
  } catch (error) {
    console.error("POST /api/products/duplicates-audit", error);
    return errorResponse("Error auditando duplicados", 500);
  }
}
