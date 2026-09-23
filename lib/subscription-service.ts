import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getMercadoPagoPreapproval } from "@/lib/mercadopago";
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_TRIAL_DAYS,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIER,
  addDays,
  statusToEnum,
  enumToStatus,
  tierToEnum,
  enumToTier,
  TIER_LIMITS,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "@/lib/subscription-config";

// [M2 FIX] Reduced from 5 min to 15 sec — stale data window is minimal
const SUBSCRIPTION_CACHE_TTL_MS = 15 * 1000; // 15 seconds

interface CacheEntry {
  snapshot: SubscriptionSnapshot;
  expiresAt: number;
}

const subscriptionCache = new Map<string, CacheEntry>();

function getCachedSnapshot(storeId: string): SubscriptionSnapshot | null {
  const entry = subscriptionCache.get(storeId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    subscriptionCache.delete(storeId);
    return null;
  }
  return entry.snapshot;
}

function setCachedSnapshot(storeId: string, snapshot: SubscriptionSnapshot): void {
  subscriptionCache.set(storeId, {
    snapshot,
    expiresAt: Date.now() + SUBSCRIPTION_CACHE_TTL_MS,
  });
}

export function invalidateSubscriptionCache(storeId: string): void {
  subscriptionCache.delete(storeId);
}

export interface SubscriptionSnapshot {
  id: string;
  storeId: string;
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  plan: SubscriptionPlan;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  mercadoPagoPreapprovalId: string | null;
  daysRemaining: number;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

type SubscriptionSyncSource = "webhook" | "runtime";

const KNOWN_SUBSCRIPTION_STATUSES = [
  "trial",
  "active",
  "past_due",
  "canceled",
] as const;

/** Convert DB enum value to app-level status string */
function dbStatusToApp(raw: string): SubscriptionStatus {
  return enumToStatus[raw] ?? "past_due";
}

/** Convert app-level status string to DB enum value */
function appStatusToDb(status: SubscriptionStatus): string {
  return statusToEnum[status] ?? SUBSCRIPTION_STATUS.PAST_DUE;
}

function normalizeStatus(raw: string): SubscriptionStatus {
  // Accept both enum values ("ACTIVE") and legacy strings ("active")
  const lower = raw.toLowerCase();
  if (
    lower === "trial" ||
    lower === "active" ||
    lower === "past_due" ||
    lower === "canceled"
  ) {
    return lower;
  }
  // Try enum mapping
  return dbStatusToApp(raw);
}

/** Convert DB enum value to app-level tier string */
function dbTierToApp(raw: string): SubscriptionTier {
  return enumToTier[raw] ?? "simple";
}

/** Convert app-level tier string to DB enum value */
function appTierToDb(tier: SubscriptionTier): string {
  return tierToEnum[tier] ?? SUBSCRIPTION_TIER.SIMPLE;
}

function normalizeTier(raw: string | null | undefined): SubscriptionTier {
  if (!raw) return "simple";
  // Accept both enum values ("PRO") and legacy strings ("pro")
  const lower = raw.toLowerCase();
  if (lower === "simple" || lower === "pro") {
    return lower;
  }
  // Try enum mapping
  return dbTierToApp(raw);
}

/**
 * Mercado Pago preapproval status reference:
 *   pending     -> preapproval sin método de pago (recién creado, previo al pago)
 *   authorized  -> preapproval con método de pago válido (pagado, activo, recurrente)
 *   paused      -> preapproval pausado por el usuario
 *   canceled    -> preapproval terminado (irreversible)
 *   rejected    -> pago rechazado (falla en el cobro recurrente)
 *   charged_back -> contracargo/disputa (cobro revertido por el banco)
 */
export function mapMercadoPagoStatusToSubscriptionStatus(
  raw: string,
): SubscriptionStatus {
  const value = String(raw ?? "").trim().toLowerCase();

  if (value === "authorized" || value === "approved") {
    return "active";
  }

  if (value === "canceled" || value === "cancelled") {
    return "canceled";
  }

  if (value === "charged_back") {
    return "canceled";
  }

  if (value === "paused") {
    return "past_due";
  }

  if (value === "rejected") {
    return "past_due";
  }

  return "past_due";
}

function normalizePlan(raw: string): SubscriptionPlan {
  return raw === "annual" ? "annual" : "monthly";
}

function getRemainingDays(target: Date | null, now: Date) {
  if (!target) {
    return 0;
  }

  const msLeft = target.getTime() - now.getTime();
  if (msLeft <= 0) {
    return 0;
  }

  return Math.ceil(msLeft / (1000 * 60 * 60 * 24));
}

function logStatusTransition(input: {
  storeId: string;
  from: SubscriptionStatus;
  to: SubscriptionStatus;
  source: SubscriptionSyncSource;
}) {
  if (input.from === input.to) {
    return;
  }

  console.info(
    `[Subscription] storeId=${input.storeId} status: ${input.from} -> ${input.to} (source=${input.source})`,
  );
}

function isSubscriptionInconsistent(subscription: {
  status: string;
  plan: string;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}) {
  const hasKnownStatus = KNOWN_SUBSCRIPTION_STATUSES.includes(
    normalizeStatus(subscription.status) as (typeof KNOWN_SUBSCRIPTION_STATUSES)[number],
  );
  const hasKnownPlan =
    subscription.plan === "monthly" || subscription.plan === "annual";
  const hasInvalidTrialShape =
    normalizeStatus(subscription.status) === "trial" && !subscription.trialEndsAt;
  const hasInvalidPeriod =
    subscription.currentPeriodEnd < subscription.currentPeriodStart;

  return (
    !hasKnownStatus || !hasKnownPlan || hasInvalidTrialShape || hasInvalidPeriod
  );
}

function shouldRevalidateAgainstMercadoPago(
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: Date;
    mercadoPagoPreapprovalId: string | null;
    isInconsistent: boolean;
  },
  now: Date,
) {
  if (!subscription.mercadoPagoPreapprovalId) {
    return false;
  }

  if (subscription.isInconsistent) {
    return true;
  }

  if (subscription.status === "past_due") {
    return true;
  }

  return (
    subscription.status === "active" && subscription.currentPeriodEnd < now
  );
}

