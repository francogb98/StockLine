import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/api-auth";
import { getCompanyDetail } from "@/lib/super-admin/companies-service";
import { Badge } from "@/components/ui/badge";
import { SuspendControls } from "@/components/super-admin/suspend-controls";

export default async function CompanyDetailPage(props: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) {
    redirect("/login");
  }

  const { id } = await props.params;
  const detail = await getCompanyDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/super-admin/companies"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Empresas
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{detail.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{detail.address} · {detail.phone}</p>
          <div className="mt-2 flex items-center gap-2">
            {detail.isSuspended ? (
              <Badge variant="destructive">Suspendida</Badge>
            ) : (
              <Badge variant="outline">Activa</Badge>
            )}
            {detail.subscription && (
              <Badge variant="secondary">
                {detail.subscription.plan} · {detail.subscription.status}
              </Badge>
            )}
          </div>
        </div>
        <div>
          <SuspendControls
            storeId={detail.id}
            initialSuspended={detail.isSuspended}
            initialReason={detail.suspendedReason}
            initialNotes={detail.internalNotes}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground">Suscripción</h3>
          {detail.subscription ? (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium">{detail.subscription.plan}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{detail.subscription.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Próximo cobro</dt>
                <dd className="font-medium">
                  {detail.subscription.currentPeriodEnd.toISOString().slice(0, 10)}
                </dd>
              </div>
              {detail.subscription.trialEndsAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Trial ends</dt>
                  <dd className="font-medium">
                    {detail.subscription.trialEndsAt.toISOString().slice(0, 10)}
                  </dd>
                </div>
              )}
              {detail.subscription.mercadoPagoPreapprovalId && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">MP ID</dt>
                  <dd className="font-mono text-xs">{detail.subscription.mercadoPagoPreapprovalId}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Sin suscripción registrada</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground">Admin principal</h3>
          {detail.primaryAdmin ? (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{detail.primaryAdmin.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{detail.primaryAdmin.email}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Sin admin principal</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground">Última actividad</h3>
          <p className="mt-2 text-sm">
            {detail.lastActivityAt
              ? detail.lastActivityAt.toISOString().slice(0, 19).replace("T", " ")
              : "Sin ventas registradas"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Métricas</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
          <div>
            <p className="text-xs text-muted-foreground">Ventas totales</p>
            <p className="mt-1 text-2xl font-bold">{detail.metrics.totalSales}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ingresos totales</p>
            <p className="mt-1 text-2xl font-bold">
              {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(detail.metrics.totalRevenueArs)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ventas 30d</p>
            <p className="mt-1 text-2xl font-bold">{detail.metrics.last30dSales}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Productos</p>
            <p className="mt-1 text-2xl font-bold">{detail.metrics.totalProducts}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Usuarios</p>
            <p className="mt-1 text-2xl font-bold">{detail.metrics.totalUsers}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
