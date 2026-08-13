import { describe, expect, it, vi, afterEach } from "vitest";
import { GET } from "./route";
import * as apiAuth from "@/lib/api-auth";
import * as auditService from "@/lib/audit-service";

afterEach(() => {
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

function authRejected(status: number) {
  vi.spyOn(apiAuth, "requireSuperAdmin").mockResolvedValue({
    response: new Response(JSON.stringify({ error: "nope" }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  });
}

describe("GET /api/super-admin/audit", () => {
  it("returns 200 with paginated items + total", async () => {
    authed();
    const querySpy = vi
      .spyOn(auditService, "queryAudit")
      .mockResolvedValue({
        items: [
          { id: "al-1", action: "user.login" },
          { id: "al-2", action: "user.logout" },
        ] as any,
        total: 2,
        page: 1,
        limit: 50,
      });

    const req = new Request("http://localhost/api/super-admin/audit");
    const response = await GET(req as any);
    if (!response) throw new Error("expected response");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(50);
    expect(body.items).toHaveLength(2);
    expect(querySpy).toHaveBeenCalledOnce();
  });

  it("parses query params into filter args", async () => {
    authed();
    const querySpy = vi.spyOn(auditService, "queryAudit").mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 10,
    });

    const req = new Request(
      "http://localhost/api/super-admin/audit?actorType=STORE_USER&action=user.login&storeId=store-1&actorUserId=user-1&from=2026-01-01T00:00:00Z&to=2026-01-31T23:59:59Z&page=2&limit=10"
    );
    await GET(req as any);

    const args = querySpy.mock.calls[0][0];
    expect(args.actorType).toBe("STORE_USER");
    expect(args.action).toBe("user.login");
    expect(args.storeId).toBe("store-1");
    expect(args.actorUserId).toBe("user-1");
    expect(args.from).toBeInstanceOf(Date);
    expect(args.to).toBeInstanceOf(Date);
    expect(args.page).toBe(2);
    expect(args.limit).toBe(10);
  });

  it("ignores invalid actorType without throwing", async () => {
    authed();
    const querySpy = vi.spyOn(auditService, "queryAudit").mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    const req = new Request(
      "http://localhost/api/super-admin/audit?actorType=GOD_MODE"
    );
    await GET(req as any);

    const args = querySpy.mock.calls[0][0];
    expect(args.actorType).toBeUndefined();
  });

  it("ignores invalid date strings without throwing", async () => {
    authed();
    const querySpy = vi.spyOn(auditService, "queryAudit").mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    const req = new Request(
      "http://localhost/api/super-admin/audit?from=not-a-date"
    );
    await GET(req as any);

    const args = querySpy.mock.calls[0][0];
    expect(args.from).toBeUndefined();
  });

  it("propagates 403 for non-SA sessions", async () => {
    authRejected(403);

    const req = new Request("http://localhost/api/super-admin/audit");
    const response = await GET(req as any);
    if (!response) throw new Error("expected response");

    expect(response.status).toBe(403);
  });

  it("propagates 401 for unauthenticated sessions", async () => {
    authRejected(401);

    const req = new Request("http://localhost/api/super-admin/audit");
    const response = await GET(req as any);
    if (!response) throw new Error("expected response");

    expect(response.status).toBe(401);
  });
});
