import { prisma } from "@/lib/prisma";
import {
  cancelSubscriptionByAdmin,
  reactivateSubscriptionByAdmin,
  extendSubscriptionByAdmin,
  forceSyncWithMp,
  AdminSubscriptionError,
} from "@/lib/subscription-service";
import { recordAuditEvent } from "@/lib/audit-service";

export interface SubscriptionsFilters {
  plan?: "monthly" | "annual";
  status?: "trial" | "active" | "past_due" | "canceled";
  storeId?: string;
  cancelledByAdmin?: boolean;
  page?: number;
  limit?: number;
}

export interface SubscriptionListItem {
  id: string;
  storeId: string;
  storeName: string;
  status: string;
  plan: string;
  currentPeriodEnd: Date;
  cancelledByAdmin: boolean;
  trialEndsAt: Date | null;
  mercadoPagoPreapprovalId: string | null;
}

export interface SubscriptionsListResult {
  items: SubscriptionListItem[];
  total: number;
  page: number;
  limit: number;
}

const DEFAULT_LIMIT = 25;

export async function listSubscriptions(filters: SubscriptionsFilters): Promise<SubscriptionsListResult> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit ?? DEFAULT_LIMIT)));

  const where: Record<string, unknown> = {};
  if (filters.plan) where.plan = filters.plan;
  if (filters.status) where.status = filters.status;
  if (filters.storeId) where.storeId = filters.storeId;
  if (typeof filters.cancelledByAdmin === "boolean") {
    where.cancelledByAdmin = filters.cancelledByAdmin;
  }

  const [rows, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: { store: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.subscription.count({ where }),
  ]);

  const items: SubscriptionListItem[] = rows.map((r) => ({
    id: r.id,
    storeId: r.storeId,
    storeName: r.store.name,
    status: r.status,
    plan: r.plan,
    currentPeriodEnd: r.currentPeriodEnd,
    cancelledByAdmin: r.cancelledByAdmin,
    trialEndsAt: r.trialEndsAt,
    mercadoPagoPreapprovalId: r.mercadoPagoPreapprovalId,
  }));

  return { items, total, page, limit };
}

export interface SubscriptionDetail {
  id: string;
  storeId: string;
  storeName: string;
  status: string;
  plan: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  mercadoPagoPreapprovalId: string | null;
  cancelledByAdmin: boolean;
  cancelledByAdminUserId: string | null;
  previousStatus: string | null;
  adminNotes: string | null;
}

export async function getSubscriptionDetail(id: string): Promise<SubscriptionDetail | null> {
  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: { store: { select: { name: true } } },
  });
  if (!sub) return null;

  return {
    id: sub.id,
    storeId: sub.storeId,
    storeName: sub.store.name,
    status: sub.status,
    plan: sub.plan,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    trialEndsAt: sub.trialEndsAt,
    mercadoPagoPreapprovalId: sub.mercadoPagoPreapprovalId,
    cancelledByAdmin: sub.cancelledByAdmin,
    cancelledByAdminUserId: sub.cancelledByAdminUserId,
    previousStatus: sub.previousStatus,
    adminNotes: sub.adminNotes,
  };
}

export async function cancelSubscription(input: {
  storeId: string;
  adminUserId: string;
  reason: string;
  notes?: string;
}) {
  const updated = await cancelSubscriptionByAdmin(input);
  await recordAuditEvent({
    actorType: "SUPER_ADMIN",
    actorUserId: input.adminUserId,
    storeId: input.storeId,
    action: "subscription.cancel_by_admin",
    targetType: "Subscription",
    targetId: updated.id,
    metadata: { reason: input.reason, notes: input.notes ?? null },
  });
  return updated;
}

export async function reactivateSubscription(input: {
  storeId: string;
  adminUserId: string;
  notes?: string;
}) {
  const updated = await reactivateSubscriptionByAdmin(input);
  await recordAuditEvent({
    actorType: "SUPER_ADMIN",
    actorUserId: input.adminUserId,
    storeId: input.storeId,
    action: "subscription.reactivate_by_admin",
    targetType: "Subscription",
    targetId: updated.id,
    metadata: { notes: input.notes ?? null },
  });
  return updated;
}

export async function extendSubscription(input: {
  storeId: string;
  adminUserId: string;
  extraDays: number;
  reason: string;
  notes?: string;
}) {
  const updated = await extendSubscriptionByAdmin(input);
  await recordAuditEvent({
    actorType: "SUPER_ADMIN",
    actorUserId: input.adminUserId,
    storeId: input.storeId,
    action: "subscription.extend_by_admin",
    targetType: "Subscription",
    targetId: updated.id,
    metadata: { extraDays: input.extraDays, reason: input.reason, notes: input.notes ?? null },
  });
  return updated;
}

export async function forceSync(input: {
  storeId: string;
  adminUserId: string;
}) {
  const snapshot = await forceSyncWithMp(input.storeId);
  await recordAuditEvent({
    actorType: "SUPER_ADMIN",
    actorUserId: input.adminUserId,
    storeId: input.storeId,
    action: "subscription.force_sync",
    targetType: "Subscription",
    metadata: { status: snapshot.status, plan: snapshot.plan },
  });
  return snapshot;
}

export { AdminSubscriptionError };
