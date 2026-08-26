import { prisma } from "@/lib/prisma";
import { isTestUserEmail } from "@/lib/test-users";
import {
  getOrCreateSessionStore,
  type StoredProduct,
  type StoredProductPresentation,
  type StoredCategory,
  type StoredSale,
  type StoredCashSession,
  type StoredStockMovement,
  type StoredSuspendedSale,
} from "@/lib/session-store";
import { Prisma } from "@prisma/client";
import {
  assertValidUnitForQuantityType,
  decimalToNumber,
  normalizeQuantityType,
  normalizeUnit,
  toDecimal,
} from "@/lib/decimal";
import type {
  ProductPresentation,
  ProductUnit,
  QuantityType,
} from "@/lib/types";

export class CashSessionExistsError extends Error {
  public readonly openSessionId: string;

  constructor(openSessionId: string) {
    super("SESSION_EXISTS");
    this.name = "CashSessionExistsError";
    this.openSessionId = openSessionId;
  }
}

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
function mapPrismaProductToStored(p: any): StoredProduct {
  const presentations: StoredProductPresentation[] = Array.isArray(p?.presentations)
    ? p.presentations
        .map((pr: any) => ({
          id: pr.id,
          productId: pr.productId,
          name: pr.name,
          quantity: decimalToNumber(pr.quantity),
          unit: pr.unit,
          active: pr.active,
          sortOrder: pr.sortOrder ?? 0,
          createdAt: pr.createdAt,
          updatedAt: pr.updatedAt,
        }))
        .sort((a: StoredProductPresentation, b: StoredProductPresentation) => a.sortOrder - b.sortOrder)
    : [];
  return {
    id: p.id,
    storeId: p.storeId,
    barcode: p.barcode ?? null,
    name: p.name,
    description: p.description ?? null,
    categoryId: p.categoryId,
    globalProductId: p.globalProductId ?? null,
    globalProductImageUrl: p.globalProduct?.imageUrl ?? null,
    globalProductCloudinaryPublicId: p.globalProduct?.cloudinaryPublicId ?? null,
    price: decimalToNumber(p.price),
    cost: decimalToNumber(p.cost),
    stock: decimalToNumber(p.stock),
    minStock: decimalToNumber(p.minStock),
    quantityType: p.quantityType ?? "DISCRETA",
    unit: p.unit ?? "unit",
    presentations,
    imageUrl: p.imageUrl !== undefined ? p.imageUrl : null,
    cloudinaryPublicId: p.cloudinaryPublicId !== undefined ? p.cloudinaryPublicId : null,
    status: p.status ?? "ACTIVE",
    mergedIntoId: p.mergedIntoId ?? null,
    mergedAt: p.mergedAt ?? null,
    mergedByUserId: p.mergedByUserId ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function normalizePresentations(
  presentations: ProductPresentation[] | undefined,
  expectedUnit: string,
): ProductPresentation[] {
  if (!presentations || presentations.length === 0) return [];
  return presentations.map((p) => {
    if (p.unit !== expectedUnit) {
      throw new Error(
        `La presentación "${p.name}" usa la unidad "${p.unit}" pero la unidad del producto es "${expectedUnit}"`,
      );
    }
    if (!Number.isFinite(p.quantity) || p.quantity <= 0) {
      throw new Error(`La presentación "${p.name}" requiere una cantidad positiva`);
    }
    return {
      id: p.id,
      productId: p.productId,
      name: p.name.trim(),
      quantity: p.quantity,
      unit: p.unit,
      active: p.active ?? true,
      sortOrder: p.sortOrder ?? 0,
    };
  });
}

function buildProductData(data: any) {
  const quantityType = normalizeQuantityType(data.quantityType ?? "DISCRETA");
  const unit = normalizeUnit(data.unit, quantityType);
  assertValidUnitForQuantityType(unit, quantityType);

  const out: Record<string, unknown> = { quantityType, unit };
  if (data.price !== undefined) out.price = toDecimal(data.price);
  if (data.cost !== undefined) out.cost = toDecimal(data.cost);
  if (data.stock !== undefined) out.stock = toDecimal(data.stock);
  if (data.minStock !== undefined) out.minStock = toDecimal(data.minStock);
  if (data.name !== undefined) out.name = data.name;
  if (data.description !== undefined) out.description = data.description ?? null;
  if (data.categoryId !== undefined) out.categoryId = data.categoryId;
  if (data.globalProductId !== undefined) out.globalProductId = data.globalProductId ?? null;
  if (data.barcode !== undefined) out.barcode = data.barcode ?? null;
  if (data.imageUrl !== undefined) out.imageUrl = data.imageUrl ?? null;
  if (data.cloudinaryPublicId !== undefined)
    out.cloudinaryPublicId = data.cloudinaryPublicId ?? null;
  return { out, quantityType, unit };
}

export async function findProducts(ctx: DataContext): Promise<StoredProduct[]> {
  if (isTest(ctx)) return store(ctx).getProducts(ctx.storeId);
  const products = await prisma.product.findMany({
    where: { storeId: ctx.storeId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      presentations: { orderBy: { sortOrder: "asc" } },
      globalProduct: { select: { id: true, imageUrl: true, cloudinaryPublicId: true } },
    },
  });
  return products.map(mapPrismaProductToStored);
}

export async function findProduct(
  ctx: DataContext,
  id: string,
): Promise<StoredProduct | null> {
  if (isTest(ctx)) return store(ctx).getProduct(id, ctx.storeId);
  const product = await prisma.product.findFirst({
    where: { id, storeId: ctx.storeId },
    include: {
      presentations: { orderBy: { sortOrder: "asc" } },
      globalProduct: { select: { id: true, imageUrl: true, cloudinaryPublicId: true } },
    },
  });
  return product ? mapPrismaProductToStored(product) : null;
}

export async function findProductByBarcode(
  ctx: DataContext,
  barcode: string,
  excludeId?: string,
): Promise<StoredProduct | null> {
  if (isTest(ctx)) return store(ctx).getProductByBarcode(barcode, ctx.storeId);
  const where: any = { barcode, storeId: ctx.storeId, status: "ACTIVE" };
  if (excludeId) where.NOT = { id: excludeId };
  const product = await prisma.product.findFirst({
    where,
    include: {
      presentations: { orderBy: { sortOrder: "asc" } },
      globalProduct: { select: { id: true, imageUrl: true, cloudinaryPublicId: true } },
    },
  });
  return product ? mapPrismaProductToStored(product) : null;
}

export type CreateProductInput = {
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string;
  globalProductId?: string | null;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  quantityType?: QuantityType;
  unit?: ProductUnit | string;
  presentations?: ProductPresentation[];
  imageUrl?: string | null;
  cloudinaryPublicId?: string | null;
};

export type UpdateProductInput = Partial<{
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string;
  globalProductId: string | null;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  quantityType: QuantityType;
  unit: ProductUnit | string;
  presentations: ProductPresentation[];
  imageUrl: string | null;
  cloudinaryPublicId: string | null;
  reason: string;
}>;

export async function createProduct(
  ctx: DataContext,
  data: CreateProductInput,
): Promise<StoredProduct> {
  const { out, quantityType, unit } = buildProductData(data);
  const normalizedPresentations = normalizePresentations(
    data.presentations,
    unit,
  );

  if (isTest(ctx)) {
    const product = store(ctx).createProduct({
      storeId: ctx.storeId,
      barcode: data.barcode,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      price: data.price,
      cost: data.cost,
      stock: data.stock,
      minStock: data.minStock,
      quantityType,
      unit,
      presentations: normalizedPresentations as any,
      imageUrl: data.imageUrl,
      cloudinaryPublicId: data.cloudinaryPublicId,
    });
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
      data: {
        storeId: ctx.storeId,
        ...out,
        presentations: normalizedPresentations.length > 0
          ? {
              create: normalizedPresentations.map((p, idx) => ({
                name: p.name,
                quantity: toDecimal(p.quantity),
                unit: p.unit,
                active: p.active ?? true,
                sortOrder: p.sortOrder ?? idx,
              })),
            }
          : undefined,
      } as Prisma.ProductUncheckedCreateInput,
      include: { presentations: { orderBy: { sortOrder: "asc" } } },
    });
    if (decimalToNumber(created.stock) > 0) {
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
    return mapPrismaProductToStored(created);
  });
}

