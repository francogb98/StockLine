import { prisma } from "@/lib/prisma";
import { isTestUserEmail } from "@/lib/test-users";
import {
  getOrCreateSessionStore,
  type StoredProduct,
  type StoredCategory,
  type StoredSale,
  type StoredCashSession,
  type StoredStockMovement,
  type StoredSuspendedSale,
} from "@/lib/session-store";
import type { Prisma } from "@prisma/client";

export interface DataContext {
  storeId: string;
  sessionId: string;
  userEmail: string;
  userId: string;
}

function store(ctx: DataContext) {
  return getOrCreateSessionStore(ctx.sessionId);
}

function isTest(ctx: DataContext) {
  return isTestUserEmail(ctx.userEmail);
}

// ---- Products ----
export async function findProducts(ctx: DataContext): Promise<StoredProduct[]> {
  if (isTest(ctx)) return store(ctx).getProducts(ctx.storeId);
  return prisma.product.findMany({
    where: { storeId: ctx.storeId },
    orderBy: { createdAt: "desc" },
  }) as unknown as StoredProduct[];
}

export async function findProduct(
  ctx: DataContext,
  id: string,
): Promise<StoredProduct | null> {
  if (isTest(ctx)) return store(ctx).getProduct(id, ctx.storeId);
  return prisma.product.findFirst({
    where: { id, storeId: ctx.storeId },
  }) as unknown as StoredProduct | null;
}

export async function findProductByBarcode(
  ctx: DataContext,
  barcode: string,
  excludeId?: string,
): Promise<StoredProduct | null> {
  if (isTest(ctx)) return store(ctx).getProductByBarcode(barcode, ctx.storeId);
  const where: any = { barcode, storeId: ctx.storeId };
  if (excludeId) where.NOT = { id: excludeId };
  return prisma.product.findFirst({ where }) as unknown as StoredProduct | null;
}

export async function createProduct(
  ctx: DataContext,
  data: {
    barcode: string | null;
    name: string;
    description: string | null;
    categoryId: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    imageUrl?: string | null;
    cloudinaryPublicId?: string | null;
  },
): Promise<StoredProduct> {
  if (isTest(ctx)) {
    const product = store(ctx).createProduct({ storeId: ctx.storeId, ...data });
    if (product.stock > 0) {
      store(ctx).createStockMovement({
        storeId: ctx.storeId,
        productId: product.id,
        userId: ctx.userId,
        type: "PRODUCT_CREATION",
        quantity: product.stock,
        previousStock: 0,
        newStock: product.stock,
        reason: "Creación del producto",
      });
    }
    return product;
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.product.create({
      data: { storeId: ctx.storeId, ...data },
    });
    if (created.stock > 0) {
      await tx.stockMovement.create({
        data: {
          storeId: ctx.storeId,
          productId: created.id,
          userId: ctx.userId,
          type: "PRODUCT_CREATION",
          quantity: created.stock,
          previousStock: 0,
          newStock: created.stock,
          reason: "Creación del producto",
        },
      });
    }
    return created as unknown as StoredProduct;
  });
}

export async function updateProduct(
  ctx: DataContext,
  id: string,
  data: Partial<StoredProduct> & { reason?: string },
): Promise<StoredProduct | null> {
  if (isTest(ctx)) {
    const currentStock = store(ctx).getProductStock(id);
    const prev = store(ctx).getProduct(id, ctx.storeId);
    if (!prev) return null;

    const stockChanged = data.stock !== undefined && data.stock !== currentStock;
    const updated = store(ctx).updateProduct(id, data);
    if (stockChanged && updated) {
      store(ctx).createStockMovement({
        storeId: ctx.storeId,
        productId: id,
        userId: ctx.userId,
        type: "STOCK_CORRECTION",
        quantity: updated.stock - prev.stock,
        previousStock: prev.stock,
        newStock: updated.stock,
        reason: data.reason?.trim() ?? null,
      });
    }
    return updated;
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const current = await tx.product.findFirst({
      where: { id, storeId: ctx.storeId },
      select: { stock: true },
    });
    if (!current) throw new Error("NOT_FOUND");
    const stockChanged = data.stock !== undefined && data.stock !== current.stock;
    const product = await tx.product.update({
      where: { id },
      data: { ...data, reason: undefined } as any,
    });
    if (stockChanged) {
      await tx.stockMovement.create({
        data: {
          storeId: ctx.storeId,
          productId: id,
          userId: ctx.userId,
          type: "STOCK_CORRECTION",
          quantity: (product as any).stock - current.stock,
          previousStock: current.stock,
          newStock: (product as any).stock,
          reason: data.reason?.trim() ?? null,
        },
      });
    }
    return product as unknown as StoredProduct;
  });

  return updated;
}

