import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/api-auth";
import { listSubscriptions } from "@/lib/super-admin/subscriptions-service";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  searchParams: Promise<{
    plan?: string;
    status?: string;
    cancelledByAdmin?: string;
    page?: string;
  }>;
}

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

export default async function SubscriptionsPage(props: PageProps) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) {
    redirect("/login");
  }

  const params = await props.searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const result = await listSubscriptions({
    plan: params.plan && params.plan !== "" ? (params.plan as any) : undefined,
    status: params.status && params.status !== "" ? (params.status as any) : undefined,
    cancelledByAdmin: params.cancelledByAdmin === "true" ? true : params.cancelledByAdmin === "false" ? false : undefined,
    page,
    limit: 25,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / 25));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suscripciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.total} suscripciones — vista administrativa sin tocar Mercado Pago.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Plan</label>
          <select name="plan" defaultValue={params.plan ?? ""} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Todos</option>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Todos</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="past_due">Past due</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Canceladas por admin</label>
          <select name="cancelledByAdmin" defaultValue={params.cancelledByAdmin ?? ""} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Todas</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
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
              <th className="px-3 py-2 font-medium">Tienda</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Vence</th>
              <th className="px-3 py-2 font-medium">MP</th>
              <th className="px-3 py-2 font-medium">Admin</th>
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Sin suscripciones para los filtros aplicados.
                </td>
              </tr>
            )}
            {result.items.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">
                  <Link
                    href={`/super-admin/subscriptions/${s.id}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {s.storeName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs">{s.plan}</td>
                <td className="px-3 py-2 text-xs">
                  <Badge variant={s.status === "active" ? "default" : s.status === "canceled" ? "destructive" : "secondary"}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs">{s.currentPeriodEnd.toISOString().slice(0, 10)}</td>
                <td className="px-3 py-2 text-xs font-mono">{s.mercadoPagoPreapprovalId ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {s.cancelledByAdmin ? (
                    <Badge variant="destructive">Cancelada por admin</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
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
