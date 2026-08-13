import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-config";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface GlobalMetrics {
  totalStores: number;
  suspendedStores: number;
  newStoresLast30d: number;
  inactiveStoresLast30d: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  canceledSubscriptions: number;
  mrrArs: number;
  arrArs: number;
  totalRevenueArs: number;
  totalSales: number;
  totalProducts: number;
  totalUsers: number;
}

export interface MetricPoint {
  date: string;
  count: number;
}

export interface DashboardBundle {
  metrics: GlobalMetrics;
  signupsTimeseries: MetricPoint[];
  churnTimeseries: MetricPoint[];
  days: number;
}

function startOfDay(d: Date) {
  const result = new Date(d);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function fillDailyBuckets(
  start: Date,
  end: Date,
  counts: Record<string, number>,
): MetricPoint[] {
  const series: MetricPoint[] = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor.getTime() <= last.getTime()) {
    const key = cursor.toISOString().slice(0, 10);
    series.push({ date: key, count: counts[key] ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

function planMrr(plan: string): number {
  if (plan === "annual") {
    return SUBSCRIPTION_PLANS.annual.amountArs / 12;
  }
  if (plan === "monthly") {
    return SUBSCRIPTION_PLANS.monthly.amountArs;
  }
  return 0;
}

function planArr(plan: string): number {
  if (plan === "annual") {
    return SUBSCRIPTION_PLANS.annual.amountArs;
  }
  if (plan === "monthly") {
    return SUBSCRIPTION_PLANS.monthly.amountArs * 12;
  }
  return 0;
}

export async function getGlobalMetrics(days = 30): Promise<GlobalMetrics> {
  const since = new Date(Date.now() - days * DAY_MS);
  const since30ForActivity = new Date(Date.now() - 30 * DAY_MS);

  const [
    totalStores,
    suspendedStores,
    newStoresLast30d,
    activeSubs,
    trialSubs,
    pastDueSubs,
    canceledSubs,
    activeSubscriptionsForMrr,
    revenueAgg,
    completedSalesCount,
    totalProducts,
    totalUsersAll,
    recentSalesByStore,
  ] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { suspendedAt: { not: null } } }),
    prisma.store.count({ where: { createdAt: { gte: since30ForActivity } } }),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.subscription.count({ where: { status: "trial" } }),
    prisma.subscription.count({ where: { status: "past_due" } }),
    prisma.subscription.count({ where: { status: "canceled" } }),
    prisma.subscription.findMany({
      where: { status: "active" },
      select: { plan: true },
    }),
    prisma.sale.aggregate({
      where: { status: "completed" },
      _sum: { total: true },
    }),
    prisma.sale.count({ where: { status: "completed" } }),
    prisma.product.count(),
    prisma.user.count(),
    prisma.sale.findMany({
      where: { status: "completed", createdAt: { gte: since30ForActivity } },
      select: { storeId: true },
      distinct: ["storeId"],
    }),
  ]);

  const platformInternal = await prisma.store.findUnique({
    where: { id: "store-platform-internal" },
    select: { id: true },
  });
  const excludeStoreIds = platformInternal ? new Set([platformInternal.id]) : new Set<string>();
  const allStores = await prisma.store.findMany({ select: { id: true } });
  const totalUsersExcl = await prisma.user.count({
    where: {
      storeId: { notIn: Array.from(excludeStoreIds.size > 0 ? excludeStoreIds : ["__none__"]) },
    },
  });
  void totalUsersAll;

  const activeStoreIds = new Set(recentSalesByStore.map((s) => s.storeId));
  const inactiveStoresLast30d = allStores.filter(
    (s) => !excludeStoreIds.has(s.id) && !activeStoreIds.has(s.id),
  ).length;

  const mrrArs = activeSubscriptionsForMrr.reduce((acc, s) => acc + planMrr(s.plan), 0);
  const arrArs = activeSubscriptionsForMrr.reduce((acc, s) => acc + planArr(s.plan), 0);

  return {
    totalStores: allStores.filter((s) => !excludeStoreIds.has(s.id)).length,
    suspendedStores,
    newStoresLast30d,
    inactiveStoresLast30d,
    activeSubscriptions: activeSubs,
    trialSubscriptions: trialSubs,
    pastDueSubscriptions: pastDueSubs,
    canceledSubscriptions: canceledSubs,
    mrrArs,
    arrArs,
    totalRevenueArs: Number(revenueAgg._sum.total ?? 0),
    totalSales: completedSalesCount,
    totalProducts,
    totalUsers: totalUsersExcl,
  };
}

export async function getNewSignupsTimeseries(days = 30): Promise<MetricPoint[]> {
  const since = new Date(Date.now() - days * DAY_MS);
  const stores = await prisma.store.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const counts: Record<string, number> = {};
  for (const s of stores) {
    const key = startOfDay(s.createdAt).toISOString().slice(0, 10);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return fillDailyBuckets(since, new Date(), counts);
}

export async function getChurnTimeseries(days = 30): Promise<MetricPoint[]> {
  const since = new Date(Date.now() - days * DAY_MS);
  const subs = await prisma.subscription.findMany({
    where: {
      OR: [
        { status: "canceled", updatedAt: { gte: since } },
        { status: "past_due", updatedAt: { gte: since } },
      ],
    },
    select: { updatedAt: true, previousStatus: true },
  });

  const counts: Record<string, number> = {};
  for (const s of subs) {
    const key = startOfDay(s.updatedAt).toISOString().slice(0, 10);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return fillDailyBuckets(since, new Date(), counts);
}

export async function getDashboardBundle(days = 30): Promise<DashboardBundle> {
  const [metrics, signupsTimeseries, churnTimeseries] = await Promise.all([
    getGlobalMetrics(days),
    getNewSignupsTimeseries(days),
    getChurnTimeseries(days),
  ]);

  return { metrics, signupsTimeseries, churnTimeseries, days };
}