export async function deleteProduct(
  ctx: DataContext,
  id: string,
): Promise<boolean> {
  if (isTest(ctx)) return store(ctx).deleteProduct(id);
  await prisma.product.delete({ where: { id } });
  return true;
}

// ---- Categories ----
export async function findCategories(ctx: DataContext): Promise<StoredCategory[]> {
  if (isTest(ctx)) return store(ctx).getCategories(ctx.storeId);
  return prisma.category.findMany({
    where: { storeId: ctx.storeId },
    orderBy: { name: "asc" },
  }) as unknown as StoredCategory[];
}

export async function findCategory(
  ctx: DataContext,
  id: string,
): Promise<StoredCategory | null> {
  if (isTest(ctx)) return store(ctx).getCategory(id, ctx.storeId);
  return prisma.category.findFirst({
    where: { id, storeId: ctx.storeId },
  }) as unknown as StoredCategory | null;
}

export async function findCategoryByName(
  ctx: DataContext,
  name: string,
  excludeId?: string,
): Promise<StoredCategory | null> {
  if (isTest(ctx)) return store(ctx).getCategoryByName(name, ctx.storeId, excludeId);

  const where: any = {
    storeId: ctx.storeId,
    name: { equals: name, mode: "insensitive" },
  };
  if (excludeId) where.id = { not: excludeId };
  return prisma.category.findFirst({ where }) as unknown as StoredCategory | null;
}

export async function createCategory(
  ctx: DataContext,
  data: {
    name: string;
    normalizedName: string;
    description: string | null;
  },
): Promise<StoredCategory> {
  if (isTest(ctx)) return store(ctx).createCategory({ storeId: ctx.storeId, ...data });
  return prisma.category.create({
    data: { storeId: ctx.storeId, ...data },
  }) as unknown as StoredCategory;
}

export async function updateCategory(
  ctx: DataContext,
  id: string,
  data: Partial<StoredCategory>,
): Promise<StoredCategory | null> {
  if (isTest(ctx)) return store(ctx).updateCategory(id, data);
  return prisma.category.update({
    where: { id },
    data,
  }) as unknown as StoredCategory;
}

export async function deleteCategory(
  ctx: DataContext,
  id: string,
): Promise<boolean> {
  if (isTest(ctx)) return store(ctx).deleteCategory(id);
  await prisma.category.delete({ where: { id } });
  return true;
}

export async function countProductsInCategory(
  ctx: DataContext,
  categoryId: string,
): Promise<number> {
  if (isTest(ctx)) return store(ctx).countProductsByCategory(categoryId, ctx.storeId);
  return prisma.product.count({
    where: { storeId: ctx.storeId, categoryId },
  });
}

