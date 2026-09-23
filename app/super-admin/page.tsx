import { getDashboardBundle } from "@/lib/super-admin/dashboard-service";
import { requireSuperAdmin } from "@/lib/api-auth";
import { MetricCard } from "@/components/super-admin/metric-card";
import SignupsVsChurnChart from "@/components/super-admin/signups-churn-chart";
import {
  Store,
  Building2,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Users,
  ShoppingCart,
  Package,
} from "lucide-react";

export default async function SuperAdminPage() {
  const auth = await requireSuperAdmin();
  if (!auth || ("response" in auth)) return null;

  const bundle = await getDashboardBundle(30);

  const m = bundle.metrics;

  const formatCount = (n: number) => new Intl.NumberFormat("es-AR").format(n);
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bienvenido, {auth.auth.user.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plataforma Super Admin — métricas globales de los últimos {bundle.days} días.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Tiendas activas"
          value={formatCount(m.totalStores)}
          icon={Store}
          tone="primary"
          hint={`+${m.newStoresLast30d} nuevas últimos 30d`}
        />
        <MetricCard
          title="Suscripciones activas"
          value={formatCount(m.activeSubscriptions)}
          icon={CreditCard}
          tone="success"
          hint={`${m.trialSubscriptions} en trial · ${m.pastDueSubscriptions} past_due`}
        />
        <MetricCard
          title="MRR estimado"
          value={formatCurrency(m.mrrArs)}
          icon={TrendingUp}
          tone="primary"
          hint={`ARR: ${formatCurrency(m.arrArs)}`}
        />
        <MetricCard
          title="Revenue total"
          value={formatCurrency(m.totalRevenueArs)}
          icon={Building2}
          tone="primary"
          hint={`${formatCount(m.totalSales)} ventas completed`}
        />
        <MetricCard
          title="Usuarios"
          value={formatCount(m.totalUsers)}
          icon={Users}
          tone="primary"
          hint="Excluye platform-internal"
        />
        <MetricCard
          title="Tiendas suspendidas"
          value={formatCount(m.suspendedStores)}
          icon={AlertTriangle}
          tone={m.suspendedStores > 0 ? "warning" : "primary"}
        />
        <MetricCard
          title="Productos totales"
          value={formatCount(m.totalProducts)}
          icon={Package}
          tone="primary"
        />
        <MetricCard
          title="Tiendas inactivas (30d)"
          value={formatCount(m.inactiveStoresLast30d)}
          icon={ShoppingCart}
          tone={m.inactiveStoresLast30d > 0 ? "warning" : "primary"}
          hint="Sin ventas últimos 30d"
        />
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Nuevas tiendas vs Churn</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Altas diarias de tiendas y transiciones a <code>canceled</code> / <code>past_due</code>.
        </p>
        <div className="mt-4">
          <SignupsVsChurnChart
            signups={bundle.signupsTimeseries}
            churn={bundle.churnTimeseries}
          />
        </div>
      </div>
    </div>
  );
}