export async function createTrialSubscription(
  storeId: string,
  now = new Date(),
) {
  const trialEndsAt = addDays(now, SUBSCRIPTION_TRIAL_DAYS);

  return prisma.subscription.create({
    data: {
      storeId,
      status: SUBSCRIPTION_STATUS.TRIAL,
      plan: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      trialEndsAt,
    },
  });
}

export async function getOrCreateSubscription(
  storeId: string,
  now = new Date(),
) {
  const existing = await prisma.subscription.findUnique({
    where: { storeId },
  });

  if (existing) {
    return existing;
  }

  try {
    return await createTrialSubscription(storeId, now);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const retry = await prisma.subscription.findUnique({
        where: { storeId },
      });
      if (retry) return retry;
    }
    throw error;
  }
}

export async function resolveSubscriptionSnapshot(
  storeId: string,
  now = new Date(),
): Promise<SubscriptionSnapshot> {
  const cached = getCachedSnapshot(storeId);
  if (cached) {
    return cached;
  }

  let subscription = await getOrCreateSubscription(storeId, now);

  const normalizedStatus = normalizeStatus(subscription.status);

  if (
    normalizedStatus === "trial" &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt < now
  ) {
    const previousStatus = normalizedStatus;
    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: appStatusToDb("past_due"),
        currentPeriodEnd: subscription.trialEndsAt,
      },
    });

    logStatusTransition({
      storeId: subscription.storeId,
      from: previousStatus,
      to: "past_due",
      source: "runtime",
    });
  }

  if (
    normalizeStatus(subscription.status) === "active" &&
    subscription.currentPeriodEnd < now
  ) {
    const previousStatus = normalizeStatus(subscription.status);
    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: appStatusToDb("past_due"),
      },
    });

    logStatusTransition({
      storeId: subscription.storeId,
      from: previousStatus,
      to: "past_due",
      source: "runtime",
    });
  }

  const localStatus = normalizeStatus(subscription.status);
  const inconsistent = isSubscriptionInconsistent(subscription);

  if (
    shouldRevalidateAgainstMercadoPago(
      {
        status: localStatus,
        currentPeriodEnd: subscription.currentPeriodEnd,
        mercadoPagoPreapprovalId: subscription.mercadoPagoPreapprovalId,
        isInconsistent: inconsistent,
      },
      now,
    )
  ) {
    const preapprovalId = subscription.mercadoPagoPreapprovalId as string;
    console.info(
      `[Subscription] storeId=${subscription.storeId} syncing with Mercado Pago preapprovalId=${preapprovalId} (source=runtime)`,
    );

    try {
      const mpSubscription = await getMercadoPagoPreapproval(preapprovalId);
      const mpStatus = mapMercadoPagoStatusToSubscriptionStatus(
        mpSubscription.status,
      );

      if (mpStatus !== localStatus) {
        const synced = await markSubscriptionFromWebhook({
          preapprovalId,
          status: mpSubscription.status,
          plan: mpSubscription.frequencyType === "years" ? "annual" : "monthly",
          currentPeriodStart: mpSubscription.dateCreated ?? undefined,
          currentPeriodEnd: mpSubscription.nextPaymentDate ?? undefined,
          source: "runtime",
        });

        if (synced) {
          subscription = synced;
        }
      } else {
        console.info(
          `[Subscription] storeId=${subscription.storeId} status unchanged (${localStatus}) after runtime sync`,
        );
      }
    } catch (error) {
      console.error(
        `[Subscription] storeId=${subscription.storeId} Mercado Pago runtime sync failed`,
        error,
      );
    }
  }

  const status = normalizeStatus(subscription.status);
  const tier = normalizeTier(subscription.tier);
  const plan = normalizePlan(subscription.plan);
  const targetDate =
    status === "trial"
      ? subscription.trialEndsAt
      : subscription.currentPeriodEnd;

  const snapshot: SubscriptionSnapshot = {
    id: subscription.id,
    storeId: subscription.storeId,
    status,
    tier,
    plan,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialEndsAt: subscription.trialEndsAt,
    mercadoPagoPreapprovalId: subscription.mercadoPagoPreapprovalId,
    daysRemaining: getRemainingDays(targetDate, now),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
    canceledAt: subscription.canceledAt ?? null,
  };

  setCachedSnapshot(storeId, snapshot);

  return snapshot;
}

