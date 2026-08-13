import { describe, expect, it, vi, afterEach } from "vitest";
import { GET } from "./route";
import * as apiAuth from "@/lib/api-auth";
import * as dashboardService from "@/lib/super-admin/dashboard-service";

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
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

describe("GET /api/super-admin/dashboard/metrics", () => {
  it("returns 200 with bundle (defaults to 30 days)", async () => {
    authed();
    const bundleSpy = vi
      .spyOn(dashboardService, "getDashboardBundle")
      .mockResolvedValue({
        metrics: {} as any,
        signupsTimeseries: [],
        churnTimeseries: [],
        days: 30,
      });

    const req = new Request("http://localhost/api/super-admin/dashboard/metrics");
    const response = await GET(req as any);
    if (!response) throw new Error("expected response");

    expect(response.status).toBe(200);
    expect(bundleSpy).toHaveBeenCalledWith(30);
  });

  it("clamps days between 7 and 365", async () => {
    authed();
    const bundleSpy = vi
      .spyOn(dashboardService, "getDashboardBundle")
      .mockResolvedValue({ metrics: {} as any, signupsTimeseries: [], churnTimeseries: [], days: 7 });

    const req1 = new Request("http://localhost/api/super-admin/dashboard/metrics?days=2");
    await GET(req1 as any);
    expect(bundleSpy).toHaveBeenLastCalledWith(7);

    const req2 = new Request("http://localhost/api/super-admin/dashboard/metrics?days=999");
    await GET(req2 as any);
    expect(bundleSpy).toHaveBeenLastCalledWith(365);
  });

  it("falls back to 30 when days is invalid", async () => {
    authed();
    const bundleSpy = vi
      .spyOn(dashboardService, "getDashboardBundle")
      .mockResolvedValue({ metrics: {} as any, signupsTimeseries: [], churnTimeseries: [], days: 30 });

    const req = new Request("http://localhost/api/super-admin/dashboard/metrics?days=foo");
    await GET(req as any);
    expect(bundleSpy).toHaveBeenCalledWith(30);
  });

  it("returns 403 when session is not SA", async () => {
    vi.spyOn(apiAuth, "requireSuperAdmin").mockResolvedValue({
      response: new Response(JSON.stringify({ error: "Acceso restringido a Super Admin" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    });

    const req = new Request("http://localhost/api/super-admin/dashboard/metrics");
    const response = await GET(req as any);
    expect(response?.status).toBe(403);
  });

  it("returns 500 if the service throws", async () => {
    authed();
    vi.spyOn(dashboardService, "getDashboardBundle").mockRejectedValue(new Error("boom"));

    const req = new Request("http://localhost/api/super-admin/dashboard/metrics");
    const response = await GET(req as any);
    expect(response?.status).toBe(500);
  });
});
