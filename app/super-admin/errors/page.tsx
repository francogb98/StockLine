import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  queryErrors,
  getErrorStats,
  type ErrorsFilters,
} from "@/lib/super-admin/errors-service";
import type { AppErrorSource, AppErrorSeverity } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ResolveErrorButton } from "@/components/super-admin/resolve-error-button";

interface PageProps {
  searchParams: Promise<{
    source?: string;
    severity?: string;
    resolved?: string;
    page?: string;
  }>;
}

const SOURCE_OPTIONS = ["ALL", "API", "PRISMA", "MERCADO_PAGO", "WEBHOOK", "POS", "UNKNOWN"];
const SEVERITY_OPTIONS = ["ALL", "INFO", "WARNING", "ERROR", "CRITICAL"];

export default async function ErrorsPage(props: PageProps) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) {
    redirect("/login");
  }
  const params = await props.searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const filters: ErrorsFilters = {
    page,
    limit: 25,
  };
  if (params.source && params.source !== "ALL") filters.source = params.source as AppErrorSource;
  if (params.severity && params.severity !== "ALL") filters.severity = params.severity as AppErrorSeverity;
  if (params.resolved === "true") filters.resolved = true;
  if (params.resolved === "false") filters.resolved = false;

  const [result, stats] = await Promise.all([queryErrors(filters), getErrorStats()]);

  const totalPages = Math.max(1, Math.ceil(result.total / 25));

  function severityVariant(s: string): "default" | "destructive" | "secondary" | "outline" {
    if (s === "CRITICAL") return "destructive";
    if (s === "ERROR") return "destructive";
    if (s === "WARNING") return "secondary";
    return "outline";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monitoreo de Errores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.totalErrors} errores totales · {stats.unresolvedCount} sin resolver.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">CRITICAL</p>
          <p className="mt-1 text-2xl font-bold">{stats.bySeverity.CRITICAL ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">ERROR</p>
          <p className="mt-1 text-2xl font-bold">{stats.bySeverity.ERROR ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">WARNING</p>
          <p className="mt-1 text-2xl font-bold">{stats.bySeverity.WARNING ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">INFO</p>
          <p className="mt-1 text-2xl font-bold">{stats.bySeverity.INFO ?? 0}</p>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Source</label>
          <select name="source" defaultValue={params.source ?? "ALL"} className="h-9 rounded-md border bg-background px-3 text-sm">
            {SOURCE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Severity</label>
          <select name="severity" defaultValue={params.severity ?? "ALL"} className="h-9 rounded-md border bg-background px-3 text-sm">
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Resolución</label>
          <select name="resolved" defaultValue={params.resolved ?? ""} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Todos</option>
            <option value="true">Resueltos</option>
            <option value="false">Sin resolver</option>
          </select>
        </div>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Última vez</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Severity</th>
              <th className="px-3 py-2 font-medium">Message</th>
              <th className="px-3 py-2 font-medium">Occ.</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Sin errores registrados.
                </td>
              </tr>
            )}
            {result.items.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2 text-xs font-mono">{e.lastSeenAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                <td className="px-3 py-2 text-xs">{e.source}</td>
                <td className="px-3 py-2 text-xs">
                  <Badge variant={severityVariant(e.severity)}>{e.severity}</Badge>
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className="line-clamp-1">{e.message}</span>
                  <code className="block text-[10px] text-muted-foreground">{e.fingerprint.slice(0, 16)}...</code>
                </td>
                <td className="px-3 py-2 text-xs text-center">{e.occurrences}</td>
                <td className="px-3 py-2 text-xs">
                  {e.resolvedAt ? (
                    <Badge variant="default">Resuelto</Badge>
                  ) : (
                    <Badge variant="outline">Pendiente</Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {e.resolvedAt ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <ResolveErrorButton id={e.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Página {result.page} de {totalPages}</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`?${new URLSearchParams({ ...params, page: String(page - 1) } as any).toString()}`}
              className="text-primary underline"
            >
              ← Anterior
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={`?${new URLSearchParams({ ...params, page: String(page + 1) } as any).toString()}`}
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