export async function updateProduct(
  ctx: DataContext,
  id: string,
  data: UpdateProductInput,
): Promise<StoredProduct | null> {
  if (isTest(ctx)) {
    const currentStock = store(ctx).getProductStock(id);
    const prev = store(ctx).getProduct(id, ctx.storeId);
    if (!prev) return null;

    const { out, quantityType, unit } = buildProductData({
      ...(data as UpdateProductInput),
      quantityType: data.quantityType ?? prev.quantityType,
      unit: data.unit ?? prev.unit,
    });
    const normalizedPresentations =
      data.presentations !== undefined
        ? normalizePresentations(data.presentations, unit)
        : undefined;

    const testSafeOut: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(out)) {
      testSafeOut[key] =
        value && typeof value === "object" && "toNumber" in (value as object)
          ? (value as { toNumber: () => number }).toNumber()
          : value;
    }

    const updatePayload: Record<string, unknown> = {
      ...data,
      ...testSafeOut,
      presentations: undefined,
    };
    delete updatePayload.reason;

    const stockChanged =
      data.stock !== undefined && data.stock !== currentStock;
    const updated = store(ctx).updateProduct(id, updatePayload as any);
    if (normalizedPresentations) {
      (updated as any).presentations = normalizedPresentations;
    }
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

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const current = await tx.product.findFirst({
      where: { id, storeId: ctx.storeId },
      select: { stock: true, quantityType: true, unit: true },
    });
    if (!current) throw new Error("NOT_FOUND");

    const merged: UpdateProductInput = {
      ...data,
      quantityType: data.quantityType ?? (current.quantityType as QuantityType),
      unit: data.unit ?? current.unit,
    };
    const { out } = buildProductData(merged);
    const effectiveUnit = normalizeUnit(merged.unit, normalizeQuantityType(merged.quantityType));

    const dataForUpdate: Prisma.ProductUncheckedUpdateInput = {
      ...(out as Prisma.ProductUncheckedUpdateInput),
    } as Prisma.ProductUncheckedUpdateInput;

    if (data.presentations !== undefined) {
      const normalized = normalizePresentations(data.presentations, effectiveUnit);
      await tx.productPresentation.deleteMany({ where: { productId: id } });
      if (normalized.length > 0) {
        await tx.productPresentation.createMany({
          data: normalized.map((p, idx) => ({
            productId: id,
            name: p.name,
            quantity: toDecimal(p.quantity),
            unit: p.unit,
            active: p.active ?? true,
            sortOrder: p.sortOrder ?? idx,
          })),
        });
      }
    }

    const product = await tx.product.update({
      where: { id },
      data: dataForUpdate,
      include: { presentations: { orderBy: { sortOrder: "asc" } } },
    });

    const newStock = decimalToNumber(product.stock);
    const oldStock = decimalToNumber(current.stock);
    if (data.stock !== undefined && newStock !== oldStock) {
      await tx.stockMovement.create({
        data: {
          storeId: ctx.storeId,
          productId: id,
          userId: ctx.userId,
          type: "STOCK_CORRECTION",
          quantity: toDecimal(newStock - oldStock),
          previousStock: current.stock,
          newStock: product.stock,
          reason: data.reason?.trim() ?? null,
        },
      });
    }
    return mapPrismaProductToStored(product);
  });
}

