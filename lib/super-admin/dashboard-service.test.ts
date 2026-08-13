import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    store: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    sale: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    product: { count: vi.fn() },
    user: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getGlobalMetrics,
  getNewSignupsTimeseries,
  getChurnTimeseries,
  getDashboardBundle,
} from "@/lib/super-admin/dashboard-service";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function stubNoStores() {
  vi.mocked(prisma.store.findUnique).mockResolvedValue(null as any);
  vi.mocked(prisma.store.findMany).mockResolvedValue([]);
  vi.mocked(prisma.store.count).mockResolvedValue(0);
}

describe("getGlobalMetrics", () => {
  it("aggregates core counts and sums revenue", async () => {
    stubNoStores();
    vi.mocked(prisma.subscription.count).mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      { plan: "monthly" },
      { plan: "monthly" },
      { plan: "annual" },
    ] as any);
    vi.mocked(prisma.sale.aggregate).mockResolvedValue({ _sum: { total: 123456.78 } } as any);
    vi.mocked(prisma.sale.count).mockResolvedValue(42);
    vi.mocked(prisma.product.count).mockResolvedValue(120);
    vi.mocked(prisma.user.count).mockResolvedValue(20);
    vi.mocked(prisma.sale.findMany).mockResolvedValue([]);

    const result = await getGlobalMetrics(30);

    expect(result.activeSubscriptions).toBe(5);
    expect(result.trialSubscriptions).toBe(2);
    expect(result.pastDueSubscriptions).toBe(1);
    expect(result.canceledSubscriptions).toBe(0);
    expect(result.totalSales).toBe(42);
    expect(result.totalProducts).toBe(120);
    expect(result.totalUsers).toBe(20);
    expect(result.totalRevenueArs).toBe(123456.78);
    expect(result.mrrArs).toBe(2 * 15000 + 150000 / 12);
    expect(result.arrArs).toBe(2 * 15000 * 12 + 150000);
  });

  it("excludes the platform-internal store from totalStores", async () => {
    vi.mocked(prisma.store.findUnique).mockResolvedValue({ id: "store-platform-internal" } as any);
    vi.mocked(prisma.store.findMany)
      .mockResolvedValueOnce([
        { id: "store-1" },
        { id: "store-2" },
        { id: "store-platform-internal" },
      ] as any)
      .mockResolvedValueOnce([] as any);
    vi.mocked(prisma.store.count).mockResolvedValue(0);
    vi.mocked(prisma.subscription.count).mockResolvedValue(0);
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sale.aggregate).mockResolvedValue({ _sum: { total: 0 } } as any);
    vi.mocked(prisma.sale.count).mockResolvedValue(0);
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.sale.findMany).mockResolvedValue([]);

    const result = await getGlobalMetrics(30);
    expect(result.totalStores).toBe(2);
  });
});

describe("getNewSignupsTimeseries", () => {
  it("returns one bucket per day within the window with counts aggregated", async () => {
    const now = new Date("2026-08-12T20:00:00Z").getTime();
    const spy = vi.spyOn(Date, "now").mockReturnValue(now);

    vi.mocked(prisma.store.findMany).mockReset();
    vi.mocked(prisma.store.findMany).mockResolvedValueOnce([
      { createdAt: new Date("2026-08-10T05:00:00Z") },
      { createdAt: new Date("2026-08-10T09:30:00Z") },
      { createdAt: new Date("2026-08-12T10:00:00Z") },
    ] as any);

    const series = await getNewSignupsTimeseries(7);

    spy.mockRestore();

    const counts = Object.fromEntries(series.map((p) => [p.date, p.count]));
    expect(series.length).toBe(8);
    expect(counts["2026-08-10"]).toBe(2);
    expect(counts["2026-08-11"]).toBe(0);
    expect(counts["2026-08-12"]).toBe(1);
  });
});

describe("getChurnTimeseries", () => {
  it("aggregates canceled/past_due transitions per day", async () => {
    const now = new Date("2026-08-12T20:00:00Z").getTime();
    const spy = vi.spyOn(Date, "now").mockReturnValue(now);

    vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
      { updatedAt: new Date("2026-08-09T05:00:00Z"), previousStatus: "active" },
      { updatedAt: new Date("2026-08-11T05:00:00Z"), previousStatus: "active" },
    ] as any);

    const series = await getChurnTimeseries(7);

    spy.mockRestore();

    const counts = Object.fromEntries(series.map((p) => [p.date, p.count]));
    expect(counts["2026-08-09"]).toBe(1);
    expect(counts["2026-08-11"]).toBe(1);
    expect(counts["2026-08-10"]).toBe(0);
  });
});

describe("getDashboardBundle", () => {
  it("returns metrics + timeseries + days", async () => {
    stubNoStores();
    vi.mocked(prisma.subscription.count).mockResolvedValue(0);
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sale.aggregate).mockResolvedValue({ _sum: { total: 0 } } as any);
    vi.mocked(prisma.sale.count).mockResolvedValue(0);
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.store.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sale.findMany).mockResolvedValue([]);

    const result = await getDashboardBundle(7);

    expect(result.days).toBe(7);
    expect(result.signupsTimeseries.length).toBe(8);
    expect(result.churnTimeseries.length).toBe(8);
    expect(result.metrics.mrrArs).toBe(0);
  });
});
