import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit-service";
import type { AppErrorSource, AppErrorSeverity } from "@/lib/types";

export interface ErrorsFilters {
  source?: AppErrorSource;
  severity?: AppErrorSeverity;
  storeId?: string;
  resolved?: boolean;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface ErrorListItem {
  id: string;
  source: AppErrorSource;
  severity: AppErrorSeverity;
  statusCode: number | null;
  method: string | null;
  path: string | null;
  message: string;
  stack: string | null;
  fingerprint: string;
  occurrences: number;
  lastSeenAt: Date;
  firstSeenAt: Date;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  storeId: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ErrorsListResult {
  items: ErrorListItem[];
  total: number;
  page: number;
  limit: number;
}

const DEFAULT_LIMIT = 25;

export async function queryErrors(filters: ErrorsFilters): Promise<ErrorsListResult> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit ?? DEFAULT_LIMIT)));

  const where: Record<string, unknown> = {};
  if (filters.source) where.source = filters.source;
  if (filters.severity) where.severity = filters.severity;
  if (filters.storeId) where.storeId = filters.storeId;
  if (typeof filters.resolved === "boolean") {
    where.resolvedAt = filters.resolved ? { not: null } : null;
  }
  if (filters.from || filters.to) {
    where.lastSeenAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  const [items, total] = await Promise.all([
    prisma.appError.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.appError.count({ where }),
  ]);

  return {
    items: items as unknown as ErrorListItem[],
    total,
    page,
    limit,
  };
}

export interface ErrorStats {
  totalErrors: number;
  unresolvedCount: number;
  resolvedCount: number;
  bySeverity: Record<string, number>;
  bySource: Record<string, number>;
  topFingerprints: Array<{ fingerprint: string; occurrences: number; message: string }>;
}

export async function getErrorStats(): Promise<ErrorStats> {
  const [totalErrors, unresolved, bySeverity, bySource, topFingerprints] = await Promise.all([
    prisma.appError.count(),
    prisma.appError.count({ where: { resolvedAt: null } }),
    prisma.appError.groupBy({
      by: ["severity"],
      _count: { _all: true },
    }),
    prisma.appError.groupBy({
      by: ["source"],
      _count: { _all: true },
    }),
    prisma.appError.findMany({
      where: { resolvedAt: null },
      orderBy: { occurrences: "desc" },
      take: 5,
      select: { fingerprint: true, occurrences: true, message: true },
    }),
  ]);

  return {
    totalErrors,
    unresolvedCount: unresolved,
    resolvedCount: totalErrors - unresolved,
    bySeverity: Object.fromEntries(bySeverity.map((r) => [r.severity, r._count._all])),
    bySource: Object.fromEntries(bySource.map((r) => [r.source, r._count._all])),
    topFingerprints,
  };
}

export async function markResolved(input: { id: string; adminUserId: string; notes?: string }) {
  const updated = await prisma.appError.update({
    where: { id: input.id },
    data: {
      resolvedAt: new Date(),
      resolvedByUserId: input.adminUserId,
      metadata: input.notes ? ({ resolution_notes: input.notes } as any) : undefined,
    },
  });

  await recordAuditEvent({
    actorType: "SUPER_ADMIN",
    actorUserId: input.adminUserId,
    action: "app_error.resolve",
    targetType: "AppError",
    targetId: input.id,
    metadata: { notes: input.notes ?? null },
  });

  return updated;
}
