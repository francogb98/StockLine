import { describe, expect, it, vi, afterEach } from "vitest";
import * as apiAuth from "@/lib/api-auth";
import * as companiesService from "@/lib/super-admin/companies-service";

import { GET as listRoute } from "@/app/api/super-admin/companies/route";
import { GET as detailRoute } from "@/app/api/super-admin/companies/[id]/route";
import { POST as suspendRoute } from "@/app/api/super-admin/companies/[id]/suspend/route";
import { POST as unsuspendRoute } from "@/app/api/super-admin/companies/[id]/unsuspend/route";

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

function rejected(status: number) {
  vi.spyOn(apiAuth, "requireSuperAdmin").mockResolvedValue({
    response: new Response(JSON.stringify({ error: "nope" }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  });
}

describe("GET /api/super-admin/companies (list)", () => {
  it("returns 200 with paginated list", async () => {
    authed();
    const listSpy = vi
      .spyOn(companiesService, "listCompanies")
      .mockResolvedValue({
        items: [{ id: "store-1" } as any],
        total: 1,
        page: 1,
        limit: 25,
      });

    const req = new Request("http://localhost/api/super-admin/companies?q=foo");
    const response = await listRoute(req as any);
    if (!response) throw new Error("expected response");

    expect(response.status).toBe(200);
    expect(listSpy).toHaveBeenCalledOnce();
    const args = listSpy.mock.calls[0][0];
    expect(args.q).toBe("foo");
  });

  it("returns 403 when not SA", async () => {
    rejected(403);
    const req = new Request("http://localhost/api/super-admin/companies");
    const response = await listRoute(req as any);
    expect(response?.status).toBe(403);
  });
});

describe("GET /api/super-admin/companies/[id] (detail)", () => {
  it("returns 404 when not found", async () => {
    authed();
    vi.spyOn(companiesService, "getCompanyDetail").mockResolvedValue(null);

    const req = new Request("http://localhost/api/super-admin/companies/nope");
    const response = await detailRoute(req as any, { params: Promise.resolve({ id: "nope" }) });
    expect(response?.status).toBe(404);
  });

  it("returns 200 with detail", async () => {
    authed();
    vi.spyOn(companiesService, "getCompanyDetail").mockResolvedValue({
      id: "store-1",
    } as any);

    const req = new Request("http://localhost/api/super-admin/companies/store-1");
    const response = await detailRoute(req as any, { params: Promise.resolve({ id: "store-1" }) });
    expect(response?.status).toBe(200);
  });
});

describe("POST /api/super-admin/companies/[id]/suspend", () => {
  it("rejects invalid reason with 400", async () => {
    authed();
    const suspendSpy = vi
      .spyOn(companiesService, "suspendCompany")
      .mockResolvedValue(undefined);

    const req = new Request("http://localhost/api/super-admin/companies/x/suspend", {
      method: "POST",
      body: JSON.stringify({ reason: "BAD_REASON" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await suspendRoute(req as any, {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response?.status).toBe(400);
    expect(suspendSpy).not.toHaveBeenCalled();
  });

  it("calls suspendCompany with valid reason", async () => {
    authed();
    const suspendSpy = vi
      .spyOn(companiesService, "suspendCompany")
      .mockResolvedValue(undefined);

    const req = new Request("http://localhost/api/super-admin/companies/x/suspend", {
      method: "POST",
      body: JSON.stringify({ reason: "POLICY_VIOLATION", notes: "test" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await suspendRoute(req as any, {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response?.status).toBe(200);
    expect(suspendSpy).toHaveBeenCalledOnce();
    const arg = suspendSpy.mock.calls[0][0];
    expect(arg.reason).toBe("POLICY_VIOLATION");
    expect(arg.id).toBe("x");
    expect(arg.adminUserId).toBe("user-sa-1");
  });

  it("returns 400 on invalid JSON body", async () => {
    authed();
    const req = new Request("http://localhost/api/super-admin/companies/x/suspend", {
      method: "POST",
      body: "not-json",
    });
    const response = await suspendRoute(req as any, {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response?.status).toBe(400);
  });
});

describe("POST /api/super-admin/companies/[id]/unsuspend", () => {
  it("calls unsuspendCompany", async () => {
    authed();
    const spy = vi
      .spyOn(companiesService, "unsuspendCompany")
      .mockResolvedValue(undefined);

    const req = new Request("http://localhost/api/super-admin/companies/x/unsuspend", {
      method: "POST",
      body: JSON.stringify({ notes: "all good" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await unsuspendRoute(req as any, {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response?.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce();
    const arg = spy.mock.calls[0][0];
    expect(arg.id).toBe("x");
    expect(arg.notes).toBe("all good");
  });

  it("accepts empty body", async () => {
    authed();
    const spy = vi
      .spyOn(companiesService, "unsuspendCompany")
      .mockResolvedValue(undefined);

    const req = new Request("http://localhost/api/super-admin/companies/x/unsuspend", {
      method: "POST",
    });
    const response = await unsuspendRoute(req as any, {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response?.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce();
  });
});
