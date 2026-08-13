import { prisma } from "@/lib/prisma";
import type { AuditActorType } from "@/lib/types";

export interface RecordAuditEventInput {
  actorType: AuditActorType;
  actorUserId?: string | null;
  storeId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditEvent(input: RecordAuditEventInput) {
  return prisma.auditLog.create({
    data: {
      actorType: input.actorType,
      actorUserId: input.actorUserId ?? null,
      storeId: input.storeId ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata === undefined ? null : (input.metadata as any) ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export interface AuditFilters {
  actorType?: AuditActorType;
  action?: string;
  storeId?: string;
  actorUserId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface AuditPageResult {
  items: Awaited<ReturnType<typeof prisma.auditLog.findMany>>;
  total: number;
  page: number;
  limit: number;
}

export async function queryAudit(filters: AuditFilters): Promise<AuditPageResult> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit ?? 50)));

  const where: Record<string, unknown> = {};
  if (filters.actorType) where.actorType = filters.actorType;
  if (filters.action) where.action = filters.action;
  if (filters.storeId) where.storeId = filters.storeId;
  if (filters.actorUserId) where.actorUserId = filters.actorUserId;
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, limit };
}

export interface CompanyTimelineFilters {
  storeId: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export async function getCompanyTimeline(filters: CompanyTimelineFilters) {
  const where: Record<string, unknown> = { storeId: filters.storeId };
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 200,
  });
}

export function extractAuditContext(req: Request | { headers: Headers | { get(name: string): string | null } }) {
  const headers = "headers" in req ? req.headers : (req as unknown as { headers: Headers });
  const ipAddress =
    headers.get("x-forwarded-for") ??
    headers.get("x-real-ip") ??
    null;
  const userAgent = headers.get("user-agent") ?? null;
  return { ipAddress, userAgent };
}