// ---- Sales ----
export async function findSales(ctx: DataContext): Promise<StoredSale[]> {
  if (isTest(ctx)) return store(ctx).getSales(ctx.storeId);
  return prisma.sale.findMany({
    where: { storeId: ctx.storeId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  }) as unknown as StoredSale[];
}

export async function findSale(
  ctx: DataContext,
  id: string,
): Promise<StoredSale | null> {
  if (isTest(ctx)) return store(ctx).getSale(id, ctx.storeId);
  return prisma.sale.findFirst({
    where: { id, storeId: ctx.storeId },
    include: { items: true },
  }) as unknown as StoredSale | null;
}

export async function createSale(
  ctx: DataContext,
  data: {
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    cashSessionId?: string;
    createdAt?: Date;
  },
): Promise<StoredSale> {
  if (isTest(ctx)) {
    const sale = store(ctx).createSale({
      storeId: ctx.storeId,
      userId: ctx.userId,
      ...data,
    });
    for (const item of data.items) {
      const product = store(ctx).getProduct(item.productId, ctx.storeId);
      if (product) {
        const prev = product.stock;
        const newStock = Math.max(0, prev - item.quantity);
        store(ctx).updateProduct(item.productId, { stock: newStock });
        store(ctx).createStockMovement({
          storeId: ctx.storeId,
          productId: item.productId,
          userId: ctx.userId,
          type: "SALE",
          quantity: -item.quantity,
          previousStock: prev,
          newStock,
          referenceId: sale.id,
        });
      }
    }
    return sale;
  }

  const { createSale: createSaleService } = await import("@/lib/sales-service");
  const result = await createSaleService(data, {
    storeId: ctx.storeId,
    userId: ctx.userId,
    cashSessionId: data.cashSessionId,
  });
  return result as unknown as StoredSale;
}

export async function aggregateSales(
  ctx: DataContext,
  where: { cashSessionId?: string; paymentMethod?: string; status?: string },
): Promise<{ total: number | null }> {
  if (isTest(ctx)) return store(ctx).aggregateSalesTotal(where);

  const result = await prisma.sale.aggregate({
    where: { storeId: ctx.storeId, ...where },
    _sum: { total: true },
  });
  return { total: result._sum.total ? Number(result._sum.total) : null };
}

export async function countSales(
  ctx: DataContext,
  where: { cashSessionId?: string; status?: string },
): Promise<number> {
  if (isTest(ctx)) return store(ctx).countSales(where);
  return prisma.sale.count({
    where: { storeId: ctx.storeId, ...where },
  });
}

// ---- Cash Sessions ----
export async function findCashSessions(ctx: DataContext): Promise<StoredCashSession[]> {
  if (isTest(ctx)) return store(ctx).getCashSessions(ctx.storeId);

  const sessions = await prisma.cashSession.findMany({
    where: { storeId: ctx.storeId },
    include: {
      user: { select: { name: true } },
      _count: { select: { sales: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return sessions.map((s) => ({
    id: s.id,
    storeId: s.storeId,
    userId: s.userId,
    userName: s.user.name,
    openingAmount: Number(s.openingAmount),
    expectedAmount: s.expectedAmount ? Number(s.expectedAmount) : null,
    closingAmount: s.closingAmount ? Number(s.closingAmount) : null,
    difference: s.difference ? Number(s.difference) : null,
    notes: s.notes,
    closedAt: s.closedAt,
    createdAt: s.createdAt,
  })) as StoredCashSession[];
}

export async function findCashSession(
  ctx: DataContext,
  id: string,
): Promise<StoredCashSession | null> {
  if (isTest(ctx)) return store(ctx).getCashSession(id, ctx.storeId);

  const s = await prisma.cashSession.findFirst({
    where: { id, storeId: ctx.storeId },
    include: { user: { select: { name: true } } },
  });
  if (!s) return null;
  return {
    id: s.id,
    storeId: s.storeId,
    userId: s.userId,
    userName: s.user.name,
    openingAmount: Number(s.openingAmount),
    expectedAmount: s.expectedAmount ? Number(s.expectedAmount) : null,
    closingAmount: s.closingAmount ? Number(s.closingAmount) : null,
    difference: s.difference ? Number(s.difference) : null,
    notes: s.notes,
    closedAt: s.closedAt,
    createdAt: s.createdAt,
  } as StoredCashSession;
}

export async function findOpenCashSession(
  ctx: DataContext,
): Promise<StoredCashSession | null> {
  if (isTest(ctx)) return store(ctx).getOpenCashSession(ctx.storeId);

  const s = await prisma.cashSession.findFirst({
    where: { storeId: ctx.storeId, closedAt: null },
    include: {
      user: { select: { name: true } },
      _count: { select: { sales: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!s) return null;
  return {
    id: s.id,
    storeId: s.storeId,
    userId: s.userId,
    userName: s.user.name,
    openingAmount: Number(s.openingAmount),
    expectedAmount: null,
    closingAmount: null,
    difference: null,
    notes: s.notes,
    closedAt: null,
    createdAt: s.createdAt,
  } as StoredCashSession;
}

export async function createCashSession(
  ctx: DataContext,
  data: { openingAmount: number; notes: string | null },
): Promise<StoredCashSession> {
  if (isTest(ctx)) {
    const existing = store(ctx).getOpenCashSession(ctx.storeId);
    if (existing) throw new Error("SESSION_EXISTS");
    return store(ctx).createCashSession({
      storeId: ctx.storeId,
      userId: ctx.userId,
      ...data,
    });
  }

  const { prisma: db } = await import("@/lib/prisma");
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const existingOpen = await tx.cashSession.findFirst({
      where: { storeId: ctx.storeId, closedAt: null },
    });
    if (existingOpen) throw new Error("SESSION_EXISTS");

    const session = await tx.cashSession.create({
      data: {
        storeId: ctx.storeId,
        userId: ctx.userId,
        openingAmount: data.openingAmount,
        notes: data.notes ?? null,
      },
      include: { user: { select: { name: true } } },
    });

    return {
      id: session.id,
      storeId: session.storeId,
      userId: session.userId,
      userName: session.user.name,
      openingAmount: Number(session.openingAmount),
      expectedAmount: null,
      closingAmount: null,
      difference: null,
      notes: session.notes,
      closedAt: null,
      createdAt: session.createdAt,
    } as StoredCashSession;
  });
}

export async function closeCashSession(
  ctx: DataContext,
  id: string,
  data: { closingAmount: number; notes: string | null },
): Promise<StoredCashSession> {
  if (isTest(ctx)) {
    const session = store(ctx).getCashSession(id, ctx.storeId);
    if (!session) throw new Error("NOT_FOUND");
    if (session.closedAt) throw new Error("ALREADY_CLOSED");

    const cashSales = store(ctx).aggregateSalesTotal({
      cashSessionId: id,
      paymentMethod: "cash",
      status: "completed",
    });
    const total = cashSales.total ?? 0;
    const expectedAmount = session.openingAmount + total;
    const difference = data.closingAmount - expectedAmount;

    const updated = store(ctx).updateCashSession(id, {
      expectedAmount,
      closingAmount: data.closingAmount,
      difference,
      notes: data.notes ?? session.notes,
      closedAt: new Date(),
    });
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  }

  const { prisma: db } = await import("@/lib/prisma");
  const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const session = await tx.cashSession.findFirst({
      where: { id, storeId: ctx.storeId },
    });
    if (!session) throw new Error("NOT_FOUND");
    if (session.closedAt) throw new Error("ALREADY_CLOSED");

    const cashSales = await tx.sale.aggregate({
      where: {
        cashSessionId: id,
        paymentMethod: "cash",
        status: "completed",
      },
      _sum: { total: true },
    });
    const total = cashSales._sum.total ? Number(cashSales._sum.total) : 0;
    const expectedAmount = Number(session.openingAmount) + total;
    const difference = data.closingAmount - expectedAmount;

    return tx.cashSession.update({
      where: { id },
      data: {
        expectedAmount,
        closingAmount: data.closingAmount,
        difference,
        notes: data.notes ?? null,
        closedAt: new Date(),
      },
      include: {
        user: { select: { name: true } },
        _count: { select: { sales: true } },
      },
    });
  });

  return {
    id: updated.id,
    storeId: updated.storeId,
    userId: updated.userId,
    userName: updated.user.name,
    openingAmount: Number(updated.openingAmount),
    expectedAmount: updated.expectedAmount ? Number(updated.expectedAmount) : null,
    closingAmount: updated.closingAmount ? Number(updated.closingAmount) : null,
    difference: updated.difference ? Number(updated.difference) : null,
    notes: updated.notes,
    closedAt: updated.closedAt,
    createdAt: updated.createdAt,
  } as StoredCashSession;
}

// ---- Stock Movements ----
export async function findStockMovements(
  ctx: DataContext,
  filters?: { productId?: string; type?: string; from?: string; to?: string },
): Promise<StoredStockMovement[]> {
  if (isTest(ctx)) return store(ctx).getStockMovements(ctx.storeId);

  const where: Record<string, unknown> = { storeId: ctx.storeId };
  if (filters?.productId) where.productId = filters.productId;
  if (filters?.type) where.type = filters.type;
  if (filters?.from || filters?.to) {
    const createdAt: Record<string, Date> = {};
    if (filters?.from) createdAt.gte = new Date(filters.from);
    if (filters?.to) createdAt.lte = new Date(filters.to);
    where.createdAt = createdAt;
  }

  return prisma.stockMovement.findMany({
    where: where as any,
    include: {
      user: { select: { name: true } },
      product: { select: { name: true, barcode: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  }) as unknown as StoredStockMovement[];
}

export async function adjustStock(
  ctx: DataContext,
  data: { productId: string; quantity: number; reason: string },
): Promise<{ productId: string; previousStock: number; newStock: number; quantity: number; reason: string }> {
  if (isTest(ctx)) {
    const product = store(ctx).getProduct(data.productId, ctx.storeId);
    if (!product) throw new Error("NOT_FOUND");
    const newStock = product.stock + data.quantity;
    if (newStock < 0) throw new Error("STOCK_NEGATIVE");

    store(ctx).updateProduct(data.productId, { stock: newStock });
    store(ctx).createStockMovement({
      storeId: ctx.storeId,
      productId: data.productId,
      userId: ctx.userId,
      type: "MANUAL_ADJUSTMENT",
      quantity: data.quantity,
      previousStock: product.stock,
      newStock,
      reason: data.reason.trim(),
    });

    return {
      productId: data.productId,
      previousStock: product.stock,
      newStock,
      quantity: data.quantity,
      reason: data.reason.trim(),
    };
  }

  const [updated] = await prisma.$transaction([
    prisma.product.update({
      where: { id: data.productId },
      data: { stock: { increment: data.quantity } },
    }),
    prisma.stockMovement.create({
      data: {
        storeId: ctx.storeId,
        productId: data.productId,
        userId: ctx.userId,
        type: "MANUAL_ADJUSTMENT",
        quantity: data.quantity,
        previousStock: 0,
        newStock: 0,
        reason: data.reason.trim(),
      },
    }),
  ]);

  return {
    productId: updated.id,
    previousStock: 0,
    newStock: 0,
    quantity: data.quantity,
    reason: data.reason.trim(),
  };
}

// ---- Suspended Sales ----
export async function findSuspendedSales(ctx: DataContext): Promise<StoredSuspendedSale[]> {
  if (isTest(ctx)) return store(ctx).getSuspendedSales(ctx.storeId);

  return prisma.suspendedSale.findMany({
    where: { storeId: ctx.storeId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  }) as unknown as StoredSuspendedSale[];
}

export async function findSuspendedSale(
  ctx: DataContext,
  id: string,
): Promise<StoredSuspendedSale | null> {
  if (isTest(ctx)) return store(ctx).getSuspendedSale(id, ctx.storeId);

  return prisma.suspendedSale.findFirst({
    where: { id, storeId: ctx.storeId },
    include: { items: true },
  }) as unknown as StoredSuspendedSale | null;
}

export async function createSuspendedSale(
  ctx: DataContext,
  data: {
    total: number;
    itemCount: number;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  },
): Promise<StoredSuspendedSale> {
  if (isTest(ctx)) {
    return store(ctx).createSuspendedSale({
      storeId: ctx.storeId,
      userId: ctx.userId,
      ...data,
    });
  }

  return prisma.suspendedSale.create({
    data: {
      storeId: ctx.storeId,
      userId: ctx.userId,
      total: data.total,
      itemCount: data.itemCount,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      },
    },
    include: { items: true },
  }) as unknown as StoredSuspendedSale;
}

export async function deleteSuspendedSale(
  ctx: DataContext,
  id: string,
): Promise<boolean> {
  if (isTest(ctx)) return store(ctx).deleteSuspendedSale(id);
  await prisma.suspendedSale.delete({ where: { id } });
  return true;
}
