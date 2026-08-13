import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/api-auth";
import { listCompanies, type CompaniesFilters } from "@/lib/super-admin/companies-service";

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const filters: CompaniesFilters = {
    q: url.searchParams.get("q") ?? undefined,
    plan: url.searchParams.get("plan") ?? undefined,
    subscriptionStatus: url.searchParams.get("subscriptionStatus") ?? undefined,
    suspended: (url.searchParams.get("suspended") ?? undefined) as
      | "true"
      | "false"
      | undefined,
  };

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

  const result = await listCompanies(filters);
  return jsonResponse(result, 200);
}
