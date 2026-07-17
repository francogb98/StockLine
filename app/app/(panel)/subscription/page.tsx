"use client";

import Link from "next/link";
import { SubscriptionManagement } from "@/components/subscription/subscription-management";
import { Gem } from "lucide-react";
import { ArrowLeft } from "lucide-react";

export default function SubscriptionPage() {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "1") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Link
            href="/app/settings"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Configuración
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md text-center">
            <Gem className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              Suscripciones no disponibles
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta función no está habilitada en el modo demo. Registrate para
              acceder a la gestión de suscripciones y facturación.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link
          href="/app/settings"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Configuración
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SubscriptionManagement />
      </div>
    </div>
  );
}