export async function deleteProduct(
  ctx: DataContext,
  id: string,
): Promise<boolean> {
  if (isTest(ctx)) return store(ctx).deleteProduct(id);
  try {
    const result = await prisma.product.deleteMany({ where: { id, storeId: ctx.storeId } });
    return result.count > 0;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new Error("PRODUCT_HAS_TRANSACTIONS");
    }
    throw error;
  }
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
  const existing = await prisma.category.findFirst({
    where: { id, storeId: ctx.storeId },
    select: { id: true },
  });
  if (!existing) return null;
  return prisma.category.update({
    where: { id: existing.id },
    data,
  }) as unknown as StoredCategory;
}

export async function deleteCategory(
  ctx: DataContext,
  id: string,
): Promise<boolean> {
  if (isTest(ctx)) return store(ctx).deleteCategory(id);
  const result = await prisma.category.deleteMany({ where: { id, storeId: ctx.storeId } });
  return result.count > 0;
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
    userName: s.user.name ?? s.userId,
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
    userName: s.user.name ?? s.userId,
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

  // Returns the most recently created open cash session for the store,
  // regardless of the date it was created. Callers must decide whether a
  // session from a previous day should be treated as stale/pending.
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
    userName: s.user.name ?? s.userId,
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
  data: { openingAmount: number; notes: string | null; userName?: string },
): Promise<StoredCashSession> {
  if (isTest(ctx)) {
    const existing = store(ctx).getOpenCashSession(ctx.storeId);
    if (existing) throw new CashSessionExistsError(existing.id);
    return store(ctx).createCashSession({
      storeId: ctx.storeId,
      userId: ctx.userId,
      userName: data.userName,
      openingAmount: data.openingAmount,
      notes: data.notes,
    });
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existingOpen = await tx.cashSession.findFirst({
      where: { storeId: ctx.storeId, closedAt: null },
    });
    if (existingOpen) throw new CashSessionExistsError(existingOpen.id);

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
      userName: session.user.name ?? session.userId,
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

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    userName: updated.user.name ?? updated.userId,
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

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: data.productId, storeId: ctx.storeId },
      select: { id: true, stock: true },
    });
    if (!product) throw new Error("NOT_FOUND");

    const previousStock = decimalToNumber(product.stock);
    const newStock = previousStock + data.quantity;
    if (newStock < 0) throw new Error("STOCK_NEGATIVE");

    const updated = await tx.product.update({
      where: { id: product.id },
      data: { stock: { increment: data.quantity } },
    });

    await tx.stockMovement.create({
      data: {
        storeId: ctx.storeId,
        productId: data.productId,
        userId: ctx.userId,
        type: "MANUAL_ADJUSTMENT",
        quantity: data.quantity,
        previousStock,
        newStock,
        reason: data.reason.trim(),
      },
    });

    return { id: updated.id, previousStock, newStock };
  });

  return {
    productId: result.id,
    previousStock: result.previousStock,
    newStock: result.newStock,
    quantity: data.quantity,
    reason: data.reason.trim(),
  };
}

