import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    store: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    subscription: { findUnique: vi.fn() },
    user: { findFirst: vi.fn(), count: vi.fn() },
    sale: { aggregate: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
    product: { count: vi.fn() },
  },
}));

vi.mock("@/lib/audit-service", () => ({
  recordAuditEvent: vi.fn().mockResolvedValue({}),
}));

import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit-service";
import {
  getCompanyDetail,
  listCompanies,
  suspendCompany,
  unsuspendCompany,
} from "@/lib/super-admin/companies-service";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("getCompanyDetail", () => {
  it("returns null when the store does not exist", async () => {
    vi.mocked(prisma.store.findUnique).mockResolvedValue(null as any);

    const result = await getCompanyDetail("nope");

    expect(result).toBeNull();
  });

  it("returns full detail with metrics", async () => {
    vi.mocked(prisma.store.findUnique).mockResolvedValue({
      id: "store-1",
      name: "Tienda 1",
      address: "Calle 1",
      phone: "+54 11 0000",
      createdAt: new Date("2026-01-01"),
      suspendedAt: null,
      suspendedReason: null,
      suspendedByUserId: null,
      internalNotes: null,
      config: null,
    } as any);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "sub-1",
      storeId: "store-1",
      status: "active",
      plan: "monthly",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      trialEndsAt: null,
      mercadoPagoPreapprovalId: "mpp-1",
    } as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "user-admin-1",
      name: "Admin Owner",
      email: "owner@store.com",
    } as any);
    vi.mocked(prisma.sale.aggregate).mockResolvedValue({
      _sum: { total: 12345.67 },
      _count: { _all: 50 },
    } as any);
    vi.mocked(prisma.sale.count).mockResolvedValue(7);
    vi.mocked(prisma.product.count).mockResolvedValue(20);
    vi.mocked(prisma.user.count).mockResolvedValue(3);
    vi.mocked(prisma.sale.findFirst).mockResolvedValue({
      createdAt: new Date("2026-08-12T10:00:00Z"),
    } as any);

    const result = await getCompanyDetail("store-1");

    expect(result?.name).toBe("Tienda 1");
    expect(result?.metrics.totalSales).toBe(50);
    expect(result?.metrics.totalRevenueArs).toBe(12345.67);
    expect(result?.metrics.last30dSales).toBe(7);
    expect(result?.primaryAdmin?.email).toBe("owner@store.com");
    expect(result?.subscription?.status).toBe("active");
  });
});

describe("listCompanies", () => {
  it("returns paginated list with filters applied", async () => {
    vi.mocked(prisma.store.findMany).mockResolvedValue([
      { id: "store-1" },
      { id: "store-2" },
    ] as any);
    vi.mocked(prisma.store.count).mockResolvedValue(15);

    vi.mocked(prisma.store.findUnique)
      .mockResolvedValueOnce({
        id: "store-1",
        name: "A",
        address: "x",
        createdAt: new Date(),
        suspendedAt: null,
      } as any)
      .mockResolvedValueOnce({
        id: "store-2",
        name: "B",
        address: "y",
        createdAt: new Date(),
        suspendedAt: null,
      } as any);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      status: "active",
      plan: "monthly",
      currentPeriodEnd: new Date(),
    } as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.sale.aggregate).mockResolvedValue({
      _sum: { total: 0 },
      _count: { _all: 0 },
    } as any);
    vi.mocked(prisma.sale.count).mockResolvedValue(0);
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.sale.findFirst).mockResolvedValue(null);

    const result = await listCompanies({ page: 1, limit: 2 });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
    expect(result.total).toBe(15);
    expect(result.items).toHaveLength(2);

    const whereArgs = vi.mocked(prisma.store.findMany).mock.calls[0][0];
    expect(whereArgs.take).toBe(2);
    expect(whereArgs.skip).toBe(0);
    expect(whereArgs.orderBy).toEqual({ createdAt: "desc" });
  });

  it("filters items by plan", async () => {
    vi.mocked(prisma.store.findMany).mockResolvedValue([
      { id: "store-1" },
    ] as any);
    vi.mocked(prisma.store.count).mockResolvedValue(1);
    vi.mocked(prisma.store.findUnique).mockResolvedValueOnce({
      id: "store-1",
      name: "A",
      address: "x",
      createdAt: new Date(),
      suspendedAt: null,
    } as any);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      status: "active",
      plan: "annual",
      currentPeriodEnd: new Date(),
    } as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.sale.aggregate).mockResolvedValue({
      _sum: { total: 0 },
      _count: { _all: 0 },
    } as any);
    vi.mocked(prisma.sale.count).mockResolvedValue(0);
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.sale.findFirst).mockResolvedValue(null);

    const result = await listCompanies({ plan: "monthly" });

    expect(result.items).toHaveLength(0);
  });

  it("clamps page and limit", async () => {
    vi.mocked(prisma.store.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.store.count).mockResolvedValue(0);

    await listCompanies({ page: -1, limit: 9999 });
    const args = vi.mocked(prisma.store.findMany).mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(100);
  });
});

describe("suspendCompany", () => {
  it("sets suspension fields and emits a SUPER_ADMIN audit event", async () => {
    const update = vi.mocked(prisma.store.update).mockResolvedValue({} as any);
    const audit = vi.mocked(recordAuditEvent);

    await suspendCompany({
      id: "store-1",
      reason: "PAYMENT_FRAUD",
      notes: "Riesgo",
      adminUserId: "sa-1",
    });

    const data = update.mock.calls[0][0].data;
    expect(data.suspendedAt).toBeInstanceOf(Date);
    expect(data.suspendedReason).toBe("PAYMENT_FRAUD");
    expect(data.suspendedByUserId).toBe("sa-1");
    expect(data.internalNotes).toBe("Riesgo");

    expect(audit).toHaveBeenCalledOnce();
    const arg = audit.mock.calls[0][0];
    expect(arg.action).toBe("company.suspend");
    expect(arg.actorType).toBe("SUPER_ADMIN");
    expect(arg.actorUserId).toBe("sa-1");
    expect(arg.storeId).toBe("store-1");
    expect(arg.metadata).toEqual({ reason: "PAYMENT_FRAUD", notes: "Riesgo" });
  });
});

describe("unsuspendCompany", () => {
  it("clears suspension fields and emits a SUPER_ADMIN audit event", async () => {
    const update = vi.mocked(prisma.store.update).mockResolvedValue({} as any);
    const audit = vi.mocked(recordAuditEvent);

    await unsuspendCompany({ id: "store-1", adminUserId: "sa-1" });

    const data = update.mock.calls[0][0].data;
    expect(data.suspendedAt).toBeNull();
    expect(data.suspendedReason).toBeNull();
    expect(data.suspendedByUserId).toBeNull();

    expect(audit).toHaveBeenCalledOnce();
    const arg = audit.mock.calls[0][0];
    expect(arg.action).toBe("company.unsuspend");
    expect(arg.actorType).toBe("SUPER_ADMIN");
  });
});
