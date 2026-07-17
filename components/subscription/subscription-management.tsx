"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/store-context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from "@/lib/subscription-config";

function formatArs(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const statusLabels = {
  trial: "Trial",
  active: "Activa",
  past_due: "Vencida",
  canceled: "Cancelada",
} as const;

export function SubscriptionManagement() {
  const { subscription, refreshSubscription, user, isSessionLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubscribe = user?.role === "admin";

  const cards = useMemo(
    () => [
      {
        id: "monthly" as const,
        title: "Mensual",
        price: formatArs(SUBSCRIPTION_PLANS.monthly.amountArs),
        suffix: "/ mes",
        highlight: false,
      },
      {
        id: "annual" as const,
        title: "Anual",
        price: formatArs(SUBSCRIPTION_PLANS.annual.amountArs),
        suffix: "/ año",
        highlight: true,
      },
    ],
    [],
  );

  const handleSubscribe = async () => {
    if (!canSubscribe) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/subscription/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error || "No se pudo iniciar la suscripción");
        return;
      }

      const redirectUrl = data.initPoint || data.sandboxInitPoint;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      setMessage("Suscripción creada. Revisá tu estado en unos segundos.");
      await refreshSubscription();
    } catch (error) {
      setMessage("Error de conexión al crear la suscripción.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto h-full w-full max-w-5xl space-y-6 overflow-y-auto p-6">
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-2xl font-semibold text-foreground">Suscripción</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestioná tu plan y estado de facturación.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Estado
            </p>
            {isSessionLoading ? (
              <Skeleton className="mt-2 h-7 w-20" />
            ) : (
              <p className="mt-1 text-lg font-semibold text-foreground">
                {subscription ? statusLabels[subscription.status] : "Sin datos"}
              </p>
            )}
          </div>
          <div className="rounded-md border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Plan actual
            </p>
            {isSessionLoading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p className="mt-1 text-lg font-semibold text-foreground">
                {subscription?.plan === "annual" ? "Anual" : "Mensual"}
              </p>
            )}
          </div>
          <div className="rounded-md border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Fecha de vencimiento
            </p>
            {isSessionLoading ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatDate(subscription?.currentPeriodEnd)}
              </p>
            )}
          </div>
          <div className="rounded-md border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Días restantes
            </p>
            {isSessionLoading ? (
              <Skeleton className="mt-2 h-7 w-12" />
            ) : (
              <p className="mt-1 text-lg font-semibold text-foreground">
                {subscription?.daysRemaining ?? 0}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setSelectedPlan(card.id)}
            className={`rounded-lg border p-6 text-left transition ${
              selectedPlan === card.id
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {card.title}
              </h2>
              {card.highlight ? (
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                  Ahorrás 2 meses
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {card.price}
            </p>
            <p className="text-sm text-muted-foreground">{card.suffix}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={!canSubscribe || isSubmitting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            "Suscribirse"
          )}
        </button>
        <button
          type="button"
          disabled
          className="inline-flex h-11 items-center justify-center rounded-md border px-6 text-sm font-medium text-muted-foreground"
        >
          Cambiar plan (próximamente)
        </button>
      </div>

      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
