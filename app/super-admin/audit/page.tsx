import Link from "next/link";
import { queryAudit } from "@/lib/audit-service";
import { requireSuperAdmin } from "@/lib/api-auth";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{
    actorType?: string;
    action?: string;
    storeId?: string;
    actorUserId?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function AuditPage(props: PageProps) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) {
    redirect("/login");
  }

  const params = await props.searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const fromDate = params.from ? new Date(params.from) : undefined;
  const toDate = params.to ? new Date(params.to) : undefined;

  const validActorTypes = new Set(["SUPER_ADMIN", "STORE_USER", "SYSTEM", "WEBHOOK"]);
  const actorType = params.actorType && validActorTypes.has(params.actorType)
    ? (params.actorType as "SUPER_ADMIN" | "STORE_USER" | "SYSTEM" | "WEBHOOK")
    : undefined;

  const result = await queryAudit({
    actorType,
    action: params.action,
    storeId: params.storeId,
    actorUserId: params.actorUserId,
    from: fromDate && !isNaN(fromDate.getTime()) ? fromDate : undefined,
    to: toDate && !isNaN(toDate.getTime()) ? toDate : undefined,
    page,
    limit: 50,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / 50));

  return (
    <div>
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Eventos sensibles del sistema — FASE 3 (auditoría).
      </p>

      <div className="mt-6 rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Página {result.page} de {totalPages}</span>
          <span className="text-muted-foreground">· {result.total} eventos</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Fecha</th>
                <th className="py-2 pr-4 font-medium">Actor</th>
                <th className="py-2 pr-4 font-medium">Acción</th>
                <th className="py-2 pr-4 font-medium">Target</th>
                <th className="py-2 pr-4 font-medium">Store</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    Sin eventos para los filtros aplicados.
                  </td>
                </tr>
              )}
              {result.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 pr-4 align-top">
                    <span className="font-mono text-xs">
                      {item.createdAt.toISOString()}
                    </span>
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {item.actorType}
                    </span>
                    {item.actorUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {item.actorUserId.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 align-top font-mono text-xs">
                    {item.action}
                  </td>
                  <td className="py-2 pr-4 align-top text-xs">
                    {item.targetType ? `${item.targetType}:` : "—"}
                    {item.targetId ?? ""}
                  </td>
                  <td className="py-2 pr-4 align-top text-xs text-muted-foreground">
                    {item.storeId ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`?page=${page - 1}`}
              className="text-primary underline"
            >
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          {page < totalPages ? (
            <Link
              href={`?page=${page + 1}`}
              className="text-primary underline"
            >
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
