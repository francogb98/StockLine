export type SubscriptionPlan = "monthly" | "annual";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";

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

export function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return value === "monthly" || value === "annual";
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
