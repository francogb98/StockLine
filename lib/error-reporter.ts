import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { AppErrorSource, AppErrorSeverity } from "@/lib/types";

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

function fingerprint(input: {
  source: AppErrorSource;
  message: string;
  path?: string;
}) {
  return createHash("sha256")
    .update(`${input.source}|${input.message}|${input.path ?? ""}`)
    .digest("hex");
}

export interface ReportErrorInput {
  source: AppErrorSource;
  severity?: AppErrorSeverity;
  message: string;
  stack?: string;
  storeId?: string | null;
  statusCode?: number;
  method?: string;
  path?: string;
  metadata?: Record<string, unknown> | null;
}

export async function reportError(input: ReportErrorInput) {
  const fp = fingerprint(input);
  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS);

  const existing = await prisma.appError.findFirst({
    where: { fingerprint: fp, lastSeenAt: { gt: cutoff } },
  });

  if (existing) {
    return prisma.appError.update({
      where: { id: existing.id },
      data: {
        occurrences: { increment: 1 },
        lastSeenAt: new Date(),
        message: input.message,
        stack: input.stack ?? existing.stack ?? null,
        statusCode: input.statusCode ?? existing.statusCode ?? null,
        method: input.method ?? existing.method ?? null,
        path: input.path ?? existing.path ?? null,
        metadata: input.metadata === undefined
          ? existing.metadata
          : (input.metadata as any) ?? null,
      },
    });
  }

  return prisma.appError.create({
    data: {
      source: input.source,
      severity: input.severity ?? "ERROR",
      message: input.message,
      stack: input.stack ?? null,
      storeId: input.storeId ?? null,
      statusCode: input.statusCode ?? null,
      method: input.method ?? null,
      path: input.path ?? null,
      metadata: input.metadata === undefined ? null : (input.metadata as any) ?? null,
      fingerprint: fp,
    },
  });
}
