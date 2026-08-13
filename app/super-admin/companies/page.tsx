import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/api-auth";
import { listCompanies } from "@/lib/super-admin/companies-service";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    plan?: string;
    subscriptionStatus?: string;
    suspended?: string;
    page?: string;
  }>;
}

const PLAN_OPTIONS = [
  { value: "", label: "Todos los planes" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

const SUB_STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "trial", label: "Trial" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "canceled", label: "Canceled" },
];

function buildQueryString(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) usp.set(k, v);
  }
  const out = usp.toString();
  return out ? `?${out}` : "";
}

export default async function CompaniesPage(props: PageProps) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) {
    redirect("/login");
  }

  const params = await props.searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const result = await listCompanies({
    q: params.q,
    plan: params.plan && params.plan !== "" ? params.plan : undefined,
    subscriptionStatus:
      params.subscriptionStatus && params.subscriptionStatus !== ""
        ? params.subscriptionStatus
        : undefined,
    suspended: params.suspended as "true" | "false" | undefined,
    page,
    limit: 25,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / 25));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total} tiendas — búsqueda, filtros y suspensión administrativa.
          </p>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Nombre o dirección"
            className="h-9 w-64 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Plan</label>
          <select
            name="plan"
            defaultValue={params.plan ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {PLAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Estado sub</label>
          <select
            name="subscriptionStatus"
            defaultValue={params.subscriptionStatus ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {SUB_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Suspendidas</label>
          <select
            name="suspended"
            defaultValue={params.suspended ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Todas</option>
            <option value="true">Solo suspendidas</option>
            <option value="false">Solo activas</option>
          </select>
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Empresa</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Sub status</th>
              <th className="px-3 py-2 font-medium">Ventas</th>
              <th className="px-3 py-2 font-medium">Última actividad</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Sin empresas para los filtros aplicados.
                </td>
              </tr>
            )}
            {result.items.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">
                  <Link
                    href={`/super-admin/companies/${c.id}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {c.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{c.address}</div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {c.subscription?.plan ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {c.subscription?.status ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs">{c.totalSales}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {c.lastActivityAt
                    ? new Date(c.lastActivityAt).toISOString().slice(0, 10)
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {c.isSuspended ? (
                    <Badge variant="destructive">Suspendida</Badge>
                  ) : (
                    <Badge variant="outline">Activa</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Página {result.page} de {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={buildQueryString({ ...params, page: String(page - 1) })}
              className="text-primary underline"
            >
              ← Anterior
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={buildQueryString({ ...params, page: String(page + 1) })}
              className="text-primary underline"
            >
              Siguiente →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
