import { describe, expect, it, vi, afterEach } from "vitest";
import * as apiAuth from "@/lib/api-auth";
import * as errorsService from "@/lib/super-admin/errors-service";

import { GET as listRoute } from "@/app/api/super-admin/errors/route";
import { POST as resolveRoute } from "@/app/api/super-admin/errors/[id]/resolve/route";

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

describe("GET /api/super-admin/errors", () => {
  it("returns paginated items plus stats", async () => {
    authed();
    const querySpy = vi
      .spyOn(errorsService, "queryErrors")
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 });
    const statsSpy = vi.spyOn(errorsService, "getErrorStats").mockResolvedValue({
      totalErrors: 0,
      unresolvedCount: 0,
      resolvedCount: 0,
      bySeverity: {},
      bySource: {},
      topFingerprints: [],
    });

    const req = new Request("http://localhost/api/super-admin/errors?severity=CRITICAL&resolved=false");
    const response = await listRoute(req as any);
    if (!response) throw new Error("expected response");

    expect(response.status).toBe(200);
    expect(querySpy).toHaveBeenCalledOnce();
    const args = querySpy.mock.calls[0][0];
    expect(args.severity).toBe("CRITICAL");
    expect(args.resolved).toBe(false);
    expect(statsSpy).toHaveBeenCalledOnce();
  });

  it("ignores invalid source enums without throwing", async () => {
    authed();
    const querySpy = vi
      .spyOn(errorsService, "queryErrors")
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 });
    vi.spyOn(errorsService, "getErrorStats").mockResolvedValue({
      totalErrors: 0,
      unresolvedCount: 0,
      resolvedCount: 0,
      bySeverity: {},
      bySource: {},
      topFingerprints: [],
    });

    const req = new Request("http://localhost/api/super-admin/errors?source=GARBAGE");
    await listRoute(req as any);
    expect(querySpy.mock.calls[0][0].source).toBeUndefined();
  });
});

describe("POST /api/super-admin/errors/[id]/resolve", () => {
  it("calls markResolved with adminUserId", async () => {
    authed();
    const spy = vi.spyOn(errorsService, "markResolved").mockResolvedValue({ id: "e-1" } as any);

    const req = new Request("http://localhost/api/super-admin/errors/e-1/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "fixed" }),
    });
    const response = await resolveRoute(req as any, { params: Promise.resolve({ id: "e-1" }) });
    expect(response?.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce();
    const arg = spy.mock.calls[0][0];
    expect(arg.id).toBe("e-1");
    expect(arg.adminUserId).toBe("user-sa-1");
    expect(arg.notes).toBe("fixed");
  });

  it("returns 404 when record not found", async () => {
    authed();
    const err = new Error("Record to update not found in AppError");
    vi.spyOn(errorsService, "markResolved").mockRejectedValue(err);

    const req = new Request("http://localhost/api/super-admin/errors/missing/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const response = await resolveRoute(req as any, {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response?.status).toBe(404);
  });
});
