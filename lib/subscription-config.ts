export type SubscriptionPlan = "monthly" | "annual";

// Backward-compatible string union used throughout the app.
// Maps 1:1 to the Prisma SubscriptionStatus enum.
export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";

// Subscription tier — feature level (simple vs pro)
export type SubscriptionTier = "simple" | "pro";

// Prisma enum values — use these when writing to the DB.
export const SUBSCRIPTION_STATUS = {
  TRIAL: "TRIAL",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
} as const;

// Prisma enum values for tier
export const SUBSCRIPTION_TIER = {
  SIMPLE: "SIMPLE",
  PRO: "PRO",
} as const;

// Mapping: app-level status → Prisma enum value
export const statusToEnum: Record<SubscriptionStatus, string> = {
  trial: SUBSCRIPTION_STATUS.TRIAL,
  active: SUBSCRIPTION_STATUS.ACTIVE,
  past_due: SUBSCRIPTION_STATUS.PAST_DUE,
  canceled: SUBSCRIPTION_STATUS.CANCELED,
};

// Mapping: Prisma enum value → app-level status
export const enumToStatus: Record<string, SubscriptionStatus> = {
  TRIAL: "trial",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
};

// Mapping: app-level tier → Prisma enum value
export const tierToEnum: Record<SubscriptionTier, string> = {
  simple: SUBSCRIPTION_TIER.SIMPLE,
  pro: SUBSCRIPTION_TIER.PRO,
};

// Mapping: Prisma enum value → app-level tier
export const enumToTier: Record<string, SubscriptionTier> = {
  SIMPLE: "simple",
  PRO: "pro",
};

export const SUBSCRIPTION_TRIAL_DAYS = 15;

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlan,
  {
    label: string;
    amountArs: number;
    frequency: number;
    frequencyType: "months" | "years";
    intervalDays: number;
  }
> = {
  monthly: {
    label: "Mensual",
    amountArs: 15000,
    frequency: 1,
    frequencyType: "months",
    intervalDays: 30,
  },
  annual: {
    label: "Anual",
    amountArs: 150000,
    frequency: 1,
    frequencyType: "years",
    intervalDays: 365,
  },
};

// Tier-based pricing: amountArs per tier × plan
export const TIER_PRICING: Record<
  SubscriptionTier,
  Record<SubscriptionPlan, { amountArs: number }>
> = {
  simple: {
    monthly: { amountArs: 10000 },
    annual: { amountArs: 100000 },
  },
  pro: {
    monthly: { amountArs: 15000 },
    annual: { amountArs: 150000 },
  },
};

// Feature limits per tier
export const TIER_LIMITS: Record<
  SubscriptionTier,
  {
    maxProducts: number;
    canExport: boolean;
    canImport: boolean;
  }
> = {
  simple: {
    maxProducts: 200,
    canExport: false,
    canImport: false,
  },
  pro: {
    maxProducts: Infinity,
    canExport: true,
    canImport: true,
  },
};

export function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return value === "monthly" || value === "annual";
}

export function isSubscriptionTier(value: string): value is SubscriptionTier {
  return value === "simple" || value === "pro";
}

export function addDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
