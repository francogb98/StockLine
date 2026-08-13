import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import { queryAudit } from "@/lib/audit-service";
import type { AuditActorType } from "@/lib/types";

const VALID_ACTOR_TYPES: ReadonlySet<AuditActorType> = new Set([
  "SUPER_ADMIN",
  "STORE_USER",
  "SYSTEM",
  "WEBHOOK",
]);

function parseActorType(raw: string | null): AuditActorType | undefined {
  if (!raw) return undefined;
  return VALID_ACTOR_TYPES.has(raw as AuditActorType)
    ? (raw as AuditActorType)
    : undefined;
}

function parseDate(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d;
}

function parseInt32(raw: string | null, fallback: number) {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const actorType = parseActorType(url.searchParams.get("actorType"));
  const action = url.searchParams.get("action") ?? undefined;
  const storeId = url.searchParams.get("storeId") ?? undefined;
  const actorUserId = url.searchParams.get("actorUserId") ?? undefined;
  const from = parseDate(url.searchParams.get("from"));
  const to = parseDate(url.searchParams.get("to"));
  const page = parseInt32(url.searchParams.get("page"), 1);
  const limit = parseInt32(url.searchParams.get("limit"), 50);

  const result = await queryAudit({
    actorType,
    action,
    storeId,
    actorUserId,
    from,
    to,
    page,
    limit,
  });

  return jsonResponse(result, 200);
}