export async function enforceSalesAccess(storeId: string, isSuperAdmin?: boolean) {
  return enforceSubscriptionAccess(storeId, "sales", isSuperAdmin);
}

export interface EnforceSubscriptionResult {
  allowed: boolean;
  reason?: "STORE_SUSPENDED" | "INACTIVE";
  snapshot: SubscriptionSnapshot;
}

/**
 * Enforce feature access based on subscription status.
 *
 * Grace period logic:
 * - If cancelAtPeriodEnd == true AND currentPeriodEnd > now(), allow access.
 *   The user paid for the current period — they keep access until it expires.
 * - Once currentPeriodEnd passes, access is revoked (status becomes past_due).
 */
export async function enforceSubscriptionAccess(
  storeId: string,
  _feature?: string,
  isSuperAdmin?: boolean,
): Promise<EnforceSubscriptionResult> {
  // Super admin bypasses all subscription restrictions
  if (isSuperAdmin) {
    const snapshot = await resolveSubscriptionSnapshot(storeId);
    return { allowed: true, snapshot };
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { suspendedAt: true },
  });

  if (store?.suspendedAt) {
    const snapshot = await resolveSubscriptionSnapshot(storeId);
    return {
      allowed: false,
      reason: "STORE_SUSPENDED",
      snapshot,
    };
  }

  const snapshot = await resolveSubscriptionSnapshot(storeId);
  const now = new Date();

  // Active or trial — always allowed
  if (snapshot.status === "active" || snapshot.status === "trial") {
    return { allowed: true, snapshot };
  }

  // Grace period: canceled but user set cancelAtPeriodEnd and period hasn't expired
  if (
    snapshot.cancelAtPeriodEnd &&
    snapshot.currentPeriodEnd > now &&
    snapshot.status !== "past_due"
  ) {
    return { allowed: true, snapshot };
  }

  // past_due or canceled without grace — block
  if (snapshot.status === "past_due" || snapshot.status === "canceled") {
    return {
      allowed: false,
      reason: "INACTIVE",
      snapshot,
    };
  }

  return {
    allowed: true,
    snapshot,
  };
}

