import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getSales, POST as postSale } from "@/app/api/sales/route";
import { prisma } from "@/lib/prisma";
import * as apiAuth from "@/lib/api-auth";
import * as subscriptionService from "@/lib/subscription-service";
import * as salesService from "@/lib/sales-service";

const tenantAdmin = {
  id: "admin-1",
  email: "admin@store.com",
  name: "Admin",
  role: "admin",
  storeId: "store-1",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API /api/sales", () => {
  it("GET returns only current tenant sales", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });
    const expectedSales = [
      {
        id: "sale-1",
        storeId: "store-1",
        userId: "admin-1",
        subtotal: 100,
        tax: 21,
        total: 121,
        paymentMethod: "cash",
        createdAt: new Date(),
        items: [],
      },
    ];

    vi.spyOn(prisma.sale, "findMany").mockResolvedValue(expectedSales as any);

    const response = await getSales(new Request("http://localhost/api/sales"));
    if (!response) {
      throw new Error("Expected response");
    }

    expect(response.status).toBe(200);
    expect(prisma.sale.findMany).toHaveBeenCalledWith({
      where: { storeId: "store-1" },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    expect(await response.json()).toEqual(
      JSON.parse(JSON.stringify(expectedSales)),
    );
  });

  it("GET by id denies cross-tenant sale detail", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });
    vi.spyOn(prisma.sale, "findFirst").mockResolvedValue(null);

    const response = await getSales(
      new Request("http://localhost/api/sales?id=sale-other"),
    );
    if (!response) {
      throw new Error("Expected response");
    }

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Venta no encontrada" });
  });

  it("POST blocks sale when a product belongs to another tenant", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });
    vi.spyOn(
      subscriptionService,
      "enforceSubscriptionAccess",
    ).mockResolvedValue({
      allowed: true,
      snapshot: {} as any,
    });
    vi.spyOn(prisma.cashSession, "findFirst").mockResolvedValue(null);
    const saleServiceSpy = vi
      .spyOn(salesService, "createSale")
      .mockRejectedValue(
        new salesService.SaleProcessingError(
          "Uno o más productos no pertenecen a tu tienda",
          403,
        ),
      );
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await postSale(
      new Request("http://localhost/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtotal: 100,
          tax: 21,
          total: 121,
          paymentMethod: "cash",
          items: [
            {
              productId: "prod-1",
              quantity: 1,
              unitPrice: 50,
              total: 50,
              productName: "A",
            },
            {
              productId: "prod-2",
              quantity: 1,
              unitPrice: 71,
              total: 71,
              productName: "B",
            },
          ],
        }),
      }),
    );
    if (!response) {
      throw new Error("Expected response");
    }

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Uno o más productos no pertenecen a tu tienda",
    });
    expect(saleServiceSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("POST returns created sale when the service succeeds", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      user: tenantAdmin,
    });
    vi.spyOn(
      subscriptionService,
      "enforceSubscriptionAccess",
    ).mockResolvedValue({
      allowed: true,
      snapshot: {} as any,
    });
    vi.spyOn(prisma.cashSession, "findFirst").mockResolvedValue(null);

    const createdSale = {
      id: "sale-1",
      storeId: "store-1",
      userId: "admin-1",
      subtotal: 100,
      tax: 21,
      total: 121,
      paymentMethod: "cash",
      createdAt: new Date(),
      items: [],
    };

    vi.spyOn(salesService, "createSale").mockResolvedValue(createdSale as any);

    const response = await postSale(
      new Request("http://localhost/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "cash",
          items: [
            {
              productId: "prod-1",
              productName: "Producto 1",
              quantity: 1,
              unitPrice: 100,
              total: 100,
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(
      JSON.parse(JSON.stringify(createdSale)),
    );
  });
});
