import { Prisma, type DevolucionDisposicion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isTestUserEmail } from "@/lib/test-users";
import { getOrCreateSessionStore } from "@/lib/session-store";
import { toDecimal } from "@/lib/decimal";

const TRANSACTION_TIMEOUT_MS = 15_000;

export class DevolucionProcessingError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "DevolucionProcessingError";
    this.statusCode = statusCode;
  }
}

export type DevolucionDisposicionInput = DevolucionDisposicion;

export interface DevolucionDetalleInputLike {
  saleItemId: string;
  cantidad: number;
  disposicion?: DevolucionDisposicion;
}

export interface CreateDevolucionPayload {
  ventaId: string;
  motivo?: string;
  observaciones?: string;
  total?: boolean;
  detalles: DevolucionDetalleInputLike[];
}

export interface DevolucionActor {
  storeId: string;
  userId: string;
  userEmail: string;
  sessionId: string;
}

export interface StoredDevolucion {
  id: string;
  storeId: string;
  ventaId: string;
  userId: string;
  fecha: Date;
  motivo: string | null;
  observaciones: string | null;
  montoTotalDevuelto: number;
  createdAt: Date;
  updatedAt: Date;
  detalles: StoredDevolucionDetalle[];
  userName?: string;
  ventaTotal?: number;
}

export interface StoredDevolucionDetalle {
  id: string;
  devolucionId: string;
  productId: string;
  productName?: string;
  saleItemId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  disposicion: DevolucionDisposicion;
  createdAt: Date;
}

interface ResolvedDevolucionDetalle {
  saleItemId: string;
  productId: string;
  productName: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  disposicion: DevolucionDisposicion;
  previousStock: number;
  newStock: number;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function assertPositiveNumber(value: number, message: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DevolucionProcessingError(message, 400);
  }
}

function isTest(actor: DevolucionActor): boolean {
  return isTestUserEmail(actor.userEmail);
}

function buildReturnedDevolucion(
  record: {
    id: string;
    storeId: string;
    ventaId: string;
    userId: string;
    fecha: Date;
    motivo: string | null;
    observaciones: string | null;
    montoTotalDevuelto: { toString(): string } | number | string;
    createdAt: Date;
    updatedAt: Date;
    user?: { name: string | null } | null;
    venta?: { total: { toString(): string } | number | string } | null;
    detalles: Array<{
      id: string;
      devolucionId: string;
      productId: string;
      product?: { name: string } | null;
      saleItemId: string;
      cantidad: number;
      precioUnitario: { toString(): string } | number | string;
      subtotal: { toString(): string } | number | string;
      disposicion: DevolucionDisposicion;
      createdAt: Date;
    }>;
  },
): StoredDevolucion {
  return {
    id: record.id,
    storeId: record.storeId,
    ventaId: record.ventaId,
    userId: record.userId,
    fecha: record.fecha,
    motivo: record.motivo,
    observaciones: record.observaciones,
    montoTotalDevuelto: Number(record.montoTotalDevuelto),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    userName: record.user?.name ?? undefined,
    ventaTotal: record.venta ? Number(record.venta.total) : undefined,
    detalles: record.detalles.map((d) => ({
      id: d.id,
      devolucionId: d.devolucionId,
      productId: d.productId,
      productName: d.product?.name,
      saleItemId: d.saleItemId,
      cantidad: d.cantidad,
      precioUnitario: Number(d.precioUnitario),
      subtotal: Number(d.subtotal),
      disposicion: d.disposicion,
      createdAt: d.createdAt,
    })),
  };
}

export async function findDevolucion(
  actor: DevolucionActor,
  id: string,
): Promise<StoredDevolucion | null> {
  if (isTest(actor)) {
    const store = getOrCreateSessionStore(actor.sessionId);
    return store.getDevolucion(id, actor.storeId);
  }

  const record = await prisma.devolucion.findFirst({
    where: { id, storeId: actor.storeId },
    include: {
      user: { select: { name: true } },
      venta: { select: { total: true } },
      detalles: { include: { product: { select: { name: true } } } },
    },
  });

  return record ? buildReturnedDevolucion(record) : null;
}