export interface EnforceFeatureResult {
  allowed: boolean;
  reason?: "STORE_SUSPENDED" | "INACTIVE" | "PRODUCT_LIMIT_REACHED" | "EXPORT_REQUIRES_PRO" | "IMPORT_REQUIRES_PLAN";
  snapshot: SubscriptionSnapshot;
  currentCount?: number;
  maxProducts?: number;
}

/**
 * Enforce feature access based on subscription tier and limits.
 *
 * Features:
 * - "products": checks product count against tier limit
 * - "export": requires pro tier
 * - "import": allowed for all tiers (but gated by subscription status)
 */
export async function enforceFeatureAccess(
  storeId: string,
  feature: "products" | "export" | "import",
  isSuperAdmin?: boolean,
): Promise<EnforceFeatureResult> {
  // Super admin bypasses all feature restrictions
  if (isSuperAdmin) {
    const snapshot = await resolveSubscriptionSnapshot(storeId);
    return { allowed: true, snapshot };
  }

  // First check subscription status
  const access = await enforceSubscriptionAccess(storeId, undefined, isSuperAdmin);
  if (!access.allowed) {
    return {
      allowed: false,
      reason: access.reason === "STORE_SUSPENDED" ? "STORE_SUSPENDED" : "INACTIVE",
      snapshot: access.snapshot,
    };
  }

  const tier = access.snapshot.tier;
  const limits = TIER_LIMITS[tier];

  switch (feature) {
    case "products": {
      const count = await prisma.product.count({ where: { storeId } });
      const maxProducts = limits.maxProducts;
      return {
        allowed: count < maxProducts,
        reason: count >= maxProducts ? "PRODUCT_LIMIT_REACHED" : undefined,
        snapshot: access.snapshot,
        currentCount: count,
        maxProducts: maxProducts === Infinity ? undefined : maxProducts,
      };
    }
    case "export":
      return {
        allowed: limits.canExport,
        reason: !limits.canExport ? "EXPORT_REQUIRES_PRO" : undefined,
        snapshot: access.snapshot,
      };
    case "import":
      return {
        allowed: limits.canImport,
        reason: !limits.canImport ? "IMPORT_REQUIRES_PLAN" : undefined,
        snapshot: access.snapshot,
      };
    default:
      return { allowed: true, snapshot: access.snapshot };
  }
}

export class AdminSubscriptionError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface CancelSubscriptionByAdminInput {
  storeId: string;
  adminUserId: string;
  reason: string;
  notes?: string;
}

/**
 * Admin cancellation: sets cancelAtPeriodEnd = true so the user retains
 * access until their current period expires. Does NOT cancel the MP preapproval.
 */
export async function cancelSubscriptionByAdmin(
  input: CancelSubscriptionByAdminInput,
) {
  const sub = await prisma.subscription.findUnique({ where: { storeId: input.storeId } });
  if (!sub) {
    throw new AdminSubscriptionError("No subscription found for store", 404);
  }

  if (sub.cancelledByAdmin) {
    throw new AdminSubscriptionError("La suscripción ya fue cancelada por admin", 409);
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: appStatusToDb("canceled"),
      previousStatus: sub.status,
      cancelledByAdmin: true,
      cancelledByAdminUserId: input.adminUserId,
      adminNotes: input.notes ?? null,
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    },
  });

  invalidateSubscriptionCache(input.storeId);
  return updated;
}

export interface ReactivateSubscriptionByAdminInput {
  storeId: string;
  adminUserId: string;
  notes?: string;
}

export async function reactivateSubscriptionByAdmin(
  input: ReactivateSubscriptionByAdminInput,
) {
  const sub = await prisma.subscription.findUnique({ where: { storeId: input.storeId } });
  if (!sub) {
    throw new AdminSubscriptionError("No subscription found for store", 404);
  }

  if (!sub.cancelledByAdmin) {
    throw new AdminSubscriptionError("Solo se puede reactivar una suscripción cancelada por admin", 409);
  }

  const now = new Date();
  const intervalDays = SUBSCRIPTION_PLANS[sub.plan as SubscriptionPlan].intervalDays;
  const newPeriodEnd = addDays(now, intervalDays);

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: appStatusToDb("active"),
      cancelledByAdmin: false,
      cancelledByAdminUserId: null,
      adminNotes: input.notes ?? null,
      previousStatus: sub.status,
      currentPeriodStart: now,
      currentPeriodEnd: newPeriodEnd,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
  });

  invalidateSubscriptionCache(input.storeId);
  return updated;
}

