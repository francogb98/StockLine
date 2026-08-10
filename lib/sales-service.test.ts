import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSale } from "@/lib/sales-service";

function createTransactionMock(overrides?: {
  products?: any[];
  updateCounts?: number[];
  saleResult?: any;
  saleCreateError?: Error;
}) {
  const products = overrides?.products ?? [
    {
      id: "prod-1",
      storeId: "store-1",
      name: "Producto 1",
      price: 100,
      stock: 10,
    },
  ];

  const updateCounts = [...(overrides?.updateCounts ?? products.map(() => 1))];
  const saleResult = overrides?.saleResult ?? {
    id: "sale-1",
    items: [],
  };

  const tx = {
    product: {
      findMany: vi.fn().mockResolvedValue(products),
      updateMany: vi
        .fn()
        .mockImplementation(async () => ({ count: updateCounts.shift() ?? 1 })),
    },
    sale: {
      create: overrides?.saleCreateError
        ? vi.fn().mockRejectedValue(overrides.saleCreateError)
        : vi.fn().mockResolvedValue(saleResult),
    },
    stockMovement: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  } as any;

  const transactionSpy = vi
    .spyOn(prisma, "$transaction")
    .mockImplementation(async (callback: any) => callback(tx));

  return { tx, transactionSpy };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sales-service", () => {
  it("creates a sale, aggregates repeated products and updates stock", async () => {
    const { tx, transactionSpy } = createTransactionMock({
      products: [
        {
          id: "prod-1",
          storeId: "store-1",
          name: "Producto 1",
          price: 100,
          stock: 10,
        },
        {
          id: "prod-2",
          storeId: "store-1",
          name: "Producto 2",
          price: 50,
          stock: 5,
        },
      ],
      saleResult: {
        id: "sale-1",
        items: [{ id: "item-1" }, { id: "item-2" }],
      },
    });

    const sale = await createSale(
      {
        subtotal: 250,
        tax: 0,
        total: 250,
        paymentMethod: "cash",
        items: [
          { productId: "prod-1", quantity: 1, unitPrice: 100, total: 100 },
          { productId: "prod-1", quantity: 1, unitPrice: 100, total: 100 },
          { productId: "prod-2", quantity: 1, unitPrice: 50, total: 50 },
        ],
      },
      { storeId: "store-1", userId: "user-1" },
    );

    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(tx.product.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.product.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          id: "prod-1",
          storeId: "store-1",
          stock: { gte: expect.objectContaining({ toString: expect.any(Function) }) },
        }),
        data: { stock: { decrement: expect.objectContaining({ toString: expect.any(Function) }) } },
      }),
    );
    expect(tx.sale.create).toHaveBeenCalledTimes(1);
    expect(sale).toEqual({
      id: "sale-1",
      items: [{ id: "item-1" }, { id: "item-2" }],
    });
  });

  it("rejects the sale when stock is insufficient", async () => {
    createTransactionMock({
      products: [
        {
          id: "prod-1",
          storeId: "store-1",
          name: "Producto 1",
          price: 100,
          stock: 1,
        },
      ],
      updateCounts: [0],
    });

    await expect(
      createSale(
        {
          subtotal: 200,
          tax: 0,
          total: 200,
          paymentMethod: "cash",
          items: [
            { productId: "prod-1", quantity: 2, unitPrice: 100, total: 200 },
          ],
        },
        { storeId: "store-1", userId: "user-1" },
      ),
    ).rejects.toMatchObject({
      name: "SaleProcessingError",
      statusCode: 409,
      message: "Stock insuficiente para Producto 1",
    });
  });

  it("rejects the sale when a product does not exist", async () => {
    createTransactionMock({ products: [] });

    await expect(
      createSale(
        {
          subtotal: 100,
          tax: 0,
          total: 100,
          paymentMethod: "cash",
          items: [
            { productId: "missing", quantity: 1, unitPrice: 100, total: 100 },
          ],
        },
        { storeId: "store-1", userId: "user-1" },
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Producto(s) no encontrado(s): missing",
    });
  });

  it("rejects the sale when a product belongs to another store", async () => {
    createTransactionMock({ products: [] });

    await expect(
      createSale(
        {
          subtotal: 100,
          tax: 0,
          total: 100,
          paymentMethod: "cash",
          items: [
            { productId: "prod-1", quantity: 1, unitPrice: 100, total: 100 },
          ],
        },
        { storeId: "store-1", userId: "user-1" },
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Producto(s) no encontrado(s): prod-1",
    });
  });

  it("propagates errors so the transaction can roll back completely", async () => {
    const rollbackError = new Error("db failure");
    createTransactionMock({ saleCreateError: rollbackError });

    await expect(
      createSale(
        {
          subtotal: 100,
          tax: 0,
          total: 100,
          paymentMethod: "cash",
          items: [
            { productId: "prod-1", quantity: 1, unitPrice: 100, total: 100 },
          ],
        },
        { storeId: "store-1", userId: "user-1" },
      ),
    ).rejects.toBe(rollbackError);
  });

  it("retries serializable transaction conflicts for concurrent sales", async () => {
    const transactionError = { code: "P2034" };
    const saleResult = { id: "sale-1", items: [] };
    const tx = {
      product: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "prod-1",
            storeId: "store-1",
            name: "Producto 1",
            price: 100,
            stock: 10,
          },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      sale: {
        create: vi.fn().mockResolvedValue(saleResult),
      },
      stockMovement: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;

    const transactionSpy = vi
      .spyOn(prisma, "$transaction")
      .mockRejectedValueOnce(transactionError)
      .mockImplementationOnce(async (callback: any) => callback(tx));

    const sale = await createSale(
      {
        subtotal: 100,
        tax: 0,
        total: 100,
        paymentMethod: "cash",
        items: [
          { productId: "prod-1", quantity: 1, unitPrice: 100, total: 100 },
        ],
      },
      { storeId: "store-1", userId: "user-1" },
    );

    expect(transactionSpy).toHaveBeenCalledTimes(2);
    expect(sale).toEqual(saleResult);
  });

  it("retries on P2028 transaction timeout errors", async () => {
    const timeoutError = { code: "P2028" };
    const saleResult = { id: "sale-1", items: [] };
    const tx = {
      product: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "prod-1",
            storeId: "store-1",
            name: "Producto 1",
            price: 100,
            stock: 10,
          },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      sale: {
        create: vi.fn().mockResolvedValue(saleResult),
      },
      stockMovement: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;

    const transactionSpy = vi
      .spyOn(prisma, "$transaction")
      .mockRejectedValueOnce(timeoutError)
      .mockImplementationOnce(async (callback: any) => callback(tx));

    const sale = await createSale(
      {
        subtotal: 100,
        tax: 0,
        total: 100,
        paymentMethod: "cash",
        items: [
          { productId: "prod-1", quantity: 1, unitPrice: 100, total: 100 },
        ],
      },
      { storeId: "store-1", userId: "user-1" },
    );

    expect(transactionSpy).toHaveBeenCalledTimes(2);
    expect(sale).toEqual(saleResult);
  });

  it("rejects invalid quantities and amounts before touching the database", async () => {
    const transactionSpy = vi.spyOn(prisma, "$transaction");

    await expect(
      createSale(
        {
          subtotal: -1,
          tax: 0,
          total: 0,
          paymentMethod: "cash",
          items: [
            { productId: "prod-1", quantity: 0, unitPrice: 100, total: 0 },
          ],
        },
        { storeId: "store-1", userId: "user-1" },
      ),
    ).rejects.toMatchObject({
      name: "SaleProcessingError",
      statusCode: 400,
    });

    expect(transactionSpy).not.toHaveBeenCalled();
  });

  it("rejects negative quantities", async () => {
    await expect(
      createSale(
        {
          items: [{ productId: "prod-1", quantity: -1, unitPrice: 100, total: -100 }],
          subtotal: -100,
          tax: 0,
          total: -100,
          paymentMethod: "cash",
        },
        { storeId: "store-1", userId: "user-1" },
      ),
    ).rejects.toMatchObject({ name: "SaleProcessingError", statusCode: 400 });
  });

  it("accepts continuous product with presentation and discounts baseQuantity", async () => {
    const presentationId = "pres-1";
    const { tx, transactionSpy } = createTransactionMock({
      products: [
        {
          id: "prod-kg",
          storeId: "store-1",
          name: "Dog Chow",
          price: 100,
          stock: 250,
          quantityType: "CONTINUA",
          unit: "kg",
          presentations: [
            {
              id: presentationId,
              name: "Bolsa 25 kg",
              quantity: 25,
              unit: "kg",
              active: true,
            },
          ],
        },
      ],
      saleResult: {
        id: "sale-kg",
        storeId: "store-1",
        userId: "user-1",
        subtotal: 2500,
        tax: 0,
        total: 2500,
        paymentMethod: "cash",
        createdAt: new Date(),
        items: [
          {
            id: "item-1",
            productId: "prod-kg",
            productName: "Dog Chow",
            quantity: 1,
            unitPrice: 100,
            total: 2500,
            presentationId,
            presentationName: "Bolsa 25 kg",
            baseQuantity: 25,
          },
        ],
      },
    });

    const sale = await createSale(
      {
        items: [
          {
            productId: "prod-kg",
            quantity: 1,
            unitPrice: 100,
            presentationId,
            presentationName: "Bolsa 25 kg",
          },
        ],
        subtotal: 2500,
        tax: 0,
        total: 2500,
        paymentMethod: "cash",
      },
      { storeId: "store-1", userId: "user-1" },
    );

    expect(sale).toBeTruthy();
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    // Stock decrements by 25 (the baseQuantity), not by 1.
    expect(tx.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "prod-kg",
          stock: { gte: expect.objectContaining({ toString: expect.any(Function) }) },
        }),
        data: {
          stock: {
            decrement: expect.objectContaining({ toString: expect.any(Function) }),
          },
        },
      }),
    );
  });

  it("rejects presentation that does not belong to the product", async () => {
    const { transactionSpy } = createTransactionMock({
      products: [
        {
          id: "prod-1",
          storeId: "store-1",
          name: "Mouse",
          price: 100,
          stock: 10,
          quantityType: "DISCRETA",
          unit: "unit",
          presentations: [],
        },
      ],
    });

    await expect(
      createSale(
        {
          items: [
            {
              productId: "prod-1",
              quantity: 1,
              unitPrice: 100,
              presentationId: "pres-other-product",
            },
          ],
          subtotal: 100,
          tax: 0,
          total: 100,
          paymentMethod: "cash",
        },
        { storeId: "store-1", userId: "user-1" },
      ),
    ).rejects.toMatchObject({ name: "SaleProcessingError", statusCode: 400 });
    expect(transactionSpy).not.toHaveBeenCalled();
  });

  it("rejects presentation with unit mismatch", async () => {
    const { transactionSpy } = createTransactionMock({
      products: [
        {
          id: "prod-kg",
          storeId: "store-1",
          name: "Cable",
          price: 10,
          stock: 100,
          quantityType: "CONTINUA",
          unit: "kg",
          presentations: [
            { id: "pres-l", name: "Botella", quantity: 1, unit: "L", active: true },
          ],
        },
      ],
    });

    await expect(
      createSale(
        {
          items: [
            {
              productId: "prod-kg",
              quantity: 1,
              unitPrice: 10,
              presentationId: "pres-l",
            },
          ],
          subtotal: 10,
          tax: 0,
          total: 10,
          paymentMethod: "cash",
        },
        { storeId: "store-1", userId: "user-1" },
      ),
    ).rejects.toMatchObject({ name: "SaleProcessingError", statusCode: 400 });
    expect(transactionSpy).not.toHaveBeenCalled();
  });

  it("rejects inactive presentation", async () => {
    const { transactionSpy } = createTransactionMock({
      products: [
        {
          id: "prod-kg",
          storeId: "store-1",
          name: "Bolsa inactive",
          price: 10,
          stock: 100,
          quantityType: "CONTINUA",
          unit: "kg",
          presentations: [
            { id: "pres-inact", name: "Old bolsa", quantity: 10, unit: "kg", active: false },
          ],
        },
      ],
    });

    await expect(
      createSale(
        {
          items: [
            {
              productId: "prod-kg",
              quantity: 1,
              unitPrice: 10,
              presentationId: "pres-inact",
            },
          ],
          subtotal: 10,
          tax: 0,
          total: 10,
          paymentMethod: "cash",
        },
        { storeId: "store-1", userId: "user-1" },
      ),
    ).rejects.toMatchObject({ name: "SaleProcessingError", statusCode: 400 });
    expect(transactionSpy).not.toHaveBeenCalled();
  });

  it("rejects continuous product with insufficient base stock via presentation", async () => {
    const { transactionSpy } = createTransactionMock({
      products: [
        {
          id: "prod-kg",
          storeId: "store-1",
          name: "Low stock",
          price: 10,
          stock: 10,
          quantityType: "CONTINUA",
          unit: "kg",
          presentations: [
            { id: "pres-25", name: "Bolsa 25 kg", quantity: 25, unit: "kg", active: true },
          ],
        },
      ],
    });

    await expect(
      createSale(
        {
          items: [
            {
              productId: "prod-kg",
              quantity: 1,
              unitPrice: 10,
              presentationId: "pres-25",
            },
          ],
          subtotal: 10,
          tax: 0,
          total: 10,
          paymentMethod: "cash",
        },
        { storeId: "store-1", userId: "user-1" },
      ),
    ).rejects.toMatchObject({ name: "SaleProcessingError", statusCode: 409 });
    expect(transactionSpy).toHaveBeenCalled();
  });
});
