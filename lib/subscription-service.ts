import { prisma } from "@/lib/prisma";
import { getMercadoPagoPreapproval } from "@/lib/mercadopago";
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_TRIAL_DAYS,
  addDays,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/lib/subscription-config";

const SUBSCRIPTION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
  plan: SubscriptionPlan;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  mercadoPagoPreapprovalId: string | null;
  daysRemaining: number;
}

type SubscriptionSyncSource = "webhook" | "runtime";

const KNOWN_SUBSCRIPTION_STATUSES = [
  "trial",
  "active",
  "past_due",
  "canceled",
] as const;

function normalizeStatus(raw: string): SubscriptionStatus {
  if (
    raw === "trial" ||
    raw === "active" ||
    raw === "past_due" ||
    raw === "canceled"
  ) {
    return raw;
  }
  return "past_due";
}

/**
 * Mercado Pago preapproval status reference:
 *   pending     -> preapproval sin método de pago (recién creado, previo al pago)
 *   authorized  -> preapproval con método de pago válido (pagado, activo, recurrente)
 *   paused      -> preapproval pausado por el usuario
 *   canceled    -> preapproval terminado (irreversible)
 *
 * También aceptamos `approved`/`rejected` por compatibilidad con payloads viejos
 * o si en algún momento se reusa código con payments puntuales.
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
    subscription.status as (typeof KNOWN_SUBSCRIPTION_STATUSES)[number],
  );
  const hasKnownPlan =
    subscription.plan === "monthly" || subscription.plan === "annual";
  const hasInvalidTrialShape =
    subscription.status === "trial" && !subscription.trialEndsAt;
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
      status: "trial",
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

  return createTrialSubscription(storeId, now);
}

export async function resolveSubscriptionSnapshot(
  storeId: string,
  now = new Date(),
): Promise<SubscriptionSnapshot> {
  if (getCachedSnapshot(storeId)) {
    return getCachedSnapshot(storeId)!;
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
        status: "past_due",
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
        status: "past_due",
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
  const plan = normalizePlan(subscription.plan);
  const targetDate =
    status === "trial"
      ? subscription.trialEndsAt
      : subscription.currentPeriodEnd;

  const snapshot: SubscriptionSnapshot = {
    id: subscription.id,
    storeId: subscription.storeId,
    status,
    plan,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialEndsAt: subscription.trialEndsAt,
    mercadoPagoPreapprovalId: subscription.mercadoPagoPreapprovalId,
    daysRemaining: getRemainingDays(targetDate, now),
  };

  setCachedSnapshot(storeId, snapshot);

  return snapshot;
}

export async function enforceSalesAccess(storeId: string) {
  return enforceSubscriptionAccess(storeId, "sales");
}

export async function enforceSubscriptionAccess(
  storeId: string,
  _feature?: string,
) {
  const snapshot = await resolveSubscriptionSnapshot(storeId);
  if (snapshot.status === "past_due" || snapshot.status === "canceled") {
    return {
      allowed: false,
      snapshot,
    };
  }

  return {
    allowed: true,
    snapshot,
  };
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
      status: mappedStatus,
      plan,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: mappedStatus === "active" ? null : existing.trialEndsAt,
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
