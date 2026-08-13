import { afterEach, describe, expect, it, vi } from "vitest";
import { reportError } from "@/lib/error-reporter";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appError: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("reportError", () => {
  it("creates a new AppError when no recent duplicate exists", async () => {
    vi.mocked(prisma.appError.findFirst).mockResolvedValue(null);
    const created = { id: "ae-1", occurrences: 1 };
    const mockCreate = vi.mocked(prisma.appError.create).mockResolvedValue(created as any);

    const result = await reportError({
      source: "API",
      severity: "ERROR",
      message: "Something broke",
      path: "/api/products",
      method: "GET",
      statusCode: 500,
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.source).toBe("API");
    expect(data.severity).toBe("ERROR");
    expect(data.message).toBe("Something broke");
    expect(data.path).toBe("/api/products");
    expect(data.method).toBe("GET");
    expect(data.statusCode).toBe(500);
    expect(data.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result).toBe(created);
  });

  it("increments occurrences on a duplicate fingerprint seen within 24h", async () => {
    const existing = {
      id: "ae-1",
      fingerprint: "fp-1",
      occurrences: 3,
      stack: "old stack",
      statusCode: 500,
      method: "GET",
      path: "/api/products",
      metadata: null,
    };
    vi.mocked(prisma.appError.findFirst).mockResolvedValue(existing as any);
    const mockUpdate = vi.mocked(prisma.appError.update).mockResolvedValue({ ...existing, occurrences: 4 } as any);

    await reportError({
      source: "API",
      message: "Same error",
      path: "/api/products",
      method: "GET",
      statusCode: 500,
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const args = mockUpdate.mock.calls[0][0];
    expect(args.where.id).toBe("ae-1");
    expect(args.data.occurrences).toEqual({ increment: 1 });
    expect(args.data.message).toBe("Same error");
  });

  it("creates a new error when the fingerprint match is older than 24h", async () => {
    vi.mocked(prisma.appError.findFirst).mockResolvedValue(null);
    const mockCreate = vi.mocked(prisma.appError.create).mockResolvedValue({ id: "ae-2" } as any);

    await reportError({
      source: "PRISMA",
      message: "Connection lost",
    });

    const where = vi.mocked(prisma.appError.findFirst).mock.calls[0][0].where;
    expect(where.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(where.lastSeenAt.gt).toBeInstanceOf(Date);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("defaults severity to ERROR when not provided", async () => {
    vi.mocked(prisma.appError.findFirst).mockResolvedValue(null);
    const mockCreate = vi.mocked(prisma.appError.create).mockResolvedValue({ id: "ae-3" } as any);

    await reportError({
      source: "API",
      message: "Boom",
    });

    const data = mockCreate.mock.calls[0][0].data;
    expect(data.severity).toBe("ERROR");
  });
});
