"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store-context";
import { useCashControl } from "@/lib/cash-control-context";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sun,
  Moon,
  Monitor,
  Landmark,
  CreditCard,
  Users,
  Gem,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { id: "cash", label: "Efectivo", enabled: true },
  { id: "card", label: "Tarjeta", enabled: true },
  { id: "bank_transfer", label: "Transferencia bancaria", enabled: true },
] as const;

export function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cashControlEnabled, enableCashControl, disableCashControl } =
    useCashControl();
  const { theme, setTheme } = useTheme();

  const [showEnableCashDialog, setShowEnableCashDialog] = useState(false);
  const [showDisableCashDialog, setShowDisableCashDialog] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, m.enabled]))
  );

  const handlePaymentMethodToggle = (methodId: string) => {
    setPaymentMethods((prev) => ({ ...prev, [methodId]: !prev[methodId] }));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra la configuración general de tu negocio.
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance Section */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Apariencia
          </h2>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Sun className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Tema</CardTitle>
                  <CardDescription className="mt-0.5">
                    Seleccioná el aspecto de la aplicación.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "light" as const, label: "Claro", icon: Sun },
                  { id: "dark" as const, label: "Oscuro", icon: Moon },
                  { id: "system" as const, label: "Sistema", icon: Monitor },
                ].map((option) => {
                  const Icon = option.icon;
                  const isActive = theme === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setTheme(option.id)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/50",
                      )}
                      type="button"
                    >
                      {isActive && (
                        <div className="absolute right-2 top-2">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <Icon
                        className={cn(
                          "h-6 w-6",
                          isActive ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isActive ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Register Section */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Caja
          </h2>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Landmark className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Control de caja
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    {cashControlEnabled
                      ? "La gestión de caja está actualmente activa."
                      : "Habilita la gestión de caja, incluyendo apertura, cierre, cálculo de efectivo esperado y conciliación diaria."}
                  </CardDescription>
                  <p className="mt-1 text-xs font-medium">
                    Estado:{" "}
                    <span
                      className={
                        cashControlEnabled
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      }
                    >
                      {cashControlEnabled ? "Habilitado" : "Deshabilitado"}
                    </span>
                  </p>
                </div>
              </div>
              {cashControlEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisableCashDialog(true)}
                  className="shrink-0"
                >
                  Deshabilitar caja
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowEnableCashDialog(true)}
                  className="shrink-0"
                >
                  Habilitar caja
                </Button>
              )}
            </CardHeader>
          </Card>
        </div>

        {/* Payment Methods Section */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Métodos de pago
          </h2>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Métodos de pago
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    Selecciona los métodos de pago aceptados en tu negocio.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between rounded-md border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`payment-${method.id}`}
                        checked={paymentMethods[method.id] ?? false}
                        onCheckedChange={() =>
                          handlePaymentMethodToggle(method.id)
                        }
                      />
                      <label
                        htmlFor={`payment-${method.id}`}
                        className="cursor-pointer text-sm font-medium text-foreground"
                      >
                        {method.label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Section */}
        {user?.role === "admin" && (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Administración
            </h2>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Usuarios y empleados
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      Administra cuentas de empleados, permisos y acceso al
                      sistema.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/app/users")}
                  className="shrink-0"
                >
                  Gestionar
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Subscription Section — hidden in demo mode */}
        {process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "1" && (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cuenta
            </h2>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Gem className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Suscripción y facturación
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      Administra tu plan de suscripción, fecha de vencimiento y
                      límites de cuenta.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/app/subscription")}
                  className="shrink-0"
                >
                  Gestionar
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>

      {/* Enable Cash Control Dialog */}
      <AlertDialog
        open={showEnableCashDialog}
        onOpenChange={setShowEnableCashDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Habilitar control de caja</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Habilitar esta función:</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Habilita apertura de caja.</li>
                  <li>Habilita cierre de caja.</li>
                  <li>Habilita historial de caja.</li>
                  <li>Habilita cálculo de efectivo esperado.</li>
                  <li>Habilita flujos de conciliación de caja.</li>
                  <li>
                    Cambia el comportamiento de varias pantallas relacionadas
                    con ventas.
                  </li>
                </ul>
                <p>
                  Los datos históricos de ventas no serán modificados.
                </p>
                <p className="font-medium text-foreground">
                  ¿Estás seguro de que querés continuar?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={enableCashControl}>
              Sí, habilitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable Cash Control Dialog */}
      <AlertDialog
        open={showDisableCashDialog}
        onOpenChange={setShowDisableCashDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deshabilitar control de caja</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Deshabilitar esta función:</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Oculta controles de apertura de caja.</li>
                  <li>Oculta controles de cierre de caja.</li>
                  <li>Oculta historial de caja.</li>
                  <li>Oculta resúmenes de caja.</li>
                  <li>Oculta cálculos de efectivo esperado.</li>
                  <li>
                    Elimina la información de caja de la interfaz.
                  </li>
                </ul>
                <p>
                  Las ventas, productos, reportes, usuarios y suscripciones
                  seguirán funcionando normalmente.
                </p>
                <p className="font-medium text-amber-600">
                  IMPORTANTE: Los registros históricos de caja NO se
                  eliminarán. Se mantendrán almacenados y volverán a
                  mostrarse si se vuelve a habilitar el control de caja.
                </p>
                <p className="font-medium text-foreground">
                  ¿Estás seguro de que querés continuar?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={disableCashControl}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, deshabilitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
