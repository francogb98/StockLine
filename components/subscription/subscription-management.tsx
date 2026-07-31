"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/store-context";
import { Skeleton } from "@/components/ui/skeleton";
import { isTestUserEmail } from "@/lib/test-users";

function formatArs(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const statusLabels = {
  trial: "Prueba gratuita",
  active: "Suscripción activa",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
} as const;

export function SubscriptionManagement() {
  const { subscription, refreshSubscription, user, isSessionLoading } =
    useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isTestUser = user ? isTestUserEmail(user.email) : false;
  const canSubscribe = user?.role === "admin" && !isTestUser;

  // Lógica para enviar el plan seleccionado a tu API
  const handleSubscribe = async (planKey: string) => {
    if (!canSubscribe) return;

    setSubmittingPlan(planKey);
    setMessage(null);

    // Formato de ID que espera tu backend (ej: "simple_monthly", "pro_annual", etc.)
    const fullPlanId = `${planKey}_${isYearly ? "annual" : "monthly"}`;

    try {
      const response = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: fullPlanId }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error || "No se pudo iniciar la suscripción.");
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
      setMessage("Error de conexión al procesar el pago.");
    } finally {
      setSubmittingPlan(null);
    }
  };

  return (
    <div className="mx-auto h-full w-full max-w-5xl space-y-8 overflow-y-auto p-6">
      {/* 1. RESUMEN DE ESTADO ACTUAL */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Estado de tu suscripción
            </h1>
            <p className="text-xs text-muted-foreground">
              Información sobre tu plan actual y próximo vencimiento.
            </p>
          </div>
          {!isSessionLoading && subscription?.status === "active" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              Cuenta Activa
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estado
            </p>
            {isSessionLoading ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <p className="mt-1 text-base font-semibold text-foreground">
                {subscription
                  ? statusLabels[subscription.status]
                  : "Sin suscripción"}
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Plan actual
            </p>
            {isSessionLoading ? (
              <Skeleton className="mt-2 h-7 w-20" />
            ) : (
              <p className="mt-1 text-base font-semibold text-foreground">
                {subscription?.plan ? subscription.plan : "Prueba Gratis"}
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Vencimiento
            </p>
            {isSessionLoading ? (
              <Skeleton className="mt-2 h-7 w-28" />
            ) : (
              <p className="mt-1 text-base font-semibold text-foreground">
                {formatDate(subscription?.currentPeriodEnd)}
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Días restantes
            </p>
            {isSessionLoading ? (
              <Skeleton className="mt-2 h-7 w-12" />
            ) : (
              <p className="mt-1 text-base font-semibold text-foreground">
                {subscription?.daysRemaining ?? 0} días
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. ENCABEZADO Y TOGGLE MENSUAL / ANUAL */}
      <div className="text-center max-w-2xl mx-auto pt-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
          Planes simples, sin sorpresas
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Elegí el plan que mejor se adapte a la escala de tu negocio.
        </p>

        <div className="inline-flex items-center bg-muted p-1.5 rounded-xl border relative">
          <button
            type="button"
            onClick={() => setIsYearly(false)}
            className={`relative z-10 px-5 py-2 text-xs sm:text-sm font-semibold transition-colors duration-200 ${
              !isYearly
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {!isYearly && (
              <motion.div
                layoutId="admin-pricing-pill"
                className="absolute inset-0 bg-background rounded-lg shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">Facturación Mensual</span>
          </button>

          <button
            type="button"
            onClick={() => setIsYearly(true)}
            className={`relative z-10 px-5 py-2 text-xs sm:text-sm font-semibold transition-colors duration-200 flex items-center gap-2 ${
              isYearly
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isYearly && (
              <motion.div
                layoutId="admin-pricing-pill"
                className="absolute inset-0 bg-background rounded-lg shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              Facturación Anual
              <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Ahorrá 2 meses
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* MENSAJE DE ADVERTENCIA PARA USUARIOS DE PRUEBA */}
      {isTestUser && (
        <div className="max-w-4xl mx-auto flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/50 p-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            No podés suscribirte con credenciales de prueba. Usá una cuenta real
            para continuar.
          </span>
        </div>
      )}

      {/* 3. GRID DE CARDS DE PLANES (SIMPLE + PRO) */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
        {/* PLAN SIMPLE */}
        <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-foreground">Plan Simple</h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-muted text-muted-foreground rounded-md">
                Inicial
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-6">
              Ideal para comercios o emprendimientos que recién están
              comenzando.
            </p>

            <div className="mb-6 min-h-[60px]">
              <div className="flex items-baseline gap-1">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isYearly ? "simple-yearly" : "simple-monthly"}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className="text-4xl font-extrabold text-foreground inline-block"
                  >
                    {formatArs(isYearly ? 100000 : 10000)}
                  </motion.span>
                </AnimatePresence>
                <span className="text-muted-foreground text-sm font-medium">
                  {isYearly ? "/ año" : "/ mes"}
                </span>
              </div>

              <AnimatePresence>
                {isYearly && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 overflow-hidden"
                  >
                    Equivale a {formatArs(8333)} / mes
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <ul className="space-y-3 mb-8 text-xs sm:text-sm text-foreground border-t pt-6">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  <strong>Hasta 200 productos</strong> en catálogo
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Ventas ilimitadas</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Control de caja diario</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Soporte por email</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleSubscribe("simple")}
            disabled={!canSubscribe || submittingPlan !== null}
            className="w-full py-3 px-4 bg-background border border-border text-foreground rounded-xl font-semibold hover:bg-muted active:scale-[0.99] transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submittingPlan === "simple" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Elegir Plan Simple"
            )}
          </button>
        </div>

        {/* PLAN PRO (DESTACADO) */}
        <div className="relative bg-card rounded-2xl p-6 sm:p-8 border-2 border-primary shadow-xl flex flex-col justify-between">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Más elegido
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-foreground">Plan Pro</h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-md">
                Completo
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-6">
              Para negocios en crecimiento que necesitan control total y sin
              límites.
            </p>

            <div className="mb-6 min-h-[60px]">
              <div className="flex items-baseline gap-1">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isYearly ? "pro-yearly" : "pro-monthly"}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className="text-4xl font-extrabold text-foreground inline-block"
                  >
                    {formatArs(isYearly ? 150000 : 15000)}
                  </motion.span>
                </AnimatePresence>
                <span className="text-muted-foreground text-sm font-medium">
                  {isYearly ? "/ año" : "/ mes"}
                </span>
              </div>

              <AnimatePresence>
                {isYearly && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 overflow-hidden"
                  >
                    Equivale a {formatArs(12500)} / mes (¡Ahorrás{" "}
                    {formatArs(30000)}!)
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <ul className="space-y-3 mb-8 text-xs sm:text-sm text-foreground border-t pt-6">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  <strong>Stock e inventario</strong> ilimitado
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Ventas ilimitadas</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Control de caja y Reportes inteligentes</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Importación / Exportación desde Excel</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Soporte prioritario</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleSubscribe("pro")}
            disabled={!canSubscribe || submittingPlan !== null}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 active:scale-[0.99] transition-all shadow-md disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submittingPlan === "pro" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirigiendo...
              </>
            ) : (
              "Elegir Plan Pro"
            )}
          </button>
        </div>
      </div>

      {message && (
        <p className="text-center text-xs font-medium text-muted-foreground pb-4">
          {message}
        </p>
      )}
    </div>
  );
}