export async function createDevolucion(
  payload: CreateDevolucionPayload,
  actor: DevolucionActor,
): Promise<StoredDevolucion> {
  const totalFlag = payload?.total === true;
  const detalles = Array.isArray(payload?.detalles) ? payload.detalles : [];

  if (!payload || (!totalFlag && detalles.length === 0)) {
    throw new DevolucionProcessingError(
      "La devolución debe incluir al menos un detalle o ser total",
      400,
    );
  }

  for (const [index, detalle] of detalles.entries()) {
    if (!detalle || !isFiniteNumber(detalle.cantidad)) {
      throw new DevolucionProcessingError(
        `Cantidad inválida en posición ${index + 1}`,
        400,
      );
    }
    assertPositiveNumber(
      detalle.cantidad,
      `Cantidad inválida en posición ${index + 1}`,
    );
    if (typeof detalle.saleItemId !== "string" || detalle.saleItemId.trim() === "") {
      throw new DevolucionProcessingError(
        `SaleItemId inválido en posición ${index + 1}`,
        400,
      );
    }
  }

  if (isTest(actor)) {
    return createDevolucionInSessionStore(payload, actor);
  }

  return createDevolucionInPrisma(payload, actor);
}

export async function findDevoluciones(
  actor: DevolucionActor,
  options: { ventaId?: string; limit?: number; offset?: number } = {},
): Promise<{ items: StoredDevolucion[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);

  if (isTest(actor)) {
    const store = getOrCreateSessionStore(actor.sessionId);
    const all = store.getDevoluciones(actor.storeId);
    const filtered = options.ventaId
      ? all.filter((d) => d.ventaId === options.ventaId)
      : all;
    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  const where: Prisma.DevolucionWhereInput = { storeId: actor.storeId };
  if (options.ventaId) where.ventaId = options.ventaId;

  const [records, total] = await Promise.all([
    prisma.devolucion.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: offset,
      take: limit,
      include: {
        user: { select: { name: true } },
        venta: { select: { total: true } },
        detalles: { include: { product: { select: { name: true } } } },
      },
    }),
    prisma.devolucion.count({ where }),
  ]);

  return {
    items: records.map((r) => buildReturnedDevolucion(r)),
    total,
  };
}

