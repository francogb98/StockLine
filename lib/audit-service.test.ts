import { afterEach, describe, expect, it, vi } from "vitest";
import { recordAuditEvent, queryAudit, getCompanyTimeline } from "@/lib/audit-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("recordAuditEvent", () => {
  it("writes an audit log via prisma.auditLog.create with normalized nullable fields", async () => {
    const mockCreate = vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "al-1" } as any);

    await recordAuditEvent({
      actorType: "STORE_USER",
      action: "user.login",
      actorUserId: undefined,
      storeId: undefined,
      targetType: undefined,
      targetId: undefined,
      metadata: undefined,
      ipAddress: undefined,
      userAgent: undefined,
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.actorType).toBe("STORE_USER");
    expect(data.action).toBe("user.login");
    expect(data.actorUserId).toBeNull();
    expect(data.storeId).toBeNull();
    expect(data.targetType).toBeNull();
    expect(data.targetId).toBeNull();
    expect(data.metadata).toBeNull();
    expect(data.ipAddress).toBeNull();
    expect(data.userAgent).toBeNull();
  });

  it("passes through provided optional fields without overriding", async () => {
    const mockCreate = vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "al-2" } as any);

    await recordAuditEvent({
      actorType: "WEBHOOK",
      action: "subscription.synced",
      storeId: "store-1",
      actorUserId: null,
      targetType: "Subscription",
      targetId: "sub-1",
      metadata: { rawMpStatus: "authorized" },
      ipAddress: "127.0.0.1",
      userAgent: "MP-Callback/1",
    });

    const data = mockCreate.mock.calls[0][0].data;
    expect(data.storeId).toBe("store-1");
    expect(data.targetType).toBe("Subscription");
    expect(data.targetId).toBe("sub-1");
    expect(data.metadata).toEqual({ rawMpStatus: "authorized" });
    expect(data.ipAddress).toBe("127.0.0.1");
    expect(data.userAgent).toBe("MP-Callback/1");
  });
});

describe("queryAudit", () => {
  it("returns paginated items with total/page/limit", async () => {
    const items = [{ id: "al-1" }, { id: "al-2" }];
    const findMany = vi.mocked(prisma.auditLog.findMany).mockResolvedValue(items as any);
    const count = vi.mocked(prisma.auditLog.count).mockResolvedValue(7);

    const result = await queryAudit({ page: 2, limit: 2 });

    expect(findMany).toHaveBeenCalledOnce();
    const opts = findMany.mock.calls[0][0];
    expect(opts.skip).toBe(2);
    expect(opts.take).toBe(2);
    expect(opts.orderBy).toEqual({ createdAt: "desc" });
    expect(count).toHaveBeenCalledOnce();
    expect(result.items).toBe(items);
    expect(result.total).toBe(7);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(2);
  });

  it("clamps limit to max 100 and min 1, page to min 1", async () => {
    const findMany = vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any);
    const count = vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

    await queryAudit({ page: -10, limit: 9999 });
    const opts = findMany.mock.calls[0][0];
    expect(opts.skip).toBe(0);
    expect(opts.take).toBe(100);
  });

  it("translates filter args into a where clause", async () => {
    const findMany = vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-01-31T23:59:59Z");

    await queryAudit({
      actorType: "STORE_USER",
      action: "user.login",
      storeId: "store-1",
      actorUserId: "user-1",
      from,
      to,
    });

    const where = findMany.mock.calls[0][0].where;
    expect(where.actorType).toBe("STORE_USER");
    expect(where.action).toBe("user.login");
    expect(where.storeId).toBe("store-1");
    expect(where.actorUserId).toBe("user-1");
    expect(where.createdAt).toEqual({ gte: from, lte: to });
  });
});

describe("getCompanyTimeline", () => {
  it("scopes by storeId and orders by createdAt desc with limit", async () => {
    const findMany = vi.mocked(prisma.auditLog.findMany).mockResolvedValue([{ id: "al-1" }] as any);

    await getCompanyTimeline({ storeId: "store-1" });
    const opts = findMany.mock.calls[0][0];
    expect(opts.where).toEqual({ storeId: "store-1" });
    expect(opts.orderBy).toEqual({ createdAt: "desc" });
    expect(opts.take).toBe(200);
  });
});
