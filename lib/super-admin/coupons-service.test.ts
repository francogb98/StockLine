import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    coupon: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    couponRedemption: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([{
          id: "c-1",
          redeemedCount: 5,
          maxRedemptions: 100,
          durationDays: 30,
        }]),
        couponRedemption: { create: vi.fn().mockResolvedValue({ id: "r-1" }) },
        coupon: { update: vi.fn().mockResolvedValue({ redeemedCount: 6 }) },
        subscription: {
          findUnique: vi.fn().mockResolvedValue({
            id: "sub-1",
            status: "trial",
            trialEndsAt: new Date(Date.now() + 7 * 86400000),
            currentPeriodEnd: new Date(Date.now() + 7 * 86400000),
            adminNotes: null,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    }),
  },
}));

vi.mock("@/lib/audit-service", () => ({
  recordAuditEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/subscription-service", () => ({
  invalidateSubscriptionCache: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit-service";
import {
  CouponError,
  createCoupon,
  listCoupons,
  toggleCoupon,
  updateCoupon,
  validateAndRedeemCoupon,
} from "@/lib/super-admin/coupons-service";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("listCoupons", () => {
  it("returns paginated items", async () => {
    vi.mocked(prisma.coupon.findMany).mockResolvedValue([
      { id: "c-1", code: "WELCOME10" } as any,
    ]);
    vi.mocked(prisma.coupon.count).mockResolvedValue(1);

    const result = await listCoupons({ page: 1, limit: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it("clamps limit and page", async () => {
    vi.mocked(prisma.coupon.findMany).mockResolvedValue([]);
    vi.mocked(prisma.coupon.count).mockResolvedValue(0);

    await listCoupons({ page: -1, limit: 9999 });
    const args = vi.mocked(prisma.coupon.findMany).mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(100);
  });
});

describe("createCoupon", () => {
  it("normalizes code to upper-case and stores", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.coupon.create).mockResolvedValue({ id: "c-1", code: "HELLO" } as any);

    await createCoupon({
      code: "  Hello  ",
      discountType: "PERCENTAGE",
      discountValue: 10,
      applicablePlans: [],
      applicableTiers: [],
      createdByUserId: "sa-1",
    });

    const data = vi.mocked(prisma.coupon.create).mock.calls[0][0].data;
    expect(data.code).toBe("HELLO");
    expect(data.durationDays).toBe(30);
    expect(data.isActive).toBe(true);
  });

  it("rejects duplicate code with CouponError 409", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({ id: "c-existing" } as any);

    await expect(
      createCoupon({
        code: "DUPL",
        discountType: "PERCENTAGE",
        discountValue: 10,
        applicablePlans: [],
        applicableTiers: [],
        createdByUserId: "sa-1",
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: "COUPON_DUPLICATE" });
  });

  it("rejects out-of-range PERCENTAGE discount", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(null);

    await expect(
      createCoupon({
        code: "BAD",
        discountType: "PERCENTAGE",
        discountValue: 150,
        applicablePlans: [],
        applicableTiers: [],
        createdByUserId: "sa-1",
      }),
    ).rejects.toBeInstanceOf(CouponError);
  });
});

describe("updateCoupon", () => {
  it("blocks discountType change when redemptions exist", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      id: "c-1",
      redeemedCount: 5,
    } as any);

    await expect(
      updateCoupon("c-1", {
        // @ts-expect-error testing runtime guard
        discountType: "FIXED",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("blocks discountValue change when redemptions exist", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      id: "c-1",
      redeemedCount: 5,
    } as any);

    await expect(
      updateCoupon("c-1", {
        // @ts-expect-error testing runtime guard
        discountValue: 50,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("blocks any change when redemptions exist", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      id: "c-1",
      redeemedCount: 5,
    } as any);

    await expect(
      updateCoupon("c-1", { isActive: false }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("toggleCoupon", () => {
  it("updates isActive and emits audit", async () => {
    vi.mocked(prisma.coupon.update).mockResolvedValue({ code: "X" } as any);

    await toggleCoupon("c-1", false, "sa-1");

    expect(prisma.coupon.update).toHaveBeenCalledOnce();
    expect(recordAuditEvent).toHaveBeenCalledOnce();
    const arg = vi.mocked(recordAuditEvent).mock.calls[0][0];
    expect(arg.action).toBe("coupon.toggle");
    expect(arg.metadata).toEqual({ code: "X", isActive: false });
  });
});

describe("validateAndRedeemCoupon", () => {
  const baseCoupon = {
    id: "c-1",
    code: "WELCOME10",
    description: null,
    discountType: "PERCENTAGE",
    discountValue: 10,
    durationDays: 30,
    maxRedemptions: 100,
    redeemedCount: 5,
    applicablePlans: [],
    applicableTiers: [],
    startsAt: new Date("2026-01-01"),
    expiresAt: null,
    isActive: true,
    createdByUserId: "sa-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  it("rejects expired coupon", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      ...baseCoupon,
      expiresAt: new Date("2026-01-01"),
    });
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-08-12").getTime());

    await expect(
      validateAndRedeemCoupon({
        code: "WELCOME10",
        storeId: "s-1",
        subscriptionId: "sub-1",
        plan: "monthly",
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: "COUPON_EXPIRED" });
  });

  it("rejects exhausted coupon (maxRedemptions reached)", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      ...baseCoupon,
      maxRedemptions: 5,
      redeemedCount: 5,
    });

    await expect(
      validateAndRedeemCoupon({
        code: "WELCOME10",
        storeId: "s-1",
        subscriptionId: "sub-1",
        plan: "monthly",
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: "COUPON_EXHAUSTED" });
  });

  it("rejects when plan is not applicable", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      ...baseCoupon,
      applicablePlans: ["annual"],
    });

    await expect(
      validateAndRedeemCoupon({
        code: "WELCOME10",
        storeId: "s-1",
        subscriptionId: "sub-1",
        plan: "monthly",
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: "COUPON_PLAN_MISMATCH" });
  });

  it("rejects double-redemption on same subscription", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(baseCoupon);
    vi.mocked(prisma.couponRedemption.findUnique).mockResolvedValue({ id: "r-1" } as any);

    await expect(
      validateAndRedeemCoupon({
        code: "WELCOME10",
        storeId: "s-1",
        subscriptionId: "sub-1",
        plan: "monthly",
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: "COUPON_ALREADY_REDEEMED" });
  });

  it("succeeds: creates redemption, increments counter, extends subscription", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(baseCoupon);
    vi.mocked(prisma.couponRedemption.findUnique).mockResolvedValue(null);

    const result = await validateAndRedeemCoupon({
      code: "WELCOME10",
      storeId: "s-1",
      subscriptionId: "sub-1",
      plan: "monthly",
      redeemedByUserId: "user-1",
    });

    expect(result.discountApplied).toBeGreaterThan(0);
    expect(result.newPeriodEnd).toBeInstanceOf(Date);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(recordAuditEvent).toHaveBeenCalledOnce();
  });

  it("throws COUPON_EXHAUSTED when maxRedemptions reached inside transaction", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(baseCoupon);
    vi.mocked(prisma.couponRedemption.findUnique).mockResolvedValue(null);
    // Mock transaction to simulate exhausted coupon
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (fn: any) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([{
          id: "c-1",
          redeemedCount: 100,
          maxRedemptions: 100,
          durationDays: 30,
        }]),
        couponRedemption: { create: vi.fn() },
        coupon: { update: vi.fn() },
        subscription: { findUnique: vi.fn(), update: vi.fn() },
      };
      return fn(tx);
    });

    await expect(
      validateAndRedeemCoupon({
        code: "WELCOME10",
        storeId: "s-1",
        subscriptionId: "sub-1",
        plan: "monthly",
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: "COUPON_EXHAUSTED" });
  });

  it("handles missing subscription gracefully inside transaction", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(baseCoupon);
    vi.mocked(prisma.couponRedemption.findUnique).mockResolvedValue(null);
    // Mock transaction with no subscription
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (fn: any) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([{
          id: "c-1",
          redeemedCount: 5,
          maxRedemptions: 100,
          durationDays: 30,
        }]),
        couponRedemption: { create: vi.fn().mockResolvedValue({ id: "r-1" }) },
        coupon: { update: vi.fn().mockResolvedValue({ redeemedCount: 6 }) },
        subscription: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
      };
      return fn(tx);
    });

    const result = await validateAndRedeemCoupon({
      code: "WELCOME10",
      storeId: "s-1",
      subscriptionId: "sub-1",
      plan: "monthly",
    });

    expect(result.discountApplied).toBeGreaterThan(0);
    expect(result.newPeriodEnd).toBeInstanceOf(Date);
  });
});
