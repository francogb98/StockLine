import { Prisma } from "@prisma/client";
import type { PaymentMethod } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { getTaxConfig, calculateTax } from "@/lib/tax-config";

const MAX_TRANSACTION_RETRIES = 3;
const TRANSACTION_TIMEOUT_MS = 15_000;

type SaleItemInput = {
  productId: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
};

type SalePayload = {
  items: SaleItemInput[];
  subtotal?: number;
  tax?: number;
  total?: number;
  paymentMethod: PaymentMethod;
  createdAt?: string | Date;
};

type ProductRecord = {
  id: string;
  storeId: string;
  name: string;
  price: number;
  stock: number;
};

export class SaleProcessingError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "SaleProcessingError";
    this.statusCode = statusCode;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertPositiveInteger(value: number, message: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new SaleProcessingError(message, 400);
  }
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  if (value === "cash" || value === "card" || value === "transfer") {
    return value;
  }

  throw new SaleProcessingError("Método de pago inválido", 400);
}

function normalizeSalePayload(rawPayload: unknown): SalePayload {
  if (!rawPayload || typeof rawPayload !== "object") {
    throw new SaleProcessingError("Payload de venta inválido", 400);
  }

  const payload = rawPayload as Record<string, unknown>;

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new SaleProcessingError("La venta debe incluir items", 400);
  }

  // Amounts are optional — when omitted (e.g. offline sync), the server
  // recalculates from current product prices and skips the match check.
  const subtotal =
    payload.subtotal !== undefined && payload.subtotal !== null
      ? (payload.subtotal as number)
      : undefined;

  const tax =
    payload.tax !== undefined && payload.tax !== null
      ? (payload.tax as number)
      : undefined;

  const total =
    payload.total !== undefined && payload.total !== null
      ? (payload.total as number)
      : undefined;

  const items = payload.items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new SaleProcessingError(
        `Item inválido en posición ${index + 1}`,
        400,
      );
    }

    const rawItem = item as Record<string, unknown>;
    const productId = rawItem.productId;
    const quantity = rawItem.quantity;

    if (typeof productId !== "string" || productId.trim() === "") {
      throw new SaleProcessingError(
        `Producto inválido en posición ${index + 1}`,
        400,
      );
    }

    if (!isFiniteNumber(quantity)) {
      throw new SaleProcessingError(
        `Cantidad inválida en posición ${index + 1}`,
        400,
      );
    }

    assertPositiveInteger(
      quantity,
      `Cantidad inválida en posición ${index + 1}`,
    );

    if (rawItem.unitPrice !== undefined) {
      if (!isFiniteNumber(rawItem.unitPrice) || rawItem.unitPrice < 0) {
        throw new SaleProcessingError(
          `Precio unitario inválido en posición ${index + 1}`,
          400,
        );
      }
    }

    if (rawItem.total !== undefined) {
      if (!isFiniteNumber(rawItem.total) || rawItem.total < 0) {
        throw new SaleProcessingError(
          `Total de item inválido en posición ${index + 1}`,
          400,
        );
      }
    }

    return {
      productId,
      quantity,
      unitPrice: isFiniteNumber(rawItem.unitPrice)
        ? rawItem.unitPrice
        : undefined,
      total: isFiniteNumber(rawItem.total) ? rawItem.total : undefined,
    };
  });

  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);

  let createdAt: Date | undefined;
  if (payload.createdAt !== undefined) {
    const parsedCreatedAt = new Date(payload.createdAt as string | Date);
    if (Number.isNaN(parsedCreatedAt.getTime())) {
      throw new SaleProcessingError("Fecha de venta inválida", 400);
    }
    createdAt = parsedCreatedAt;
  }

  return {
    items,
    subtotal,
    tax,
    total,
    paymentMethod,
    createdAt,
  };
}

function aggregateItems(items: SaleItemInput[]) {
  const aggregated = new Map<string, SaleItemInput & { quantity: number }>();

  for (const item of items) {
    const existing = aggregated.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      aggregated.set(item.productId, { ...item });
    }
  }

  return [...aggregated.values()];
}

function ensureMatchingAmount(
  label: string,
  expected: number,
  received: number | undefined,
) {
  if (received === undefined) return; // server-computed, skip check
  if (Math.abs(roundCurrency(expected) - roundCurrency(received)) > 0.01) {
    throw new SaleProcessingError(
      `Los importes de la venta no coinciden (${label})`,
      400,
    );
  }
}

function isRetryableTransactionError(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }
  const code = (error as { code?: string }).code;
  return code === "P2034" || code === "P2028";
}