async function createDevolucionInPrisma(
  payload: CreateDevolucionPayload,
  actor: DevolucionActor,
): Promise<StoredDevolucion> {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const stepStart = Date.now();

      const venta = await tx.sale.findFirst({
        where: { id: payload.ventaId, storeId: actor.storeId },
        include: { items: true },
      });

      if (!venta) {
        throw new DevolucionProcessingError("Venta no encontrada", 404);
      }

      const totalFlag = payload.total === true;

      let detallesAProcesar: DevolucionDetalleInputLike[];
      if (totalFlag) {
        detallesAProcesar = venta.items.map((si) => ({
          saleItemId: si.id,
          cantidad: Number(si.quantity),
          disposicion: "REINGRESAR_STOCK" as DevolucionDisposicion,
        }));
      } else {
        detallesAProcesar = payload.detalles;
      }

      const saleItemIds = detallesAProcesar.map((d) => d.saleItemId);
      const uniqueSaleItemIds = [...new Set(saleItemIds)];

      const saleItems = await tx.saleItem.findMany({
        where: {
          id: { in: uniqueSaleItemIds },
          saleId: venta.id,
        },
        include: { product: { select: { id: true, storeId: true, name: true } } },
      });

      const saleItemById = new Map(saleItems.map((si) => [si.id, si]));

      const missingSaleItemIds = uniqueSaleItemIds.filter(
        (id) => !saleItemById.has(id),
      );
      if (missingSaleItemIds.length > 0) {
        throw new DevolucionProcessingError(
          `Uno o más items no pertenecen a la venta: ${missingSaleItemIds.join(", ")}`,
          400,
        );
      }

      const productIds = [...new Set(saleItems.map((si) => si.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, storeId: actor.storeId },
        select: { id: true, stock: true, unit: true },
      });
      const productById = new Map(products.map((p) => [p.id, p]));

      const previousDevoluciones = await tx.devolucionDetalle.findMany({
        where: {
          saleItemId: { in: uniqueSaleItemIds },
          devolucion: { storeId: actor.storeId },
        },
        select: { saleItemId: true, cantidad: true },
      });

      const alreadyReturnedBySaleItem = new Map<string, number>();
      for (const pd of previousDevoluciones) {
        alreadyReturnedBySaleItem.set(
          pd.saleItemId,
          (alreadyReturnedBySaleItem.get(pd.saleItemId) ?? 0) + Number(pd.cantidad),
        );
      }

      const requestedBySaleItem = new Map<string, number>();
      for (const d of detallesAProcesar) {
        requestedBySaleItem.set(
          d.saleItemId,
          (requestedBySaleItem.get(d.saleItemId) ?? 0) + d.cantidad,
        );
      }

      const resolved: ResolvedDevolucionDetalle[] = [];
      let montoTotal = 0;

      for (const [saleItemId, requested] of requestedBySaleItem.entries()) {
        const saleItem = saleItemById.get(saleItemId);
        if (!saleItem) {
          throw new DevolucionProcessingError(
            `Item de venta no encontrado: ${saleItemId}`,
            404,
          );
        }

        const product = productById.get(saleItem.productId);
        if (!product) {
          throw new DevolucionProcessingError(
            `Producto no encontrado en la tienda: ${saleItem.productName}`,
            404,
          );
        }

        const saleItemDisplayQty = Number(saleItem.quantity);
        const saleItemBaseQty = Number(saleItem.baseQuantity ?? saleItem.quantity);

        const alreadyReturned = alreadyReturnedBySaleItem.get(saleItemId) ?? 0;
        const remaining = saleItemDisplayQty - alreadyReturned;

        if (requested > remaining) {
          throw new DevolucionProcessingError(
            `No se pueden devolver ${requested} unidades de "${saleItem.productName}". Disponibles: ${remaining}`,
            400,
          );
        }

        const unitPrice = Number(saleItem.unitPrice);
        const subtotal = roundCurrency(unitPrice * requested);
        montoTotal = roundCurrency(montoTotal + subtotal);

        const perUnitBase = saleItemDisplayQty > 0 ? saleItemBaseQty / saleItemDisplayQty : 0;

        const perDetail: ResolvedDevolucionDetalle[] = detallesAProcesar
          .filter((d) => d.saleItemId === saleItemId)
          .map((d) => ({
            saleItemId,
            productId: saleItem.productId,
            productName: saleItem.productName,
            cantidad: d.cantidad,
            precioUnitario: unitPrice,
            subtotal: roundCurrency(unitPrice * d.cantidad),
            disposicion: d.disposicion ?? "REINGRESAR_STOCK",
            previousStock: 0,
            newStock: 0,
          }));

        for (const d of perDetail) {
          const baseReturn = d.cantidad * perUnitBase;
          if (d.disposicion === "REINGRESAR_STOCK") {
            d.previousStock = Number(product.stock);
            d.newStock = Number(product.stock) + baseReturn;
            product.stock = d.newStock as unknown as typeof product.stock;
          } else {
            d.previousStock = Number(product.stock);
            d.newStock = Number(product.stock);
          }
        }

        resolved.push(...perDetail);
      }

      const devolucion = await tx.devolucion.create({
        data: {
          storeId: actor.storeId,
          ventaId: venta.id,
          userId: actor.userId,
          motivo: payload.motivo ?? null,
          observaciones: payload.observaciones ?? null,
          montoTotalDevuelto: montoTotal,
          detalles: {
            create: resolved.map((d) => ({
              productId: d.productId,
              saleItemId: d.saleItemId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              subtotal: d.subtotal,
              disposicion: d.disposicion,
            })),
          },
        },
        include: { detalles: true },
      });

      const stockMovementsToCreate: Prisma.StockMovementCreateManyInput[] = [];
      for (const d of resolved) {
        if (d.disposicion === "REINGRESAR_STOCK") {
          const stockDelta = d.newStock - d.previousStock;
          await tx.product.update({
            where: { id: d.productId },
            data: { stock: { increment: toDecimal(stockDelta) } },
          });
          const perUnitBase =
            Number(d.cantidad) > 0
              ? stockDelta / Number(d.cantidad)
              : 0;
          const baseReturned = Number(d.cantidad) * perUnitBase;
          stockMovementsToCreate.push({
            storeId: actor.storeId,
            productId: d.productId,
            userId: actor.userId,
            type: "CUSTOMER_RETURN",
            quantity: toDecimal(baseReturned),
            previousStock: toDecimal(d.previousStock),
            newStock: toDecimal(d.newStock),
            referenceId: devolucion.id,
            reason: `Devolución cliente — ${devolucion.id}`,
          });
        }
        // MERMAR: no afecta stock, sólo queda registro en la devolución.
        // TODO: cuando se implemente el módulo de mermas, registrar aquí
        //       el movimiento correspondiente.
      }

      if (stockMovementsToCreate.length > 0) {
        await tx.stockMovement.createMany({ data: stockMovementsToCreate });
      }

      // Reintegro de caja: si el usuario tiene una sesión de caja abierta,
      // descontamos el monto devuelto del expectedAmount. Si la venta original
      // pertenecía a otra caja, igual registramos el descuento sobre la caja
      // del usuario que opera (es quien entrega el efectivo).
      const openCashSession = await tx.cashSession.findFirst({
        where: { storeId: actor.storeId, closedAt: null },
        orderBy: { createdAt: "desc" },
      });

      if (openCashSession && openCashSession.expectedAmount !== null) {
        await tx.cashSession.update({
          where: { id: openCashSession.id },
          data: {
            expectedAmount: { decrement: toDecimal(montoTotal) },
          },
        });
      }

      console.info(
        `[Devolucion] tx committed in ${Date.now() - stepStart}ms — venta=${venta.id} totalDevuelto=${montoTotal} items=${resolved.length} caja=${openCashSession?.id ?? "none"}`,
      );

      const record = await tx.devolucion.findUnique({
        where: { id: devolucion.id },
        include: {
          user: { select: { name: true } },
          venta: { select: { total: true } },
          detalles: { include: { product: { select: { name: true } } } },
        },
      });

      if (!record) {
        throw new DevolucionProcessingError(
          "Devolución creada pero no se pudo recuperar",
          500,
        );
      }

      return buildReturnedDevolucion(record);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: TRANSACTION_TIMEOUT_MS,
      maxWait: TRANSACTION_TIMEOUT_MS,
    },
  );
}

