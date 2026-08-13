import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/api-auth";
import { getSubscriptionDetail } from "@/lib/super-admin/subscriptions-service";
import { Badge } from "@/components/ui/badge";
import {
  CancelSubscriptionControls,
  ExtendControls,
  SyncControls,
} from "@/components/super-admin/subscription-controls";

export default async function SubscriptionDetailPage(props: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) {
    redirect("/login");
  }
  const { id } = await props.params;
  const detail = await getSubscriptionDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/super-admin/subscriptions" className="text-xs text-muted-foreground hover:underline">
          ← Suscripciones
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{detail.storeName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sub ID: <code>{detail.id}</code>
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant={detail.status === "active" ? "default" : detail.status === "canceled" ? "destructive" : "secondary"}>
            {detail.status}
          </Badge>
          <Badge variant="outline">{detail.plan}</Badge>
          {detail.cancelledByAdmin && (
            <Badge variant="destructive">Cancelada por admin</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 text-sm">
          <h3 className="text-xs font-medium text-muted-foreground">Periodo actual</h3>
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Inicio</dt>
              <dd>{detail.currentPeriodStart.toISOString().slice(0, 10)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Fin</dt>
              <dd>{detail.currentPeriodEnd.toISOString().slice(0, 10)}</dd>
            </div>
            {detail.trialEndsAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Trial ends</dt>
                <dd>{detail.trialEndsAt.toISOString().slice(0, 10)}</dd>
              </div>
            )}
            {detail.previousStatus && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status previo</dt>
                <dd>{detail.previousStatus}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-4 text-sm">
          <h3 className="text-xs font-medium text-muted-foreground">Mercado Pago</h3>
          <dl className="mt-2 space-y-1">
            <div>
              <dt className="text-muted-foreground">Preapproval ID</dt>
              <dd className="font-mono text-xs">
                {detail.mercadoPagoPreapprovalId ?? "—"}
              </dd>
            </div>
            {detail.cancelledByAdminUserId && (
              <div>
                <dt className="text-muted-foreground">Cancelada por</dt>
                <dd className="font-mono text-xs">{detail.cancelledByAdminUserId}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-4 text-sm">
          <h3 className="text-xs font-medium text-muted-foreground">Notas admin</h3>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{detail.adminNotes ?? "—"}</pre>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Acciones</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          {detail.cancelledByAdmin ? (
            <p className="text-sm text-muted-foreground">
              La suscripción fue cancelada por admin. Reactivar primero desde la acción disponible si querés extender.
            </p>
          ) : (
            <CancelSubscriptionControls subscriptionId={detail.id} storeId={detail.storeId} />
          )}
          <ExtendControls subscriptionId={detail.id} storeId={detail.storeId} />
          <SyncControls subscriptionId={detail.id} storeId={detail.storeId} />
        </div>
      </div>
    </div>
  );
}
