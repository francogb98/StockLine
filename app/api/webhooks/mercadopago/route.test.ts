import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import * as mercadopago from "@/lib/mercadopago";
import * as subscriptionService from "@/lib/subscription-service";

vi.mock("@/lib/subscription-service", () => ({
  mapMercadoPagoStatusToSubscriptionStatus: vi.fn().mockReturnValue("active"),
  markSubscriptionFromWebhook: vi.fn().mockResolvedValue(undefined),
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
    const res = await POST(req);
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
    const res = await POST(req);
    const data = await res.json();
    expect(data.ignored).toBe(true);
  });
});
