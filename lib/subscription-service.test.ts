import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getMercadoPagoPreapproval } from "@/lib/mercadopago";
import {
  resolveSubscriptionSnapshot,
  enforceSalesAccess,
  markSubscriptionFromWebhook,
  mapMercadoPagoStatusToSubscriptionStatus,
} from "@/lib/subscription-service";

vi.mock("@/lib/mercadopago", () => ({
  getMercadoPagoPreapproval: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mapMercadoPagoStatusToSubscriptionStatus", () => {
  it("maps authorized -> active (preapproval paid)", () => {
    expect(mapMercadoPagoStatusToSubscriptionStatus("authorized")).toBe(
      "active",
    );
  });

  it("maps approved -> active (legacy/payment compat)", () => {
    expect(mapMercadoPagoStatusToSubscriptionStatus("approved")).toBe(
      "active",
    );
  });

  it("maps canceled (US) -> canceled", () => {
    expect(mapMercadoPagoStatusToSubscriptionStatus("canceled")).toBe(
      "canceled",
    );
  });

  it("maps cancelled (UK) -> canceled", () => {
    expect(mapMercadoPagoStatusToSubscriptionStatus("cancelled")).toBe(
      "canceled",
    );
  });

  it("maps paused -> past_due", () => {
    expect(mapMercadoPagoStatusToSubscriptionStatus("paused")).toBe(
      "past_due",
    );
  });

  it("maps rejected -> past_due", () => {
    expect(mapMercadoPagoStatusToSubscriptionStatus("rejected")).toBe(
      "past_due",
    );
  });

  it("does NOT map pending (it is handled separately, not via this fn)", () => {
    expect(mapMercadoPagoStatusToSubscriptionStatus("pending")).toBe(
      "past_due",
    );
  });

  it("falls back to past_due for unknown statuses", () => {
    expect(mapMercadoPagoStatusToSubscriptionStatus("foo")).toBe("past_due");
  });
});

describe("subscription-service", () => {
  it("moves trial to past_due when trial date is expired", async () => {
    const now = new Date("2026-03-31T12:00:00.000Z");
    const expiredTrial = new Date("2026-03-01T00:00:00.000Z");

    vi.spyOn(prisma.subscription, "findUnique").mockResolvedValue({
      id: "sub-1",
      storeId: "store-1",
      status: "trial",
      plan: "monthly",
      currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
      currentPeriodEnd: expiredTrial,
      trialEndsAt: expiredTrial,
      mercadoPagoPreapprovalId: null,
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    } as any);

    const updateSpy = vi
      .spyOn(prisma.subscription, "update")
      .mockResolvedValue({
        id: "sub-1",
        storeId: "store-1",
        status: "past_due",
        plan: "monthly",
        currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
        currentPeriodEnd: expiredTrial,
        trialEndsAt: expiredTrial,
        mercadoPagoPreapprovalId: null,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: now,
      } as any);

    const snapshot = await resolveSubscriptionSnapshot("store-1", now);

    expect(updateSpy).toHaveBeenCalled();
    expect(snapshot.status).toBe("past_due");
    expect(snapshot.daysRemaining).toBe(0);
  });

  it("blocks sales access when status is past_due", async () => {
    vi.spyOn(prisma.subscription, "findUnique").mockResolvedValue({
      id: "sub-2",
      storeId: "store-2",
      status: "past_due",
      plan: "monthly",
      currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-03-20T00:00:00.000Z"),
      trialEndsAt: null,
      mercadoPagoPreapprovalId: null,
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-21T00:00:00.000Z"),
    } as any);

    const result = await enforceSalesAccess("store-2");

    expect(result.allowed).toBe(false);
    expect(result.snapshot.status).toBe("past_due");
  });

  it("moves active to past_due when current period is expired", async () => {
    const now = new Date("2026-03-31T12:00:00.000Z");

    vi.spyOn(prisma.subscription, "findUnique").mockResolvedValue({
      id: "sub-3",
      storeId: "store-3",
      status: "active",
      plan: "monthly",
      currentPeriodStart: new Date("2026-02-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-03-01T00:00:00.000Z"),
      trialEndsAt: null,
      mercadoPagoPreapprovalId: null,
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
      updatedAt: new Date("2026-02-01T00:00:00.000Z"),
    } as any);

    const updateSpy = vi
      .spyOn(prisma.subscription, "update")
      .mockResolvedValue({
        id: "sub-3",
        storeId: "store-3",
        status: "past_due",
        plan: "monthly",
        currentPeriodStart: new Date("2026-02-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2026-03-01T00:00:00.000Z"),
        trialEndsAt: null,
        mercadoPagoPreapprovalId: null,
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
        updatedAt: now,
      } as any);

    const snapshot = await resolveSubscriptionSnapshot("store-3", now);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(snapshot.status).toBe("past_due");
  });

  it("re-syncs to active when Mercado Pago returns authorized (preapproval paid)", async () => {
    const now = new Date("2026-03-31T12:00:00.000Z");

    vi.spyOn(prisma.subscription, "findUnique").mockResolvedValue({
      id: "sub-4",
      storeId: "store-4",
      status: "past_due",
      plan: "monthly",
      currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-03-20T00:00:00.000Z"),
      trialEndsAt: null,
      mercadoPagoPreapprovalId: "mp-preapproval-1",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-20T00:00:00.000Z"),
    } as any);

    vi.spyOn(prisma.subscription, "findFirst").mockResolvedValue({
      id: "sub-4",
      storeId: "store-4",
      status: "past_due",
      plan: "monthly",
      currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-03-20T00:00:00.000Z"),
      trialEndsAt: null,
      mercadoPagoPreapprovalId: "mp-preapproval-1",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-20T00:00:00.000Z"),
    } as any);

    const updateSpy = vi
      .spyOn(prisma.subscription, "update")
      .mockResolvedValue({
        id: "sub-4",
        storeId: "store-4",
        status: "active",
        plan: "monthly",
        currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2026-04-20T00:00:00.000Z"),
        trialEndsAt: null,
        mercadoPagoPreapprovalId: "mp-preapproval-1",
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: now,
      } as any);

    vi.mocked(getMercadoPagoPreapproval).mockResolvedValue({
      id: "mp-preapproval-1",
      status: "authorized",
      frequencyType: "months",
      dateCreated: new Date("2026-03-01T00:00:00.000Z"),
      nextPaymentDate: new Date("2026-04-20T00:00:00.000Z"),
    });

    const snapshot = await resolveSubscriptionSnapshot("store-4", now);

    expect(getMercadoPagoPreapproval).toHaveBeenCalledWith("mp-preapproval-1");
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(snapshot.status).toBe("active");
  });

  it("does not write when runtime sync finds same status", async () => {
    const now = new Date("2026-03-31T12:00:00.000Z");

    vi.spyOn(prisma.subscription, "findUnique").mockResolvedValue({
      id: "sub-5",
      storeId: "store-5",
      status: "past_due",
      plan: "monthly",
      currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-03-20T00:00:00.000Z"),
      trialEndsAt: null,
      mercadoPagoPreapprovalId: "mp-preapproval-2",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-20T00:00:00.000Z"),
    } as any);

    const updateSpy = vi.spyOn(prisma.subscription, "update");

    vi.mocked(getMercadoPagoPreapproval).mockResolvedValue({
      id: "mp-preapproval-2",
      status: "rejected",
      frequencyType: "months",
      dateCreated: new Date("2026-03-01T00:00:00.000Z"),
      nextPaymentDate: new Date("2026-03-20T00:00:00.000Z"),
    });

    const snapshot = await resolveSubscriptionSnapshot("store-5", now);

    expect(getMercadoPagoPreapproval).toHaveBeenCalledWith("mp-preapproval-2");
    expect(updateSpy).not.toHaveBeenCalled();
    expect(snapshot.status).toBe("past_due");
  });

  it("does not downgrade trial to past_due when webhook reports pending", async () => {
    vi.spyOn(prisma.subscription, "findFirst").mockResolvedValue({
      id: "sub-6",
      storeId: "store-6",
      status: "trial",
      plan: "monthly",
      currentPeriodStart: new Date("2026-04-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-04-16T00:00:00.000Z"),
      trialEndsAt: new Date("2026-04-16T00:00:00.000Z"),
      mercadoPagoPreapprovalId: "mp-preapproval-3",
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    } as any);

    const updateSpy = vi.spyOn(prisma.subscription, "update");

    const result = await markSubscriptionFromWebhook({
      preapprovalId: "mp-preapproval-3",
      status: "pending",
      source: "webhook",
    });

    expect(updateSpy).not.toHaveBeenCalled();
    expect(result?.status).toBe("trial");
  });

  it("upgrades trial to active when webhook reports authorized", async () => {
    const now = new Date("2026-04-01T12:00:00.000Z");

    vi.spyOn(prisma.subscription, "findFirst").mockResolvedValue({
      id: "sub-7",
      storeId: "store-7",
      status: "trial",
      plan: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: new Date("2026-04-16T00:00:00.000Z"),
      trialEndsAt: new Date("2026-04-16T00:00:00.000Z"),
      mercadoPagoPreapprovalId: "mp-preapproval-4",
      createdAt: now,
      updatedAt: now,
    } as any);

    const updateSpy = vi
      .spyOn(prisma.subscription, "update")
      .mockResolvedValue({
        id: "sub-7",
        storeId: "store-7",
        status: "active",
        plan: "monthly",
        currentPeriodStart: now,
        currentPeriodEnd: new Date("2026-05-01T12:00:00.000Z"),
        trialEndsAt: null,
        mercadoPagoPreapprovalId: "mp-preapproval-4",
        createdAt: now,
        updatedAt: now,
      } as any);

    const result = await markSubscriptionFromWebhook({
      preapprovalId: "mp-preapproval-4",
      status: "authorized",
      plan: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: new Date("2026-05-01T12:00:00.000Z"),
      source: "webhook",
    });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(result?.status).toBe("active");
  });

  it("cancels subscription when webhook reports canceled (US)", async () => {
    const now = new Date("2026-04-01T12:00:00.000Z");

    vi.spyOn(prisma.subscription, "findFirst").mockResolvedValue({
      id: "sub-8",
      storeId: "store-8",
      status: "active",
      plan: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: new Date("2026-05-01T12:00:00.000Z"),
      trialEndsAt: null,
      mercadoPagoPreapprovalId: "mp-preapproval-5",
      createdAt: now,
      updatedAt: now,
    } as any);

    const updateSpy = vi
      .spyOn(prisma.subscription, "update")
      .mockResolvedValue({
        id: "sub-8",
        storeId: "store-8",
        status: "canceled",
        plan: "monthly",
        currentPeriodStart: now,
        currentPeriodEnd: new Date("2026-05-01T12:00:00.000Z"),
        trialEndsAt: null,
        mercadoPagoPreapprovalId: "mp-preapproval-5",
        createdAt: now,
        updatedAt: now,
      } as any);

    const result = await markSubscriptionFromWebhook({
      preapprovalId: "mp-preapproval-5",
      status: "canceled",
      source: "webhook",
    });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(result?.status).toBe("canceled");
  });
});
