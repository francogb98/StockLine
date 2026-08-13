import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit-service";

export interface CompaniesFilters {
  q?: string;
  plan?: string;
  subscriptionStatus?: string;
  suspended?: "true" | "false";
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface CompanyListItem {
  id: string;
  name: string;
  address: string;
  createdAt: Date;
  isSuspended: boolean;
  suspendedAt: Date | null;
  subscription: {
    status: string;
    plan: string;
    currentPeriodEnd: Date;
  } | null;
  totalSales: number;
  lastActivityAt: Date | null;
}

export interface CompanyListResult {
  items: CompanyListItem[];
  total: number;
  page: number;
  limit: number;
}

const DEFAULT_LIMIT = 25;

function buildWhere(filters: Omit<CompaniesFilters, "page" | "limit">) {
  const where: Record<string, unknown> = {};

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { address: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (typeof filters.from === "object" && filters.from instanceof Date && !isNaN(filters.from.getTime())) {
    where.createdAt = { ...(where.createdAt as object || {}), gte: filters.from };
  }
  if (typeof filters.to === "object" && filters.to instanceof Date && !isNaN(filters.to.getTime())) {
    where.createdAt = { ...(where.createdAt as object || {}), lte: filters.to };
  }
  if (filters.suspended === "true") {
    where.suspendedAt = { not: null };
  } else if (filters.suspended === "false") {
    where.suspendedAt = null;
  }
  return where;
}

export async function listCompanies(filters: CompaniesFilters): Promise<CompanyListResult> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit ?? DEFAULT_LIMIT)));

  const where = buildWhere(filters);
  const skip = (page - 1) * limit;

  const allStores = await prisma.store.findMany({
    where,
    select: { id: true },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  const total = await prisma.store.count({ where });

  const items = await Promise.all(
    allStores.map(async (s) => {
      const detail = await getCompanyDetail(s.id);
      if (!detail) return null;
      const sub = detail.subscription;
      let item: CompanyListItem | null = {
        id: detail.id,
        name: detail.name,
        address: detail.address,
        createdAt: detail.createdAt,
        isSuspended: detail.isSuspended,
        suspendedAt: detail.suspendedAt,
        subscription: sub
          ? {
              status: sub.status,
              plan: sub.plan,
              currentPeriodEnd: sub.currentPeriodEnd,
            }
          : null,
        totalSales: detail.metrics.totalSales,
        lastActivityAt: detail.lastActivityAt,
      };

      if (filters.plan && sub?.plan !== filters.plan) item = null;
      if (
        filters.subscriptionStatus &&
        sub?.status !== filters.subscriptionStatus
      )
        item = null;

      return item;
    }),
  );

  return {
    items: items.filter((x): x is CompanyListItem => x !== null),
    total,
    page,
    limit,
  };
}

export interface CompanyDetail {
  id: string;
  name: string;
  address: string;
  phone: string;
  createdAt: Date;
  isSuspended: boolean;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  suspendedByUserId: string | null;
  internalNotes: string | null;
  subscription: {
    id: string;
    status: string;
    plan: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialEndsAt: Date | null;
    mercadoPagoPreapprovalId: string | null;
  } | null;
  primaryAdmin: { id: string; name: string; email: string } | null;
  metrics: {
    totalSales: number;
    totalRevenueArs: number;
    totalProducts: number;
    totalUsers: number;
    last30dSales: number;
  };
  lastActivityAt: Date | null;
}

export async function getCompanyDetail(id: string): Promise<CompanyDetail | null> {
  const store = await prisma.store.findUnique({
    where: { id },
  });
  if (!store) return null;

  const [
    sub,
    primaryAdmin,
    totalSalesAgg,
    last30dSalesCount,
    totalProducts,
    totalUsers,
    lastSale,
  ] = await Promise.all([
    prisma.subscription.findUnique({ where: { storeId: id } }),
    prisma.user.findFirst({
      where: { storeId: id, role: "admin" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.sale.aggregate({
      where: { storeId: id, status: "completed" },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.sale.count({
      where: {
        storeId: id,
        status: "completed",
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.product.count({ where: { storeId: id } }),
    prisma.user.count({ where: { storeId: id } }),
    prisma.sale.findFirst({
      where: { storeId: id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return {
    id: store.id,
    name: store.name,
    address: store.address,
    phone: store.phone,
    createdAt: store.createdAt,
    isSuspended: store.suspendedAt !== null,
    suspendedAt: store.suspendedAt,
    suspendedReason: store.suspendedReason,
    suspendedByUserId: store.suspendedByUserId,
    internalNotes: store.internalNotes,
    subscription: sub
      ? {
          id: sub.id,
          status: sub.status,
          plan: sub.plan,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          trialEndsAt: sub.trialEndsAt,
          mercadoPagoPreapprovalId: sub.mercadoPagoPreapprovalId,
        }
      : null,
    primaryAdmin,
    metrics: {
      totalSales: totalSalesAgg._count._all,
      totalRevenueArs: Number(totalSalesAgg._sum.total ?? 0),
      totalProducts,
      totalUsers,
      last30dSales: last30dSalesCount,
    },
    lastActivityAt: lastSale?.createdAt ?? null,
  };
}

export interface SuspendInput {
  id: string;
  reason: string;
  notes?: string;
  adminUserId: string;
}

export async function suspendCompany(input: SuspendInput): Promise<void> {
  const now = new Date();
  await prisma.store.update({
    where: { id: input.id },
    data: {
      suspendedAt: now,
      suspendedReason: input.reason,
      suspendedByUserId: input.adminUserId,
      internalNotes: input.notes ?? null,
    },
  });

  await recordAuditEvent({
    actorType: "SUPER_ADMIN",
    actorUserId: input.adminUserId,
    storeId: input.id,
    action: "company.suspend",
    targetType: "Store",
    targetId: input.id,
    metadata: { reason: input.reason, notes: input.notes ?? null },
  });
}

export interface UnsuspendInput {
  id: string;
  notes?: string;
  adminUserId: string;
}

export async function unsuspendCompany(input: UnsuspendInput): Promise<void> {
  await prisma.store.update({
    where: { id: input.id },
    data: {
      suspendedAt: null,
      suspendedReason: null,
      suspendedByUserId: null,
      internalNotes: input.notes ?? null,
    },
  });

  await recordAuditEvent({
    actorType: "SUPER_ADMIN",
    actorUserId: input.adminUserId,
    storeId: input.id,
    action: "company.unsuspend",
    targetType: "Store",
    targetId: input.id,
    metadata: { notes: input.notes ?? null },
  });
}
