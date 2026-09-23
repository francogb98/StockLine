import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import * as mercadopago from "@/lib/mercadopago";
import * as subscriptionService from "@/lib/subscription-service";

vi.mock("@/lib/subscription-service", () => ({
  mapMercadoPagoStatusToSubscriptionStatus: vi.fn().mockReturnValue("active"),
  markSubscriptionFromWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findFirst: vi.fn().mockResolvedValue({ storeId: "store-1" }) },
    auditLog: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    webhookEvent: {
      create: vi.fn().mockResolvedValue({ id: "we-1" }),
      update: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.spyOn(mercadopago, "getMercadoPagoPreapproval").mockResolvedValue({
  id: "mp-123", status: "authorized",
  frequencyType: "months",
  dateCreated: new Date("2024-01-01"),
  nextPaymentDate: new Date("2024-02-01"),
});

afterEach(() => { vi.restoreAllMocks(); });

describe("POST /api/webhooks/mercadopago", () => {
  it("process subscription webhook", async () => {
    const req = new Request("http://localhost/api/webhooks/mercadopago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { id: "mp-123" }, type: "subscription_preapproval" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("ignore non-subscription events", async () => {
    const req = new Request("http://localhost/api/webhooks/mercadopago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "payment", data: { id: "pay-123" } }),
    });
    const res = await POST(req as any);
    const data = await res.json();
    expect(data.ignored).toBe(true);
    expect(data.reason).toBe("not-subscription");
  });

  it("ignore unknown event types (default-deny)", async () => {
    const req = new Request("http://localhost/api/webhooks/mercadopago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "merchant_order", data: { id: "mo-123" } }),
    });
    const res = await POST(req as any);
    const data = await res.json();
    expect(data.ignored).toBe(true);
    expect(data.reason).toBe("not-subscription");
  });
});