export async function recordOwnerWithdrawal(
  ctx: DataContext,
  data: { productId: string; quantity: number; reason?: string },
): Promise<{ productId: string; previousStock: number; newStock: number; quantity: number; reason: string }> {
  const trimmedReason = (data.reason ?? "").trim();

  if (isTest(ctx)) {
    const product = store(ctx).getProduct(data.productId, ctx.storeId);
    if (!product) throw new Error("NOT_FOUND");
    const newStock = product.stock - data.quantity;
    if (newStock < 0) throw new Error("STOCK_NEGATIVE");

    store(ctx).updateProduct(data.productId, { stock: newStock });
    store(ctx).createStockMovement({
      storeId: ctx.storeId,
      productId: data.productId,
      userId: ctx.userId,
      type: "OWNER_WITHDRAWAL",
      quantity: -data.quantity,
      previousStock: product.stock,
      newStock,
      reason: trimmedReason,
    });

    return {
      productId: data.productId,
      previousStock: product.stock,
      newStock,
      quantity: -data.quantity,
      reason: trimmedReason,
    };
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const product = await tx.product.findFirst({
      where: { id: data.productId, storeId: ctx.storeId },
      select: { id: true, stock: true },
    });
    if (!product) throw new Error("NOT_FOUND");

    const previousStock = product.stock;
    const newStock = toDecimal(decimalToNumber(previousStock) - data.quantity);
    if (decimalToNumber(newStock) < 0) throw new Error("STOCK_NEGATIVE");

    await tx.product.update({
      where: { id: product.id },
      data: { stock: { decrement: data.quantity } },
    });

    await tx.stockMovement.create({
      data: {
        storeId: ctx.storeId,
        productId: product.id,
        userId: ctx.userId,
        type: "OWNER_WITHDRAWAL",
        quantity: -data.quantity,
        previousStock,
        newStock,
        reason: trimmedReason,
      },
    });

    return {
      productId: product.id,
      previousStock: decimalToNumber(previousStock),
      newStock: decimalToNumber(newStock),
      quantity: -data.quantity,
      reason: trimmedReason,
    };
  });
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
      presentationId?: string | null;
      presentationName?: string | null;
      baseQuantity?: number;
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
          presentationId: item.presentationId ?? null,
          presentationName: item.presentationName ?? null,
          baseQuantity: item.baseQuantity ?? item.quantity,
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
  const result = await prisma.suspendedSale.deleteMany({ where: { id, storeId: ctx.storeId } });
  return result.count > 0;
}