async function createDevolucionInSessionStore(
  payload: CreateDevolucionPayload,
  actor: DevolucionActor,
): Promise<StoredDevolucion> {
  const store = getOrCreateSessionStore(actor.sessionId);

  const venta = store.getSale(payload.ventaId, actor.storeId);
  if (!venta) {
    throw new DevolucionProcessingError("Venta no encontrada", 404);
  }

  const totalFlag = payload.total === true;
  const detallesAProcesar: DevolucionDetalleInputLike[] = totalFlag
    ? venta.items.map((si) => ({
        saleItemId: si.id,
        cantidad: si.quantity,
        disposicion: "REINGRESAR_STOCK" as DevolucionDisposicion,
      }))
    : payload.detalles;

  const saleItemById = new Map(venta.items.map((si) => [si.id, si]));

  const uniqueSaleItemIds = [
    ...new Set(detallesAProcesar.map((d) => d.saleItemId)),
  ];

  const missingSaleItemIds = uniqueSaleItemIds.filter(
    (id) => !saleItemById.has(id),
  );
  if (missingSaleItemIds.length > 0) {
    throw new DevolucionProcessingError(
      `Uno o más items no pertenecen a la venta: ${missingSaleItemIds.join(", ")}`,
      400,
    );
  }

  const previousReturned = new Map<string, number>();
  for (const dev of store.getDevoluciones(actor.storeId)) {
    for (const det of dev.detalles) {
      if (uniqueSaleItemIds.includes(det.saleItemId)) {
        previousReturned.set(
          det.saleItemId,
          (previousReturned.get(det.saleItemId) ?? 0) + det.cantidad,
        );
      }
    }
  }

  const requestedBySaleItem = new Map<string, number>();
  for (const d of detallesAProcesar) {
    requestedBySaleItem.set(
      d.saleItemId,
      (requestedBySaleItem.get(d.saleItemId) ?? 0) + d.cantidad,
    );
  }

  let montoTotal = 0;
  const resolved: ResolvedDevolucionDetalle[] = [];

  for (const [saleItemId, requested] of requestedBySaleItem.entries()) {
    const saleItem = saleItemById.get(saleItemId)!;
    const alreadyReturned = previousReturned.get(saleItemId) ?? 0;
    const remaining = saleItem.quantity - alreadyReturned;

    if (requested > remaining) {
      throw new DevolucionProcessingError(
        `No se pueden devolver ${requested} unidades de "${saleItem.productName}". Disponibles: ${remaining}`,
        400,
      );
    }

    const product = store.getProduct(saleItem.productId, actor.storeId);
    if (!product) {
      throw new DevolucionProcessingError(
        `Producto no encontrado en la tienda: ${saleItem.productName}`,
        404,
      );
    }

    const unitPrice = saleItem.unitPrice;
    montoTotal = roundCurrency(montoTotal + roundCurrency(unitPrice * requested));

    for (const d of detallesAProcesar.filter((x) => x.saleItemId === saleItemId)) {
      const previousStock = product.stock;
      const newStock =
        d.disposicion === "REINGRESAR_STOCK" ? previousStock + d.cantidad : previousStock;

      if (d.disposicion === "REINGRESAR_STOCK") {
        store.updateProduct(product.id, { stock: newStock });
      }

      resolved.push({
        saleItemId,
        productId: product.id,
        productName: saleItem.productName,
        cantidad: d.cantidad,
        precioUnitario: unitPrice,
        subtotal: roundCurrency(unitPrice * d.cantidad),
        disposicion: d.disposicion ?? "REINGRESAR_STOCK",
        previousStock,
        newStock,
      });
    }
  }

  const created = store.createDevolucion({
    storeId: actor.storeId,
    ventaId: venta.id,
    userId: actor.userId,
    userName: undefined,
    motivo: payload.motivo ?? null,
    observaciones: payload.observaciones ?? null,
    montoTotalDevuelto: montoTotal,
    detalles: resolved.map((d) => ({
      productId: d.productId,
      saleItemId: d.saleItemId,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.subtotal,
      disposicion: d.disposicion,
    })),
  });

  for (const d of resolved) {
    if (d.disposicion === "REINGRESAR_STOCK") {
      store.createStockMovement({
        storeId: actor.storeId,
        productId: d.productId,
        userId: actor.userId,
        type: "CUSTOMER_RETURN",
        quantity: d.cantidad,
        previousStock: d.previousStock,
        newStock: d.newStock,
        referenceId: created.id,
        reason: `Devolución cliente — ${created.id}`,
      });
    }
  }

  // Reintegro de caja (session-store)
  const openCash = store.getOpenCashSession(actor.storeId);
  if (openCash && openCash.expectedAmount !== null) {
    store.updateCashSession(openCash.id, {
      expectedAmount: roundCurrency(openCash.expectedAmount - montoTotal),
    });
  }

  return findDevolucion(actor, created.id) as Promise<StoredDevolucion>;
}
