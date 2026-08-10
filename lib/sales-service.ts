import { Prisma } from "@prisma/client";
import type { PaymentMethod } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { getTaxConfig, calculateTax } from "@/lib/tax-config";
import { toDecimal, decimalToNumber, roundMoney } from "@/lib/decimal";

const MAX_TRANSACTION_RETRIES = 3;
const TRANSACTION_TIMEOUT_MS = 15_000;

type SaleItemInput = {
  productId: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
  presentationId?: string | null;
  presentationName?: string | null;
  baseQuantity?: number;
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
  quantityType: "DISCRETA" | "CONTINUA";
  unit: string;
  presentations: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    active: boolean;
  }>;
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

function assertPositiveNumber(value: number, message: string) {
  if (!Number.isFinite(value) || value <= 0) {
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
    assertPositiveNumber(quantity, `Cantidad inválida en posición ${index + 1}`);

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
    if (rawItem.baseQuantity !== undefined) {
      const bq = rawItem.baseQuantity;
      if (!isFiniteNumber(bq) || bq < 0) {
        throw new SaleProcessingError(
          `Cantidad base inválida en posición ${index + 1}`,
          400,
        );
      }
    }

    return {
      productId,
      quantity,
      unitPrice: isFiniteNumber(rawItem.unitPrice) ? rawItem.unitPrice : undefined,
      total: isFiniteNumber(rawItem.total) ? rawItem.total : undefined,
      presentationId:
        typeof rawItem.presentationId === "string"
          ? rawItem.presentationId
          : null,
      presentationName:
        typeof rawItem.presentationName === "string"
          ? rawItem.presentationName
          : null,
      baseQuantity: isFiniteNumber(rawItem.baseQuantity)
        ? rawItem.baseQuantity
        : undefined,
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
  // Aggregate by (productId, presentationId) so that two lines for the same
  // product in the same presentation collapse into one. Different
  // presentations stay separate so the presentation flow is preserved.
  const aggregated = new Map<
    string,
    SaleItemInput & { quantity: number; baseQuantity?: number }
  >();

  for (const item of items) {
    const key = `${item.productId}::${item.presentationId ?? ""}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      if (item.baseQuantity !== undefined) {
        existing.baseQuantity =
          (existing.baseQuantity ?? existing.quantity) + item.baseQuantity;
      }
    } else {
      aggregated.set(key, { ...item });
    }
  }
  return [...aggregated.values()];
}

function ensureMatchingAmount(
  label: string,
  expected: number,
  received: number | undefined,
) {
  if (received === undefined) return;
  if (Math.abs(roundMoney(expected) - roundMoney(received)) > 0.01) {
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

function resolvePresentation(
  item: SaleItemInput,
  product: ProductRecord,
):
  | { id: string; name: string; quantity: number; unit: string }
  | null {
  if (!item.presentationId) return null;
  const pres = product.presentations.find(
    (p) => p.id === item.presentationId,
  );
  if (!pres) {
    throw new SaleProcessingError(
      `La presentación no pertenece al producto "${product.name}"`,
      400,
    );
  }
  if (!pres.active) {
    throw new SaleProcessingError(
      `La presentación "${pres.name}" está inactiva`,
      400,
    );
  }
  if (pres.unit !== product.unit) {
    throw new SaleProcessingError(
      `La presentación "${pres.name}" no coincide con la unidad del producto`,
      400,
    );
  }
  return pres;
}

function computeBaseQuantity(
  item: SaleItemInput,
  presentation: ReturnType<typeof resolvePresentation>,
  product: ProductRecord,
): number {
  if (item.baseQuantity !== undefined) {
    return item.baseQuantity;
  }
  if (presentation) {
    return item.quantity * presentation.quantity;
  }
  return item.quantity;
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
              quantityType: true,
              unit: true,
              presentations: {
                where: { active: true },
                select: {
                  id: true,
                  name: true,
                  quantity: true,
                  unit: true,
                  active: true,
                },
              },
            },
          });

          const productById = new Map<string, ProductRecord>(
            products.map((p) => [
              p.id,
              {
                id: p.id,
                storeId: p.storeId,
                name: p.name,
                price: Number(p.price),
                stock: decimalToNumber(p.stock),
                quantityType: (p.quantityType ?? "DISCRETA") as "DISCRETA" | "CONTINUA",
                unit: p.unit ?? "unit",
                presentations: (p.presentations ?? []).map((pr) => ({
                  id: pr.id,
                  name: pr.name,
                  quantity: decimalToNumber(pr.quantity),
                  unit: pr.unit,
                  active: pr.active,
                })),
              },
            ]),
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
            assertPositiveNumber(item.quantity, "Cantidad inválida");

            const presentation = resolvePresentation(item, product);
            const baseQuantity = computeBaseQuantity(item, presentation, product);
            if (baseQuantity <= 0) {
              throw new SaleProcessingError(
                `Cantidad base inválida para "${product.name}"`,
                400,
              );
            }
            if (baseQuantity > product.stock) {
              throw new SaleProcessingError(
                `Stock insuficiente para ${product.name}`,
                409,
              );
            }

            previousStockMap.set(product.id, product.stock);

            const unitPrice = Number(item.unitPrice ?? product.price);
            const itemTotal = roundMoney(unitPrice * baseQuantity);
            computedSubtotal = roundMoney(computedSubtotal + itemTotal);

            const displayQuantity = presentation
              ? item.quantity
              : baseQuantity;

            return {
              productId: product.id,
              productName: product.name,
              quantity: displayQuantity,
              unitPrice,
              total: itemTotal,
              presentationId: presentation?.id ?? null,
              presentationName: presentation?.name ?? null,
              baseQuantity,
            };
          });

          const computedTax = calculateTax(computedSubtotal, taxConfig);
          const computedTotal = roundMoney(computedSubtotal + computedTax);

          ensureMatchingAmount("subtotal", computedSubtotal, payload.subtotal);
          ensureMatchingAmount("tax", computedTax, payload.tax);
          ensureMatchingAmount("total", computedTotal, payload.total);

          const stockUpdates = await Promise.all(
            saleItems.map((item) =>
              tx.product.updateMany({
                where: {
                  id: item.productId,
                  storeId: auth.storeId,
                  stock: { gte: toDecimal(item.baseQuantity) },
                },
                data: {
                  stock: { decrement: toDecimal(item.baseQuantity) },
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

          const created = await tx.sale.create({
            data: {
              storeId: auth.storeId,
              userId: auth.userId,
              cashSessionId: auth.cashSessionId ?? null,
              subtotal: toDecimal(computedSubtotal),
              tax: toDecimal(computedTax),
              total: toDecimal(computedTotal),
              paymentMethod: payload.paymentMethod,
              createdAt: payload.createdAt ?? undefined,
              items: {
                create: saleItems.map((item) => ({
                  productId: item.productId,
                  productName: item.productName,
                  quantity: toDecimal(item.quantity),
                  unitPrice: toDecimal(item.unitPrice),
                  total: toDecimal(item.total),
                  presentationId: item.presentationId,
                  presentationName: item.presentationName,
                  baseQuantity: toDecimal(item.baseQuantity),
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
              const newStock = prev - item.baseQuantity;
              return {
                storeId: auth.storeId,
                productId: item.productId,
                userId: auth.userId,
                type: "SALE" as const,
                quantity: toDecimal(-item.baseQuantity),
                previousStock: toDecimal(prev),
                newStock: toDecimal(newStock),
                referenceId: created.id,
              };
            }),
          });

          console.info(
            `[Sale] tx committed in ${Date.now() - stepStart}ms — ${saleItems.length} items, total=${computedTotal}`,
          );

          return created;
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
