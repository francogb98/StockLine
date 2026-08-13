import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit-service", () => ({
  recordAuditEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/subscription-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/subscription-service")>(
    "@/lib/subscription-service",
  );
  return {
    ...actual,
    cancelSubscriptionByAdmin: vi.fn(),
    reactivateSubscriptionByAdmin: vi.fn(),
    extendSubscriptionByAdmin: vi.fn(),
    forceSyncWithMp: vi.fn(),
  };
});

import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit-service";
import {
  cancelSubscriptionByAdmin,
  reactivateSubscriptionByAdmin,
  extendSubscriptionByAdmin,
  forceSyncWithMp,
} from "@/lib/subscription-service";
import {
  listSubscriptions,
  cancelSubscription,
  reactivateSubscription,
  extendSubscription,
  forceSync,
} from "@/lib/super-admin/subscriptions-service";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("listSubscriptions", () => {
  it("returns paginated items joined with store name", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      {
        id: "sub-1",
        storeId: "store-1",
        store: { name: "Tienda A" },
        status: "active",
        plan: "monthly",
        currentPeriodEnd: new Date("2026-12-31"),
        cancelledByAdmin: false,
        trialEndsAt: null,
        mercadoPagoPreapprovalId: "mpp-1",
      },
    ] as any);
    vi.mocked(prisma.subscription.count).mockResolvedValue(1);

    const result = await listSubscriptions({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].storeName).toBe("Tienda A");
    expect(result.items[0].mercadoPagoPreapprovalId).toBe("mpp-1");
    expect(result.total).toBe(1);
  });

  it("clamps page and limit", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.subscription.count).mockResolvedValue(0);

    await listSubscriptions({ page: -5, limit: 5000 });
    const args = vi.mocked(prisma.subscription.findMany).mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(100);
  });
});

describe("cancelSubscription", () => {
  it("delegates to subscription-service and emits audit", async () => {
    const updated = { id: "sub-1", status: "canceled" } as any;
    vi.mocked(cancelSubscriptionByAdmin).mockResolvedValue(updated);

    await cancelSubscription({
      storeId: "store-1",
      adminUserId: "sa-1",
      reason: "manual review",
      notes: "abuse",
    });

    expect(cancelSubscriptionByAdmin).toHaveBeenCalledOnce();
    expect(recordAuditEvent).toHaveBeenCalledOnce();
    const arg = vi.mocked(recordAuditEvent).mock.calls[0][0];
    expect(arg.action).toBe("subscription.cancel_by_admin");
    expect(arg.actorType).toBe("SUPER_ADMIN");
    expect(arg.metadata).toEqual({ reason: "manual review", notes: "abuse" });
  });
});

describe("reactivateSubscription", () => {
  it("delegates and emits audit", async () => {
    const updated = { id: "sub-1", status: "active" } as any;
    vi.mocked(reactivateSubscriptionByAdmin).mockResolvedValue(updated);

    await reactivateSubscription({
      storeId: "store-1",
      adminUserId: "sa-1",
    });

    expect(reactivateSubscriptionByAdmin).toHaveBeenCalledOnce();
    expect(recordAuditEvent).toHaveBeenCalledOnce();
    const arg = vi.mocked(recordAuditEvent).mock.calls[0][0];
    expect(arg.action).toBe("subscription.reactivate_by_admin");
  });
});

describe("extendSubscription", () => {
  it("delegates with full args and emits audit", async () => {
    const updated = { id: "sub-1", currentPeriodEnd: new Date() } as any;
    vi.mocked(extendSubscriptionByAdmin).mockResolvedValue(updated);

    await extendSubscription({
      storeId: "store-1",
      adminUserId: "sa-1",
      extraDays: 14,
      reason: "goodwill",
      notes: "test",
    });

    expect(extendSubscriptionByAdmin).toHaveBeenCalledOnce();
    expect(recordAuditEvent).toHaveBeenCalledOnce();
    const arg = vi.mocked(recordAuditEvent).mock.calls[0][0];
    expect(arg.action).toBe("subscription.extend_by_admin");
    expect(arg.metadata).toEqual({ extraDays: 14, reason: "goodwill", notes: "test" });
  });
});

describe("forceSync", () => {
  it("delegates to forceSyncWithMp and emits audit", async () => {
    const snapshot = {
      id: "sub-1",
      status: "active",
      plan: "monthly",
    } as any;
    vi.mocked(forceSyncWithMp).mockResolvedValue(snapshot);

    await forceSync({ storeId: "store-1", adminUserId: "sa-1" });

    expect(forceSyncWithMp).toHaveBeenCalledOnce();
    expect(recordAuditEvent).toHaveBeenCalledOnce();
    const arg = vi.mocked(recordAuditEvent).mock.calls[0][0];
    expect(arg.action).toBe("subscription.force_sync");
  });
});