export interface ExtendSubscriptionByAdminInput {
  storeId: string;
  adminUserId: string;
  extraDays: number;
  reason: string;
  notes?: string;
}

export async function extendSubscriptionByAdmin(
  input: ExtendSubscriptionByAdminInput,
) {
  if (!Number.isFinite(input.extraDays) || input.extraDays <= 0 || input.extraDays > 365) {
    throw new AdminSubscriptionError("extraDays debe estar entre 1 y 365", 400);
  }

  const sub = await prisma.subscription.findUnique({ where: { storeId: input.storeId } });
  if (!sub) {
    throw new AdminSubscriptionError("No subscription found for store", 404);
  }

  const baseEnd =
    normalizeStatus(sub.status) === "trial" && sub.trialEndsAt && sub.trialEndsAt > new Date()
      ? sub.trialEndsAt
      : sub.currentPeriodEnd;

  const newEnd = addDays(baseEnd, input.extraDays);

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      currentPeriodEnd: newEnd,
      adminNotes: [
        sub.adminNotes ?? null,
        `[+${input.extraDays}d] ${input.reason}${input.notes ? ` — ${input.notes}` : ""}`,
      ]
        .filter(Boolean)
        .join("\n") || null,
    },
  });

  invalidateSubscriptionCache(input.storeId);
  return updated;
}

export async function forceSyncWithMp(storeId: string) {
  invalidateSubscriptionCache(storeId);
  return resolveSubscriptionSnapshot(storeId);
}

export async function markSubscriptionFromWebhook(input: {
  preapprovalId: string;
  status: string;
  plan?: SubscriptionPlan;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  source?: SubscriptionSyncSource;
}) {
  const source = input.source ?? "webhook";
  const rawMpStatus = String(input.status ?? "");
  const mappedStatus = mapMercadoPagoStatusToSubscriptionStatus(rawMpStatus);

  const existing = await prisma.subscription.findFirst({
    where: { mercadoPagoPreapprovalId: input.preapprovalId },
  });

  if (!existing) {
    console.warn(
      `[Subscription] markSubscriptionFromWebhook: no subscription found for preapprovalId=${input.preapprovalId} (source=${source})`,
    );
    return null;
  }

  const currentStatus = normalizeStatus(existing.status);

  console.info(
    `[Subscription] markSubscriptionFromWebhook input preapprovalId=${input.preapprovalId} storeId=${existing.storeId} rawMpStatus="${rawMpStatus}" mappedStatus="${mappedStatus}" currentStatus="${currentStatus}" source=${source}`,
  );

  if (rawMpStatus.trim().toLowerCase() === "pending") {
    console.info(
      `[Subscription] storeId=${existing.storeId} ignoring pending preapproval (keeping current status=${currentStatus}) (source=${source})`,
    );
    return existing;
  }

  if (currentStatus === mappedStatus) {
    console.info(
      `[Subscription] storeId=${existing.storeId} no-op: status already ${currentStatus} (source=${source})`,
    );
    return existing;
  }

  const plan = input.plan ?? normalizePlan(existing.plan);
  const now = new Date();
  const periodStart = input.currentPeriodStart ?? now;
  const computedPeriodEnd =
    input.currentPeriodEnd ??
    addDays(periodStart, SUBSCRIPTION_PLANS[plan].intervalDays);
  const periodEnd =
    mappedStatus === "active" && computedPeriodEnd < now
      ? addDays(now, SUBSCRIPTION_PLANS[plan].intervalDays)
      : computedPeriodEnd;

  const updated = await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: appStatusToDb(mappedStatus),
      plan,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: mappedStatus === "active" ? null : existing.trialEndsAt,
      // Clear cancelAtPeriodEnd if reactivated
      cancelAtPeriodEnd: mappedStatus === "active" ? false : existing.cancelAtPeriodEnd,
      canceledAt: mappedStatus === "canceled" ? new Date() : existing.canceledAt,
    },
  });

  logStatusTransition({
    storeId: existing.storeId,
    from: currentStatus,
    to: normalizeStatus(updated.status),
    source,
  });

  invalidateSubscriptionCache(existing.storeId);

  return updated;
}
