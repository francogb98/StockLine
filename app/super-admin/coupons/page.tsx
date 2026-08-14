import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/api-auth";
import { listCoupons } from "@/lib/super-admin/coupons-service";
import { Badge } from "@/components/ui/badge";
import { ToggleCouponButton } from "@/components/super-admin/coupon-toggle-button";

interface PageProps {
  searchParams: Promise<{ q?: string; isActive?: string; status?: string; page?: string }>;
}

function getCouponStatus(c: {
  isActive: boolean;
  redeemedCount: number;
  maxRedemptions: number | null;
  expiresAt: Date | null;
}): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (!c.isActive) return { label: "Inactivo", variant: "secondary" };
  if (c.maxRedemptions !== null && c.redeemedCount >= c.maxRedemptions)
    return { label: "Usado", variant: "outline" };
  if (c.expiresAt && c.expiresAt < new Date())
    return { label: "Vencido", variant: "destructive" };
  return { label: "Disponible", variant: "default" };
}

function formatDiscount(c: { discountType: string; discountValue: number; durationDays: number }) {
  if (c.discountType === "FREE_TRIAL") return `${c.durationDays} días gratis`;
  if (c.discountType === "PERCENTAGE") return `${c.discountValue}%`;
  return `$${c.discountValue}`;
}

function formatType(discountType: string) {
  if (discountType === "FREE_TRIAL") return "Período gratis";
  if (discountType === "PERCENTAGE") return "Porcentaje";
  return "Monto fijo";
}

export default async function CouponsPage(props: PageProps) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) {
    redirect("/login");
  }
  const params = await props.searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const result = await listCoupons({
    q: params.q,
    isActive:
      params.isActive === "true" ? true : params.isActive === "false" ? false : undefined,
    page,
    limit: 25,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / 25));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total} cupones — gestión administrativa.
          </p>
        </div>
        <Link
          href="/super-admin/coupons/new"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Nuevo cupón
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="código o empresa"
            className="h-9 w-48 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Activo</label>
          <select name="isActive" defaultValue={params.isActive ?? ""} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
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
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Beneficio</th>
              <th className="px-3 py-2 font-medium">Vencimiento</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Empresa</th>
              <th className="px-3 py-2 font-medium">Fecha de uso</th>
              <th className="px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  Sin cupones.
                </td>
              </tr>
            )}
            {result.items.map((c) => {
              const status = getCouponStatus(c);
              return (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link
                      href={`/super-admin/coupons/${c.id}`}
                      className="font-mono font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{formatType(c.discountType)}</td>
                  <td className="px-3 py-2 text-xs">{formatDiscount(c)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "Sin vencimiento"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.redeemedByStoreName ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.redeemedAt ? c.redeemedAt.toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <ToggleCouponButton id={c.id} initialActive={c.isActive} />
                  </td>
                </tr>
              );
            })}
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
