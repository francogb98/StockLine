import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password-utils.server";
import {
  demoStore,
  demoUsers,
  demoCategories,
  demoProducts,
  demoSales,
} from "../lib/mock-data";
import { addDays } from "../lib/subscription-config";

async function main() {
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "password123";
  const defaultPasswordHash = await hashPassword(defaultPassword);

  // Clear existing data (ordered by dependencies)
  await prisma.productionUsage.deleteMany();
  await prisma.production.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.ingredientStockMovement.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.ingredientCategory.deleteMany();
  await prisma.suspendedSaleItem.deleteMany();
  await prisma.suspendedSale.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.cashSession.deleteMany();
  await prisma.session.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();

  // Create root store
  await prisma.store.create({
    data: {
      id: demoStore.id,
      name: demoStore.name,
      address: demoStore.address,
      phone: demoStore.phone,
      createdAt: demoStore.createdAt,
    },
  });
  console.log("Store seeded ✓");

  const trialStart = new Date();
  // Demo subscription uses a far-future date so it never expires during normal use.
  // resolveSubscriptionSnapshot() checks trialEndsAt < now and marks past_due if expired.
  const trialEnd = addDays(trialStart, 3650);

  await prisma.subscription.create({
    data: {
      storeId: demoStore.id,
      status: "trial",
      plan: "monthly",
      currentPeriodStart: trialStart,
      currentPeriodEnd: trialEnd,
      trialEndsAt: trialEnd,
    },
  });

  // Create users
  for (const user of demoUsers) {
    await prisma.user.create({
      data: {
        id: user.id,
        storeId: user.storeId,
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: defaultPasswordHash,
        hasCompletedOnboarding: true,
        createdAt: user.createdAt,
      },
    });
  }

  // Create categories
  for (const category of demoCategories) {
    await prisma.category.create({
      data: {
        id: category.id,
        storeId: category.storeId,
        name: category.name,
        description: category.description,
      },
    });
  }

  // Create products
  for (const product of demoProducts) {
    await prisma.product.create({
      data: {
        id: product.id,
        storeId: product.storeId,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        minStock: product.minStock,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    });
  }

  // Create sales with nested sale items
  for (const sale of demoSales) {
    await prisma.sale.create({
      data: {
        id: sale.id,
        storeId: sale.storeId,
        userId: sale.userId,
        subtotal: sale.subtotal,
        tax: sale.tax,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
        items: {
          create: sale.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
    });
  }

  console.log("Seed completed 🚀");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
