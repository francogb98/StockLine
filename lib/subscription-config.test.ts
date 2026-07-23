import { describe, it, expect } from "vitest";
import {
  SUBSCRIPTION_PLANS,
  isSubscriptionPlan,
  addDays,
  SUBSCRIPTION_TRIAL_DAYS,
} from "@/lib/subscription-config";

describe("subscription-config", () => {
  describe("SUBSCRIPTION_PLANS", () => {
    it("monthly plan has correct values", () => {
      const monthly = SUBSCRIPTION_PLANS.monthly;
      expect(monthly.label).toBe("Mensual");
      expect(monthly.amountArs).toBe(15000);
      expect(monthly.frequency).toBe(1);
      expect(monthly.frequencyType).toBe("months");
      expect(monthly.intervalDays).toBe(30);
    });

    it("annual plan has correct values", () => {
      const annual = SUBSCRIPTION_PLANS.annual;
      expect(annual.label).toBe("Anual");
      expect(annual.amountArs).toBe(150000);
      expect(annual.frequency).toBe(1);
      expect(annual.frequencyType).toBe("years");
      expect(annual.intervalDays).toBe(365);
    });
  });

  describe("SUBSCRIPTION_TRIAL_DAYS", () => {
    it("trial period is 15 days", () => {
      expect(SUBSCRIPTION_TRIAL_DAYS).toBe(15);
    });
  });

  describe("isSubscriptionPlan", () => {
    it("return true for monthly", () => {
      expect(isSubscriptionPlan("monthly")).toBe(true);
    });

    it("return true for annual", () => {
      expect(isSubscriptionPlan("annual")).toBe(true);
    });

    it("return false for invalid plans", () => {
      expect(isSubscriptionPlan("weekly")).toBe(false);
      expect(isSubscriptionPlan("")).toBe(false);
      expect(isSubscriptionPlan("trial")).toBe(false);
    });
  });

  describe("addDays", () => {
    const REF = new Date(2024, 0, 1);

    it("add days to a date", () => {
      const result = addDays(REF, 15);
      expect(result.getDate()).toBe(16);
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2024);
    });

    it("handle month boundary", () => {
      const result = addDays(new Date(2024, 0, 20), 15);
      expect(result.getDate()).toBe(4);
      expect(result.getMonth()).toBe(1);
    });

    it("not mutate original date", () => {
      const date = new Date(2024, 0, 1);
      const copy = new Date(date);
      addDays(date, 10);
      expect(date.getTime()).toBe(copy.getTime());
    });
  });
});
