import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appError: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit-service", () => ({
  recordAuditEvent: vi.fn().mockResolvedValue({}),
}));

import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit-service";
import {
  queryErrors,
  getErrorStats,
  markResolved,
} from "@/lib/super-admin/errors-service";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("queryErrors", () => {
  it("returns paginated items", async () => {
    vi.mocked(prisma.appError.findMany).mockResolvedValue([{ id: "e-1" }] as any);
    vi.mocked(prisma.appError.count).mockResolvedValue(1);

    const result = await queryErrors({ page: 1, limit: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("clamps page and limit", async () => {
    vi.mocked(prisma.appError.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.appError.count).mockResolvedValue(0);

    await queryErrors({ page: -5, limit: 99999 });
    const args = vi.mocked(prisma.appError.findMany).mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(100);
  });

  it("translates filters into where clause (resolved: true)", async () => {
    vi.mocked(prisma.appError.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.appError.count).mockResolvedValue(0);

    await queryErrors({ source: "PRISMA", severity: "CRITICAL", resolved: true });
    const where = vi.mocked(prisma.appError.findMany).mock.calls[0][0].where;
    expect(where.source).toBe("PRISMA");
    expect(where.severity).toBe("CRITICAL");
    expect(where.resolvedAt).toEqual({ not: null });
  });

  it("translates filters into where clause (resolved: false)", async () => {
    vi.mocked(prisma.appError.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.appError.count).mockResolvedValue(0);

    await queryErrors({ resolved: false });
    const where = vi.mocked(prisma.appError.findMany).mock.calls[0][0].where;
    expect(where.resolvedAt).toBeNull();
  });
});

describe("getErrorStats", () => {
  it("aggregates totals, severity, source and top fingerprints", async () => {
    vi.mocked(prisma.appError.count)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(40);
    vi.mocked(prisma.appError.groupBy)
      .mockResolvedValueOnce([
        { severity: "ERROR", _count: { _all: 70 } },
        { severity: "CRITICAL", _count: { _all: 30 } },
      ] as any)
      .mockResolvedValueOnce([
        { source: "API", _count: { _all: 50 } },
        { source: "PRISMA", _count: { _all: 50 } },
      ] as any);
    vi.mocked(prisma.appError.findMany).mockResolvedValue([
      { fingerprint: "fp-1", occurrences: 25, message: "top message" },
    ] as any);

    const result = await getErrorStats();
    expect(result.totalErrors).toBe(100);
    expect(result.unresolvedCount).toBe(40);
    expect(result.resolvedCount).toBe(60);
    expect(result.bySeverity.ERROR).toBe(70);
    expect(result.bySource.API).toBe(50);
    expect(result.topFingerprints).toHaveLength(1);
  });
});

describe("markResolved", () => {
  it("sets resolvedAt and emits audit", async () => {
    vi.mocked(prisma.appError.update).mockResolvedValue({ id: "e-1" } as any);

    await markResolved({ id: "e-1", adminUserId: "sa-1", notes: "fixed in 0.4.2" });

    expect(prisma.appError.update).toHaveBeenCalledOnce();
    const args = prisma.appError.update.mock.calls[0][0];
    expect(args.where.id).toBe("e-1");
    expect(args.data.resolvedByUserId).toBe("sa-1");
    expect(args.data.metadata).toEqual({ resolution_notes: "fixed in 0.4.2" });

    expect(recordAuditEvent).toHaveBeenCalledOnce();
    const arg = vi.mocked(recordAuditEvent).mock.calls[0][0];
    expect(arg.action).toBe("app_error.resolve");
    expect(arg.actorType).toBe("SUPER_ADMIN");
  });

  it("handles missing notes", async () => {
    vi.mocked(prisma.appError.update).mockResolvedValue({ id: "e-1" } as any);

    await markResolved({ id: "e-1", adminUserId: "sa-1" });
    const args = prisma.appError.update.mock.calls[0][0];
    expect(args.data.metadata).toBeUndefined();
  });
});