// ---- Global Products ----

export function generateNormalizedKey(data: {
  name: string;
  brand?: string | null;
  presentation?: string | null;
  unit?: string | null;
}): string {
  const parts = [
    data.name.trim().toLowerCase(),
    data.brand?.trim().toLowerCase() || "",
    data.presentation?.trim().toLowerCase() || "",
    data.unit?.trim().toLowerCase() || "",
  ].filter(Boolean);
  return parts.join("|");
}

export async function findGlobalProductByBarcode(
  barcode: string,
): Promise<GlobalProductRecord | null> {
  if (!barcode) return null;
  const gp = await prisma.globalProduct.findUnique({
    where: { barcode },
    include: { _count: { select: { products: true } } },
  });
  return gp ? mapGlobalProduct(gp) : null;
}

export async function findGlobalProductByKey(
  normalizedKey: string,
): Promise<GlobalProductRecord | null> {
  const gp = await prisma.globalProduct.findUnique({
    where: { normalizedKey },
    include: { _count: { select: { products: true } } },
  });
  return gp ? mapGlobalProduct(gp) : null;
}

export async function findGlobalProduct(
  id: string,
): Promise<GlobalProductRecord | null> {
  const gp = await prisma.globalProduct.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  return gp ? mapGlobalProduct(gp) : null;
}

export type GlobalProductRecord = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  presentation: string | null;
  unit: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  cloudinaryPublicId: string | null;
  normalizedKey: string;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
};

function mapGlobalProduct(gp: any): GlobalProductRecord {
  return {
    id: gp.id,
    name: gp.name,
    brand: gp.brand ?? null,
    barcode: gp.barcode ?? null,
    presentation: gp.presentation ?? null,
    unit: gp.unit ?? null,
    categoryId: gp.categoryId ?? null,
    imageUrl: gp.imageUrl ?? null,
    cloudinaryPublicId: gp.cloudinaryPublicId ?? null,
    normalizedKey: gp.normalizedKey,
    productCount: gp._count?.products ?? 0,
    createdAt: gp.createdAt,
    updatedAt: gp.updatedAt,
  };
}

export type CreateGlobalProductInput = {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  presentation?: string | null;
  unit?: string | null;
  categoryId?: string | null;
  imageUrl?: string | null;
  cloudinaryPublicId?: string | null;
};

export async function createGlobalProduct(
  data: CreateGlobalProductInput,
): Promise<GlobalProductRecord> {
  const normalizedKey = generateNormalizedKey({
    name: data.name,
    brand: data.brand,
    presentation: data.presentation,
    unit: data.unit,
  });

  const gp = await prisma.globalProduct.create({
    data: {
      name: data.name.trim(),
      brand: data.brand?.trim() || null,
      barcode: data.barcode?.trim() || null,
      presentation: data.presentation?.trim() || null,
      unit: data.unit?.trim() || null,
      categoryId: data.categoryId || null,
      imageUrl: data.imageUrl || null,
      cloudinaryPublicId: data.cloudinaryPublicId || null,
      normalizedKey,
    },
    include: { _count: { select: { products: true } } },
  });
  return mapGlobalProduct(gp);
}

export async function findOrCreateGlobalProduct(data: {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  presentation?: string | null;
  unit?: string | null;
  categoryId?: string | null;
  imageUrl?: string | null;
  cloudinaryPublicId?: string | null;
}): Promise<GlobalProductRecord> {
  // Priority 1: match by barcode
  if (data.barcode) {
    const existing = await findGlobalProductByBarcode(data.barcode);
    if (existing) return existing;
  }

  // Priority 2: match by normalized key
  const key = generateNormalizedKey({
    name: data.name,
    brand: data.brand,
    presentation: data.presentation,
    unit: data.unit,
  });
  const existingByKey = await findGlobalProductByKey(key);
  if (existingByKey) return existingByKey;

  // Not found: create new
  return createGlobalProduct(data);
}

export async function deleteGlobalProductIfUnused(
  globalProductId: string,
): Promise<boolean> {
  const count = await prisma.product.count({
    where: { globalProductId },
  });
  if (count > 0) return false;

  const gp = await prisma.globalProduct.findUnique({
    where: { id: globalProductId },
  });
  if (!gp) return false;

  await prisma.globalProduct.delete({ where: { id: globalProductId } });
  return true;
}
