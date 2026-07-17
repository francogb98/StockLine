import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";

export async function POST(req: Request) {
  const requestStart = Date.now();

  try {
    const authStart = Date.now();
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;
    const authTime = Date.now() - authStart;

    const data = await req.json();
    const categories: { name: string; description?: string }[] = data.categories ?? [];
    const products: {
      name: string;
      categoryId: string;
      price: number;
      cost: number;
      stock: number;
      minStock: number;
      barcode?: string;
    }[] = data.products ?? [];

    if (categories.length === 0) {
      return errorResponse("Debe crear al menos una categoría", 400);
    }

    await prisma.$transaction(
      async (tx) => {
        const t0 = Date.now();

        // --- Categories: find existing or create (1-2 queries per category) ---
        const catStart = Date.now();
        const createdCategories: Record<string, string> = {};

        for (const cat of categories) {
          const normalizedName = cat.name
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          const existing = await tx.category.findFirst({
            where: {
              storeId: auth.user.storeId,
              normalizedName,
            },
            select: { id: true },
          });

          if (existing) {
            createdCategories[cat.name] = existing.id;
          } else {
            const created = await tx.category.create({
              data: {
                storeId: auth.user.storeId,
                name: cat.name,
                normalizedName,
                description: cat.description ?? null,
              },
            });
            createdCategories[cat.name] = created.id;
          }
        }
        const catTime = Date.now() - catStart;

        // --- Products: resolve category IDs in memory, then batch insert ---
        const prodStart = Date.now();
        const productCategoryMap = data.productCategoryMap as
          | Record<string, string>
          | undefined;

        const validCategoryIds = new Set(Object.values(createdCategories));
        const productsToCreate: {
          storeId: string;
          name: string;
          categoryId: string;
          price: number;
          cost: number;
          stock: number;
          minStock: number;
          barcode?: string;
        }[] = [];

        for (const prod of products) {
          let resolvedCategoryId = prod.categoryId;
          if (productCategoryMap && productCategoryMap[prod.categoryId]) {
            const categoryName = productCategoryMap[prod.categoryId];
            resolvedCategoryId =
              createdCategories[categoryName] || prod.categoryId;
          }

          if (!validCategoryIds.has(resolvedCategoryId)) continue;

          productsToCreate.push({
            storeId: auth.user.storeId,
            name: prod.name,
            barcode: prod.barcode || undefined,
            categoryId: resolvedCategoryId,
            price: prod.price,
            cost: prod.cost,
            stock: prod.stock,
            minStock: prod.minStock,
          });
        }

        const prodResolveTime = Date.now() - prodStart;

        const insertStart = Date.now();
        if (productsToCreate.length > 0) {
          await tx.product.createMany({ data: productsToCreate });
        }
        const insertTime = Date.now() - insertStart;

        // --- User update: mark onboarding complete ---
        const userStart = Date.now();
        await tx.user.update({
          where: { id: auth.user.id },
          data: {
            hasCompletedOnboarding: true,
            onboardingStep: 0,
            draftOnboardingState: Prisma.DbNull,
          },
        });
        const userTime = Date.now() - userStart;

        const totalTime = Date.now() - t0;
        console.log(
          "Onboarding transaction completed",
          JSON.stringify({
            categories: categories.length,
            productsCreated: productsToCreate.length,
            productsSkipped: products.length - productsToCreate.length,
            catTime,
            prodResolveTime,
            insertTime,
            userTime,
            totalTime,
          }),
        );
      },
      { timeout: 15_000 },
    );

    console.log(
      "Onboarding request total:",
      JSON.stringify({ authTime, total: Date.now() - requestStart }),
    );

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("POST /api/onboarding/complete failed:", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      elapsed: Date.now() - requestStart,
      error,
    });
    return errorResponse("Error completing onboarding", 500);
  }
}
