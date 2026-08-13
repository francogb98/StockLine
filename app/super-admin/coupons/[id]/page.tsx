import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/api-auth";
import { getCouponDetail, getRedemptions } from "@/lib/super-admin/coupons-service";
import { Badge } from "@/components/ui/badge";

export default async function CouponDetailPage(props: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) {
    redirect("/login");
  }
  const { id } = await props.params;
  const coupon = await getCouponDetail(id);
  if (!coupon) notFound();
  const redemptions = await getRedemptions(id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/super-admin/coupons" className="text-xs text-muted-foreground hover:underline">
          ← Cupones
        </Link>
        <h1 className="mt-1 text-2xl font-bold font-mono">{coupon.code}</h1>
        {coupon.description && (
          <p className="mt-1 text-sm text-muted-foreground">{coupon.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {coupon.isActive ? (
            <Badge variant="default">Activo</Badge>
          ) : (
            <Badge variant="secondary">Inactivo</Badge>
          )}
          <Badge variant="outline">{coupon.discountType}</Badge>
          <Badge variant="outline">{coupon.durationDays} días</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 text-sm">
          <h3 className="text-xs font-medium text-muted-foreground">Valor</h3>
          <p className="mt-2 text-2xl font-bold">
            {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-sm">
          <h3 className="text-xs font-medium text-muted-foreground">Redenciones</h3>
          <p className="mt-2 text-2xl font-bold">
            {coupon.redeemedCount}{coupon.maxRedemptions !== null ? ` / ${coupon.maxRedemptions}` : ""}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-sm">
          <h3 className="text-xs font-medium text-muted-foreground">Vigencia</h3>
          <p className="mt-2 text-xs">
            Desde {coupon.startsAt.toISOString().slice(0, 10)}
            <br />
            {coupon.expiresAt ? `Hasta ${coupon.expiresAt.toISOString().slice(0, 10)}` : "Sin vencimiento"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Redenciones ({redemptions.length})</h2>
        {redemptions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Aún nadie usó este cupón.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Tienda</th>
                  <th className="px-3 py-2 font-medium">Sub ID</th>
                  <th className="px-3 py-2 font-medium">Descuento</th>
                  <th className="px-3 py-2 font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 text-xs">{r.redeemedAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                    <td className="px-3 py-2 text-xs font-mono">{r.storeId}</td>
                    <td className="px-3 py-2 text-xs font-mono">{r.subscriptionId}</td>
                    <td className="px-3 py-2 text-xs">${r.discountApplied.toString()}</td>
                    <td className="px-3 py-2 text-xs">{r.redeemedByUserId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
