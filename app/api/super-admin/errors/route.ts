import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  queryErrors,
  getErrorStats,
  type ErrorsFilters,
} from "@/lib/super-admin/errors-service";
import type { AppErrorSource, AppErrorSeverity } from "@/lib/types";

const VALID_SOURCES: ReadonlySet<AppErrorSource> = new Set([
  "API",
  "PRISMA",
  "MERCADO_PAGO",
  "WEBHOOK",
  "POS",
  "UNKNOWN",
]);

const VALID_SEVERITIES: ReadonlySet<AppErrorSeverity> = new Set([
  "INFO",
  "WARNING",
  "ERROR",
  "CRITICAL",
]);

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if ("response" in auth) return auth.response;

    const url = new URL(req.url);
    const filters: ErrorsFilters = {};

    const source = url.searchParams.get("source");
    if (source && VALID_SOURCES.has(source as AppErrorSource)) {
      filters.source = source as AppErrorSource;
    }

    const severity = url.searchParams.get("severity");
    if (severity && VALID_SEVERITIES.has(severity as AppErrorSeverity)) {
      filters.severity = severity as AppErrorSeverity;
    }

    const storeId = url.searchParams.get("storeId");
    if (storeId) filters.storeId = storeId;

    const resolvedRaw = url.searchParams.get("resolved");
    if (resolvedRaw === "true") filters.resolved = true;
    if (resolvedRaw === "false") filters.resolved = false;

    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (from) {
      const d = new Date(from);
      if (!isNaN(d.getTime())) filters.from = d;
    }
    if (to) {
      const d = new Date(to);
      if (!isNaN(d.getTime())) filters.to = d;
    }

    const pageRaw = url.searchParams.get("page");
    const limitRaw = url.searchParams.get("limit");
    if (pageRaw && Number.isFinite(Number.parseInt(pageRaw, 10))) {
      filters.page = Number.parseInt(pageRaw, 10);
    }
    if (limitRaw && Number.isFinite(Number.parseInt(limitRaw, 10))) {
      filters.limit = Number.parseInt(limitRaw, 10);
    }

    const [result, stats] = await Promise.all([queryErrors(filters), getErrorStats()]);
    return jsonResponse({ ...result, stats }, 200);
  } catch (error) {
    console.error("GET /api/super-admin/errors", error);
    return errorResponse("Error interno del servidor", 500);
  }
}
