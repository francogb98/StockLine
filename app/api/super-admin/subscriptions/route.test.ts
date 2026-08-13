import { describe, expect, it, vi, afterEach } from "vitest";
import * as apiAuth from "@/lib/api-auth";
import * as subsService from "@/lib/super-admin/subscriptions-service";
import { AdminSubscriptionError } from "@/lib/subscription-service";

import { GET as listRoute } from "@/app/api/super-admin/subscriptions/route";
import { GET as detailRoute } from "@/app/api/super-admin/subscriptions/[id]/route";
import { POST as cancelRoute } from "@/app/api/super-admin/subscriptions/[id]/cancel/route";
import { POST as reactivateRoute } from "@/app/api/super-admin/subscriptions/[id]/reactivate/route";
import { POST as extendRoute } from "@/app/api/super-admin/subscriptions/[id]/extend/route";
import { POST as syncRoute } from "@/app/api/super-admin/subscriptions/[id]/sync-with-mp/route";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const saUser = {
  id: "user-sa-1",
  email: "sa@platform.com",
  name: "Super Admin",
  role: "admin",
  storeId: "store-platform-internal",
  isSuperAdmin: true,
};

function authed() {
  vi.spyOn(apiAuth, "requireSuperAdmin").mockResolvedValue({
    auth: { sessionId: "session-sa-1", user: saUser },
  } as any);
}

function postJson(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/super-admin/subscriptions", () => {
  it("returns 200 with paginated list", async () => {
    authed();
    const spy = vi
      .spyOn(subsService, "listSubscriptions")
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 });

    const req = new Request("http://localhost/api/super-admin/subscriptions?status=active");
    const response = await listRoute(req as any);
    if (!response) throw new Error("expected response");

    expect(response.status).toBe(200);
    const args = spy.mock.calls[0][0];
    expect(args.status).toBe("active");
  });

  it("ignores invalid status enum without throwing", async () => {
    authed();
    const spy = vi
      .spyOn(subsService, "listSubscriptions")
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 });

    const req = new Request("http://localhost/api/super-admin/subscriptions?status=GOD_MODE");
    const response = await listRoute(req as any);
    expect(response?.status).toBe(200);
    expect(spy.mock.calls[0][0].status).toBeUndefined();
  });
});

describe("GET /api/super-admin/subscriptions/[id]", () => {
  it("returns 404 when not found", async () => {
    authed();
    vi.spyOn(subsService, "getSubscriptionDetail").mockResolvedValue(null);

    const req = new Request("http://localhost/api/super-admin/subscriptions/missing");
    const response = await detailRoute(req as any, { params: Promise.resolve({ id: "missing" }) });
    expect(response?.status).toBe(404);
  });
});

describe("POST /api/super-admin/subscriptions/[id]/cancel", () => {
  it("calls cancelSubscription with normalized args", async () => {
    authed();
    const spy = vi
      .spyOn(subsService, "cancelSubscription")
      .mockResolvedValue({ id: "sub-1", status: "canceled" } as any);

    const req = postJson("http://localhost/api/super-admin/subscriptions/sub-1/cancel", {
      storeId: "store-1",
      reason: "abuse",
      notes: "n",
    });
    const response = await cancelRoute(req as any, { params: Promise.resolve({ id: "sub-1" }) });
    expect(response?.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce();
    const arg = spy.mock.calls[0][0];
    expect(arg.storeId).toBe("store-1");
    expect(arg.adminUserId).toBe("user-sa-1");
    expect(arg.reason).toBe("abuse");
  });

  it("rejects missing storeId", async () => {
    authed();
    const req = postJson("http://localhost/api/super-admin/subscriptions/sub-1/cancel", {
      reason: "abuse",
    });
    const response = await cancelRoute(req as any, { params: Promise.resolve({ id: "sub-1" }) });
    expect(response?.status).toBe(400);
  });

  it("returns AdminSubscriptionError status when service throws", async () => {
    authed();
    vi.spyOn(subsService, "cancelSubscription").mockRejectedValue(
      new AdminSubscriptionError("La suscripción ya fue cancelada por admin", 409),
    );

    const req = postJson("http://localhost/api/super-admin/subscriptions/sub-1/cancel", {
      storeId: "store-1",
      reason: "abuse",
    });
    const response = await cancelRoute(req as any, { params: Promise.resolve({ id: "sub-1" }) });
    expect(response?.status).toBe(409);
  });
});

describe("POST /api/super-admin/subscriptions/[id]/reactivate", () => {
  it("calls reactivateSubscription", async () => {
    authed();
    const spy = vi
      .spyOn(subsService, "reactivateSubscription")
      .mockResolvedValue({ id: "sub-1", status: "active" } as any);

    const req = postJson("http://localhost/api/super-admin/subscriptions/sub-1/reactivate", {
      storeId: "store-1",
    });
    const response = await reactivateRoute(req as any, { params: Promise.resolve({ id: "sub-1" }) });
    expect(response?.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe("POST /api/super-admin/subscriptions/[id]/extend", () => {
  it("calls extend with validated extraDays", async () => {
    authed();
    const spy = vi
      .spyOn(subsService, "extendSubscription")
      .mockResolvedValue({ id: "sub-1", currentPeriodEnd: new Date() } as any);

    const req = postJson("http://localhost/api/super-admin/subscriptions/sub-1/extend", {
      storeId: "store-1",
      extraDays: 14,
      reason: "goodwill",
    });
    const response = await extendRoute(req as any, { params: Promise.resolve({ id: "sub-1" }) });
    expect(response?.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce();
  });

  it("rejects extraDays out of range", async () => {
    authed();
    const req1 = postJson("http://localhost/api/super-admin/subscriptions/x/extend", {
      storeId: "store-1",
      extraDays: 0,
      reason: "x",
    });
    expect((await extendRoute(req1 as any, { params: Promise.resolve({ id: "x" }) }))?.status).toBe(400);

    const req2 = postJson("http://localhost/api/super-admin/subscriptions/x/extend", {
      storeId: "store-1",
      extraDays: 999,
      reason: "x",
    });
    expect((await extendRoute(req2 as any, { params: Promise.resolve({ id: "x" }) }))?.status).toBe(400);
  });
});

describe("POST /api/super-admin/subscriptions/[id]/sync-with-mp", () => {
  it("calls forceSync", async () => {
    authed();
    const spy = vi.spyOn(subsService, "forceSync").mockResolvedValue({} as any);

    const req = postJson("http://localhost/api/super-admin/subscriptions/sub-1/sync-with-mp", {
      storeId: "store-1",
    });
    const response = await syncRoute(req as any, { params: Promise.resolve({ id: "sub-1" }) });
    expect(response?.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce();
  });
});
