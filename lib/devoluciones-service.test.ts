import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => {
  const tx = {
    sale: { findFirst: vi.fn() },
    saleItem: { findMany: vi.fn() },
    product: { findMany: vi.fn(), update: vi.fn() },
    devolucionDetalle: { findMany: vi.fn() },
    devolucion: { create: vi.fn(), findUnique: vi.fn() },
    stockMovement: { createMany: vi.fn() },
    cashSession: { findFirst: vi.fn(), update: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
  };
  return { prisma, __tx: tx };
});

vi.mock("@/lib/test-users", () => ({
  isTestUserEmail: (email: string) => email.startsWith("test+"),
}));

import { createDevolucion } from "@/lib/devoluciones-service";
import * as prismaModule from "@/lib/prisma";

const tx = (prismaModule as unknown as { __tx: any }).__tx;

const baseActor = {
  storeId: "store-1",
  userId: "user-1",
  userEmail: "admin@store.com",
  sessionId: "sess",
};

const baseVenta = {
  id: "sale-1",
  storeId: "store-1",
  items: [
    {
      id: "si-1",
      saleId: "sale-1",
      productId: "prod-1",
      productName: "Coca-Cola",
      quantity: { toString: () => "2" } as unknown as number,
      unitPrice: { toString: () => "100" } as unknown as number,
      total: { toString: () => "200" } as unknown as number,
      baseQuantity: { toString: () => "2" } as unknown as number,
    },
    {
      id: "si-2",
      saleId: "sale-1",
      productId: "prod-2",
      productName: "Agua",
      quantity: { toString: () => "3" } as unknown as number,
      unitPrice: { toString: () => "50" } as unknown as number,
      total: { toString: () => "150" } as unknown as number,
      baseQuantity: { toString: () => "3" } as unknown as number,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createDevolucion — total return", () => {
  it("devuelve todos los items de la venta cuando total=true", async () => {
    tx.sale.findFirst.mockResolvedValue(baseVenta);
    tx.saleItem.findMany.mockResolvedValue(baseVenta.items);
    tx.product.findMany.mockResolvedValue([
      { id: "prod-1", stock: { toString: () => "10" } as unknown as number, unit: "unit" },
      { id: "prod-2", stock: { toString: () => "20" } as unknown as number, unit: "unit" },
    ]);
    tx.devolucionDetalle.findMany.mockResolvedValue([]);
    tx.devolucion.create.mockResolvedValue({
      id: "dev-1",
      storeId: "store-1",
      ventaId: "sale-1",
      userId: "user-1",
      motivo: null,
      observaciones: null,
      montoTotalDevuelto: { toString: () => "350" } as unknown as number,
      detalles: [],
    });
    tx.devolucion.findUnique.mockResolvedValue({
      id: "dev-1",
      storeId: "store-1",
      ventaId: "sale-1",
      userId: "user-1",
      fecha: new Date(),
      motivo: null,
      observaciones: null,
      montoTotalDevuelto: { toString: () => "350" } as unknown as number,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { name: "Admin" },
      venta: { total: { toString: () => "350" } as unknown as number },
      detalles: [],
    });
    tx.cashSession.findFirst.mockResolvedValue(null);

    const result = await createDevolucion(
      {
        ventaId: "sale-1",
        total: true,
        detalles: [],
        motivo: "Cliente arrepentido",
      },
      baseActor,
    );

    expect(result.id).toBe("dev-1");
    expect(result.montoTotalDevuelto).toBe(350);
    expect(tx.devolucion.create).toHaveBeenCalled();
    const createArgs = tx.devolucion.create.mock.calls[0][0];
    // 2 detalles creados (uno por item)
    expect(createArgs.data.detalles.create).toHaveLength(2);
    // stock movements creados (2)
    expect(tx.stockMovement.createMany).toHaveBeenCalled();
    const smArgs = tx.stockMovement.createMany.mock.calls[0][0];
    expect(smArgs.data).toHaveLength(2);
  });

  it("reintegra efectivo contra CashSession abierta", async () => {
    tx.sale.findFirst.mockResolvedValue(baseVenta);
    tx.saleItem.findMany.mockResolvedValue(baseVenta.items);
    tx.product.findMany.mockResolvedValue([
      { id: "prod-1", stock: { toString: () => "10" } as unknown as number, unit: "unit" },
      { id: "prod-2", stock: { toString: () => "20" } as unknown as number, unit: "unit" },
    ]);
    tx.devolucionDetalle.findMany.mockResolvedValue([]);
    tx.devolucion.create.mockResolvedValue({
      id: "dev-2",
      storeId: "store-1",
      ventaId: "sale-1",
      userId: "user-1",
      motivo: null,
      observaciones: null,
      montoTotalDevuelto: { toString: () => "200" } as unknown as number,
      detalles: [],
    });
    tx.devolucion.findUnique.mockResolvedValue({
      id: "dev-2",
      storeId: "store-1",
      ventaId: "sale-1",
      userId: "user-1",
      fecha: new Date(),
      motivo: null,
      observaciones: null,
      montoTotalDevuelto: { toString: () => "200" } as unknown as number,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: null,
      venta: null,
      detalles: [],
    });

    // Caja abierta con expectedAmount = 1000
    tx.cashSession.findFirst.mockResolvedValue({
      id: "cs-1",
      storeId: "store-1",
      expectedAmount: { toString: () => "1000" } as unknown as number,
    });

    await createDevolucion(
      {
        ventaId: "sale-1",
        total: true,
        detalles: [],
      },
      baseActor,
    );

    expect(tx.cashSession.update).toHaveBeenCalledWith({
      where: { id: "cs-1" },
      data: {
        expectedAmount: { decrement: expect.objectContaining({}) },
      },
    });
  });

  it("no falla si no hay caja abierta", async () => {
    tx.sale.findFirst.mockResolvedValue(baseVenta);
    tx.saleItem.findMany.mockResolvedValue(baseVenta.items);
    tx.product.findMany.mockResolvedValue([
      { id: "prod-1", stock: { toString: () => "10" } as unknown as number, unit: "unit" },
      { id: "prod-2", stock: { toString: () => "20" } as unknown as number, unit: "unit" },
    ]);
    tx.devolucionDetalle.findMany.mockResolvedValue([]);
    tx.devolucion.create.mockResolvedValue({
      id: "dev-3",
      storeId: "store-1",
      ventaId: "sale-1",
      userId: "user-1",
      motivo: null,
      observaciones: null,
      montoTotalDevuelto: { toString: () => "350" } as unknown as number,
      detalles: [],
    });
    tx.devolucion.findUnique.mockResolvedValue({
      id: "dev-3",
      storeId: "store-1",
      ventaId: "sale-1",
      userId: "user-1",
      fecha: new Date(),
      motivo: null,
      observaciones: null,
      montoTotalDevuelto: { toString: () => "350" } as unknown as number,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: null,
      venta: null,
      detalles: [],
    });
    tx.cashSession.findFirst.mockResolvedValue(null);

    await expect(
      createDevolucion(
        { ventaId: "sale-1", total: true, detalles: [] },
        baseActor,
      ),
    ).resolves.toBeTruthy();
    expect(tx.cashSession.update).not.toHaveBeenCalled();
  });
});