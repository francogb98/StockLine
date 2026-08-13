import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/api-auth";

export default async function NewCouponPage() {
  const auth = await requireSuperAdmin();
  if ("response" in auth) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/super-admin/coupons" className="text-xs text-muted-foreground hover:underline">
          ← Cupones
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Nuevo cupón</h1>
      </div>

      <form
        method="post"
        action="/api/super-admin/coupons"
        className="space-y-4 rounded-lg border bg-card p-6"
      >
        <div>
          <label className="text-sm font-medium">Código</label>
          <input
            name="code"
            required
            placeholder="WELCOME10"
            className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm font-mono uppercase"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Descripción</label>
          <input
            name="description"
            placeholder="Bienvenida nuevos clientes"
            className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Tipo</label>
            <select name="discountType" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="PERCENTAGE">Porcentaje</option>
              <option value="FIXED">Monto fijo</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Valor</label>
            <input
              name="discountValue"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Días de extensión</label>
            <input
              name="durationDays"
              type="number"
              defaultValue={30}
              min={1}
              max={365}
              className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Max redenciones (vacío = ilimitado)</label>
            <input
              name="maxRedemptions"
              type="number"
              min={1}
              className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Planes aplicables (vacío = todos)</label>
          <input
            name="applicablePlans"
            placeholder="monthly,annual"
            className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Vencimiento (opcional)</label>
          <input
            name="expiresAt"
            type="date"
            className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Crear cupón
          </button>
          <Link
            href="/super-admin/coupons"
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          * El formulario hace POST a <code>/api/super-admin/coupons</code> via el navegador.
          Para mejor UX, después podemos moverlo a un client component que use fetch.
        </p>
      </form>
    </div>
  );
}
