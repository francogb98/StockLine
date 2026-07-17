import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireAdminSessionUser } from "@/lib/api-auth";
import type { ImportOptions, MappedRow } from "@/lib/import/product-import-schemas";

interface ImportRequest {
  products: MappedRow[];
  options: ImportOptions;
}

function normalizeCategoryName(name: string): string {
  // Match the DB-level normalization: lowercase, trim, remove common accents
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const body: ImportRequest = await request.json();

    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      return errorResponse("No se proporcionaron productos para importar", 400);
    }

    if (!body.options || !["create", "update"].includes(body.options.mode)) {
      return errorResponse("Opciones de importación inválidas", 400);
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      categoriesCreated: 0,
      errors: [] as { row: number; message: string }[],
    };

    // ============================================================
    // STEP 1: Resolve all categories BEFORE processing products
    // ============================================================

    // 1a. Load existing categories for this store
    const existingCategories = await prisma.category.findMany({
      where: { storeId: auth.user.storeId },
      select: { id: true, name: true },
    });

    // 1b. Build map: normalizedName → { id, name }
    const categoryMap = new Map<string, { id: string; name: string }>();
    for (const cat of existingCategories) {
      categoryMap.set(normalizeCategoryName(cat.name), { id: cat.id, name: cat.name });
    }

    // 1c. Collect all unique category names from the import rows
    const uniqueCategoryNames = new Map<string, string>(); // normalizedName → originalName
    for (const row of body.products) {
      if (row.category && row.category.trim()) {
        const norm = normalizeCategoryName(row.category);
        if (!uniqueCategoryNames.has(norm)) {
          uniqueCategoryNames.set(norm, row.category.trim());
        }
      }
    }

    // 1d. Create missing categories (using upsert for concurrent safety)
    for (const [norm, originalName] of uniqueCategoryNames) {
      if (!categoryMap.has(norm)) {
        try {
          const created = await prisma.category.create({
            data: {
              storeId: auth.user.storeId,
              name: originalName,
              normalizedName: norm,
            },
          });
          categoryMap.set(norm, { id: created.id, name: created.name });
          results.categoriesCreated++;
        } catch (error: unknown) {
          // Handle race condition: if category was created by concurrent request
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
          ) {
            // Unique constraint violated — refetch
            const refetched = await prisma.category.findMany({
              where: { storeId: auth.user.storeId },
              select: { id: true, name: true },
            });
            categoryMap.clear();
            for (const cat of refetched) {
              categoryMap.set(normalizeCategoryName(cat.name), { id: cat.id, name: cat.name });
            }
          } else {
            results.errors.push({
              row: 0,
              message: `Error creando categoría "${originalName}": ${error instanceof Error ? error.message : "Error desconocido"}`,
            });
          }
        }
      }
    }

    // 1e. Get default category (first existing or newly created)
    const defaultCategory = categoryMap.values().next().value ?? null;

    // ============================================================
    // STEP 2: Load existing products for duplicate detection
    // ============================================================

    const existingProducts = await prisma.product.findMany({
      where: { storeId: auth.user.storeId },
      select: {
        id: true,
        name: true,
        barcode: true,
        price: true,
        cost: true,
        stock: true,
        minStock: true,
        categoryId: true,
      },
    });

    // ============================================================
    // STEP 3: Process products
    // ============================================================

    const batchSize = 50;
    for (let i = 0; i < body.products.length; i += batchSize) {
      const batch = body.products.slice(i, i + batchSize);

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const globalRow = i + j + 1;

        try {
          // Resolve category from the pre-built map
          let categoryId: string | null = null;
          if (row.category && row.category.trim()) {
            const norm = normalizeCategoryName(row.category);
            const resolved = categoryMap.get(norm);
            if (resolved) {
              categoryId = resolved.id;
            }
          }

          if (!categoryId) {
            if (defaultCategory) {
              categoryId = defaultCategory.id;
            } else {
              results.errors.push({
                row: globalRow,
                message: "No hay categorías disponibles. Creá una categoría primero.",
              });
              continue;
            }
          }

          // Check for existing product by matchBy criteria
          let existing = null;
          if (body.options.matchBy === "barcode" && row.barcode) {
            existing = existingProducts.find(
              (p) => p.barcode && p.barcode.toLowerCase() === row.barcode!.toLowerCase(),
            );
          } else if (body.options.matchBy === "name" && row.name) {
            existing = existingProducts.find(
              (p) => p.name.toLowerCase().trim() === row.name!.toLowerCase().trim(),
            );
          }

          // Also check barcode conflict regardless of matchBy
          const barcodeConflict = row.barcode
            ? existingProducts.find(
                (p) => p.barcode && p.barcode.toLowerCase() === row.barcode!.toLowerCase(),
              )
            : null;

          if (existing) {
            if (body.options.mode === "create") {
              results.skipped++;
              continue;
            }

            // Update mode
            const updateData: Record<string, unknown> = {};

            if (body.options.updateFields.includes("stock") && row.stock !== undefined) {
              updateData.stock = row.stock;
            }
            if (body.options.updateFields.includes("price") && row.price !== undefined) {
              updateData.price = row.price;
            }
            if (body.options.updateFields.includes("cost") && row.cost !== undefined) {
              updateData.cost = row.cost;
            }
            if (body.options.updateFields.includes("minStock") && row.minStock !== undefined) {
              updateData.minStock = row.minStock;
            }

            if (Object.keys(updateData).length > 0) {
              const currentProduct = await prisma.product.findUnique({
                where: { id: existing.id },
                select: { stock: true },
              });

              await prisma.product.update({
                where: { id: existing.id },
                data: updateData,
              });

              if (
                "stock" in updateData &&
                currentProduct &&
                updateData.stock !== currentProduct.stock
              ) {
                await prisma.stockMovement.create({
                  data: {
                    storeId: auth.user.storeId,
                    productId: existing.id,
                    userId: auth.user.id,
                    type: "IMPORT",
                    quantity: (updateData.stock as number) - currentProduct.stock,
                    previousStock: currentProduct.stock,
                    newStock: updateData.stock as number,
                    reason: "Importación masiva - actualización de stock",
                  },
                });
              }

              results.updated++;
            } else {
              results.skipped++;
            }
          } else {
            // Skip if barcode conflicts with an existing product
            if (barcodeConflict) {
              results.errors.push({
                row: globalRow,
                message: `El código de barras "${row.barcode}" ya existe en otro producto`,
              });
              continue;
            }

            // Skip duplicate barcodes within the import
            if (row.barcode) {
              const barcodeLower = row.barcode.toLowerCase();
              const isDuplicateInBatch = body.products.some(
                (p, idx) =>
                  idx < i + j &&
                  p.barcode &&
                  p.barcode.toLowerCase() === barcodeLower,
              );
              if (isDuplicateInBatch) {
                results.errors.push({
                  row: globalRow,
                  message: `Código de barras duplicado en el archivo: "${row.barcode}"`,
                });
                continue;
              }
            }

            // Create new product
            const product = await prisma.product.create({
              data: {
                storeId: auth.user.storeId,
                name: row.name,
                barcode: row.barcode || null,
                description: row.description || null,
                categoryId,
                price: row.price ?? 0,
                cost: row.cost ?? 0,
                stock: row.stock ?? 0,
                minStock: row.minStock ?? 5,
              },
            });

            if (product.stock > 0) {
              await prisma.stockMovement.create({
                data: {
                  storeId: auth.user.storeId,
                  productId: product.id,
                  userId: auth.user.id,
                  type: "IMPORT",
                  quantity: product.stock,
                  previousStock: 0,
                  newStock: product.stock,
                  reason: "Importación masiva",
                },
              });
            }

            results.created++;
          }
        } catch (error) {
          results.errors.push({
            row: globalRow,
            message: error instanceof Error ? error.message : "Error desconocido",
          });
        }
      }
    }

    return jsonResponse(results);
  } catch (error) {
    console.error("POST /api/products/import", error);
    return errorResponse("Error durante la importación", 500);
  }
}
