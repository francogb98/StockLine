import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { isDemoSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";

const mergeSchema = z.object({
  primaryId: z.string().min(1, "ID del producto principal requerido"),
  duplicateId: z.string().min(1, "ID del producto duplicado requerido"),
  stockStrategy: z
    .enum(["SUM", "KEEP_TARGET", "KEEP_DUPLICATE"])
    .default("SUM"),
});

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    if (await isDemoSession()) {
      return errorResponse("No se pueden unificar productos en modo demo", 403);
    }

    const rawData = await request.json();
    const parseResult = mergeSchema.safeParse(rawData);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return errorResponse(firstError?.message || "Datos inválidos", 400);
    }

    const { primaryId, duplicateId, stockStrategy } = parseResult.data;

    if (primaryId === duplicateId) {
      return errorResponse("No podés unificar un producto consigo mismo", 400);
    }

    const storeId = auth.user.storeId;
    const userId = auth.user.id;

    // Verify both products exist and belong to the store
    const [primary, duplicate] = await Promise.all([
      prisma.product.findFirst({
        where: { id: primaryId, storeId, status: "ACTIVE" },
      }),
      prisma.product.findFirst({
        where: { id: duplicateId, storeId, status: "ACTIVE" },
      }),
    ]);

    if (!primary) {
      return errorResponse("Producto principal no encontrado", 404);
    }
    if (!duplicate) {
      return errorResponse("Producto duplicado no encontrado", 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Calculate final stock based on strategy
      const primaryStock = Number(primary.stock);
      const duplicateStock = Number(duplicate.stock);

      let newStock: number;
      switch (stockStrategy) {
        case "KEEP_TARGET":
          newStock = primaryStock;
          break;
        case "KEEP_DUPLICATE":
          newStock = duplicateStock;
          break;
        case "SUM":
        default:
          newStock = primaryStock + duplicateStock;
          break;
      }

      // 2. Preserve image: copy from duplicate if primary has none
      const imageUpdate: Record<string, unknown> = {};
      if (!primary.imageUrl && duplicate.imageUrl) {
        imageUpdate.imageUrl = duplicate.imageUrl;
        imageUpdate.cloudinaryPublicId = duplicate.cloudinaryPublicId ?? null;
      }

      const updatedPrimary = await tx.product.update({
        where: { id: primaryId },
        data: {
          stock: new Decimal(newStock),
          ...imageUpdate,
        },
      });

      // 2. Reassign sale items
      await tx.saleItem.updateMany({
        where: { productId: duplicateId },
        data: { productId: primaryId },
      });

      // 3. Reassign stock movements
      await tx.stockMovement.updateMany({
        where: { productId: duplicateId },
        data: { productId: primaryId },
      });

      // 4. Reassign devolucion detalles
      await tx.devolucionDetalle.updateMany({
        where: { productId: duplicateId },
        data: { productId: primaryId },
      });

      // 5. Reassign suspended sale items
      await tx.suspendedSaleItem.updateMany({
        where: { productId: duplicateId },
        data: { productId: primaryId },
      });

      // 6. Reassign recipe link (if duplicate has a recipe pointing to it)
      const duplicateRecipe = await tx.recipe.findFirst({
        where: { productId: duplicateId },
      });
      if (duplicateRecipe) {
        // Only reassign if primary doesn't already have a recipe
        const primaryRecipe = await tx.recipe.findFirst({
          where: { productId: primaryId },
        });
        if (!primaryRecipe) {
          await tx.recipe.update({
            where: { id: duplicateRecipe.id },
            data: { productId: primaryId },
          });
        } else {
          // Disconnect the duplicate's recipe from its product
          await tx.recipe.update({
            where: { id: duplicateRecipe.id },
            data: { productId: null },
          });
        }
      }

      // 7. Archive the duplicate product
      await tx.product.update({
        where: { id: duplicateId },
        data: {
          status: "MERGED",
          mergedIntoId: primaryId,
          mergedAt: new Date(),
          mergedByUserId: userId,
        },
      });

      // 8. Record merge stock movements
      // MERGE_OUT: stock leaving the duplicate (set to 0)
      await tx.stockMovement.create({
        data: {
          storeId,
          productId: duplicateId,
          userId,
          type: "MERGE_OUT",
          quantity: new Decimal(-duplicateStock),
          previousStock: duplicate.stock,
          newStock: new Decimal(0),
          reason: `Unificado en producto ${primary.name}`,
        },
      });

      // MERGE_IN: stock change at the primary (depends on strategy)
      const stockDelta = newStock - primaryStock;
      const strategyLabel =
        stockStrategy === "SUM"
          ? "suma total"
          : stockStrategy === "KEEP_TARGET"
            ? "mantener stock principal"
            : "mantener stock duplicado";

      await tx.stockMovement.create({
        data: {
          storeId,
          productId: primaryId,
          userId,
          type: "MERGE_IN",
          quantity: new Decimal(stockDelta),
          previousStock: primary.stock,
          newStock: new Decimal(newStock),
          reason: `Unificación (${strategyLabel}) de: ${duplicate.name}`,
        },
      });

      return {
        primary: {
          id: updatedPrimary.id,
          name: updatedPrimary.name,
          stock: newStock,
        },
        archived: {
          id: duplicate.id,
          name: duplicate.name,
        },
      };
    });

    return jsonResponse({
      success: true,
      merged: result,
    });
  } catch (error) {
    console.error("POST /api/products/merge", error);
    return errorResponse("Error unificando productos", 500);
  }
}