export async function createSale(
  rawPayload: unknown,
  auth: { storeId: string; userId: string; cashSessionId?: string },
) {
  const payload = normalizeSalePayload(rawPayload);
  const normalizedItems = aggregateItems(payload.items);

  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
    const txStart = Date.now();
    try {
      const store = await prisma.store.findUnique({
        where: { id: auth.storeId },
        select: { config: true },
      });
      const taxConfig = getTaxConfig(store?.config as Record<string, unknown> | null);

      const sale = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const stepStart = Date.now();

          const productIds = normalizedItems.map((item) => item.productId);
          const products = await tx.product.findMany({
            where: { id: { in: productIds }, storeId: auth.storeId },
            select: {
              id: true,
              storeId: true,
              name: true,
              price: true,
              stock: true,
            },
          });

          const productById = new Map<string, ProductRecord>(
            products.map((product) => [product.id, { ...product, price: Number(product.price) }]),
          );

          const missingProductIds = productIds.filter(
            (id) => !productById.has(id),
          );
          if (missingProductIds.length > 0) {
            throw new SaleProcessingError(
              `Producto(s) no encontrado(s): ${missingProductIds.join(", ")}`,
              404,
            );
          }

          let computedSubtotal = 0;
          const previousStockMap = new Map<string, number>();
          const saleItems = normalizedItems.map((item) => {
            const product = productById.get(item.productId);
            if (!product) {
              throw new SaleProcessingError("Producto inexistente", 404);
            }

            assertPositiveInteger(item.quantity, "Cantidad inválida");

            previousStockMap.set(product.id, product.stock);

            const itemTotal = roundCurrency(product.price * item.quantity);
            computedSubtotal = roundCurrency(computedSubtotal + itemTotal);

            return {
              productId: product.id,
              productName: product.name,
              quantity: item.quantity,
              unitPrice: product.price,
              total: itemTotal,
            };
          });

          const computedTax = calculateTax(computedSubtotal, taxConfig);
          const computedTotal = roundCurrency(computedSubtotal + computedTax);

          ensureMatchingAmount("subtotal", computedSubtotal, payload.subtotal);
          ensureMatchingAmount("tax", computedTax, payload.tax);
          ensureMatchingAmount("total", computedTotal, payload.total);

          const stockUpdates = await Promise.all(
            saleItems.map((item) =>
              tx.product.updateMany({
                where: {
                  id: item.productId,
                  storeId: auth.storeId,
                  stock: { gte: item.quantity },
                },
                data: {
                  stock: { decrement: item.quantity },
                },
              }),
            ),
          );

          for (const [index, stockUpdate] of stockUpdates.entries()) {
            if (stockUpdate.count !== 1) {
              throw new SaleProcessingError(
                `Stock insuficiente para ${saleItems[index].productName}`,
                409,
              );
            }
          }

          const sale = await tx.sale.create({
            data: {
              storeId: auth.storeId,
              userId: auth.userId,
              cashSessionId: auth.cashSessionId ?? null,
              subtotal: computedSubtotal,
              tax: computedTax,
              total: computedTotal,
              paymentMethod: payload.paymentMethod,
              createdAt: payload.createdAt ?? undefined,
              items: {
                create: saleItems.map((item) => ({
                  productId: item.productId,
                  productName: item.productName,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: item.total,
                })),
              },
            },
            include: {
              items: true,
            },
          });

          await tx.stockMovement.createMany({
            data: saleItems.map((item) => {
              const prev = previousStockMap.get(item.productId)!;
              return {
                storeId: auth.storeId,
                productId: item.productId,
                userId: auth.userId,
                type: "SALE" as const,
                quantity: -item.quantity,
                previousStock: prev,
                newStock: prev - item.quantity,
                referenceId: sale.id,
              };
            }),
          });

          console.info(
            `[Sale] tx committed in ${Date.now() - stepStart}ms — ${saleItems.length} items, total=${computedTotal}`,
          );

          return sale;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: TRANSACTION_TIMEOUT_MS,
          maxWait: TRANSACTION_TIMEOUT_MS,
        },
      );

      console.info(
        `[Sale] attempt ${attempt} completed in ${Date.now() - txStart}ms`,
      );

      return sale;
    } catch (error) {
      const elapsed = Date.now() - txStart;
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string }).code
          : undefined;

      console.error(
        `[Sale] attempt ${attempt} failed in ${elapsed}ms — code=${code ?? "none"}, message=${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      if (isRetryableTransactionError(error) && attempt < MAX_TRANSACTION_RETRIES) {
        console.warn(
          `[Sale] retrying (attempt ${attempt + 1}/${MAX_TRANSACTION_RETRIES})`,
        );
        continue;
      }

      if (isRetryableTransactionError(error)) {
        throw new SaleProcessingError(
          "Conflicto de concurrencia al registrar la venta",
          409,
        );
      }

      throw error;
    }
  }

  throw new SaleProcessingError(
    "Conflicto de concurrencia al registrar la venta",
    409,
  );
}
