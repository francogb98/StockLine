import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import { listSubscriptions, type SubscriptionsFilters } from "@/lib/super-admin/subscriptions-service";

const VALID_PLANS = new Set(["monthly", "annual"]);
const VALID_STATUSES = new Set(["trial", "active", "past_due", "canceled"]);

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const filters: SubscriptionsFilters = {};

  const plan = url.searchParams.get("plan");
  if (plan && VALID_PLANS.has(plan as any)) {
    filters.plan = plan as "monthly" | "annual";
  }

  const status = url.searchParams.get("status");
  if (status && VALID_STATUSES.has(status as any)) {
    filters.status = status as "trial" | "active" | "past_due" | "canceled";
  }

  const storeId = url.searchParams.get("storeId");
  if (storeId) filters.storeId = storeId;

  const cancelled = url.searchParams.get("cancelledByAdmin");
  if (cancelled === "true") filters.cancelledByAdmin = true;
  if (cancelled === "false") filters.cancelledByAdmin = false;

  const pageRaw = url.searchParams.get("page");
  const limitRaw = url.searchParams.get("limit");
  if (pageRaw && Number.isFinite(Number.parseInt(pageRaw, 10))) {
    filters.page = Number.parseInt(pageRaw, 10);
  }
  if (limitRaw && Number.isFinite(Number.parseInt(limitRaw, 10))) {
    filters.limit = Number.parseInt(limitRaw, 10);
  }

  const result = await listSubscriptions(filters);
  return jsonResponse(result, 200);
}
