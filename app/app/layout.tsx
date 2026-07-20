"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useData } from "@/lib/store-context";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { SyncProvider } from "@/components/offline/sync-provider";
import { PendingCashSessionWatcher } from "@/components/cash/pending-cash-session-watcher";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isSessionLoading } = useAuth();
  const { refreshData } = useData();
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [isOnboardingTransition, setIsOnboardingTransition] = useState(false);

  useEffect(() => {
    if (user) {
      setShowOnboarding(!user.hasCompletedOnboarding);
    }
  }, [user]);

  useEffect(() => {
    if (!isSessionLoading && !user) {
      router.replace("/login");
    }
  }, [isSessionLoading, user, router]);

  if (isSessionLoading) {
    return (
      <LoadingScreen
        messages={[
          "Cargando tu espacio de trabajo...",
          "Restaurando sesión...",
          "Cargando productos...",
          "Preparando tu panel...",
          "Casi listo...",
        ]}
      />
    );
  }

  if (!user) return null;

  if (showOnboarding === null) {
    return (
      <LoadingScreen
        messages={[
          "Cargando tu espacio de trabajo...",
          "Restaurando sesión...",
          "Cargando productos...",
          "Preparando tu panel...",
          "Casi listo...",
        ]}
      />
    );
  }

  if (isOnboardingTransition) {
    return (
      <LoadingScreen
        messages={[
          "Preparando tu negocio...",
          "Cargando productos...",
          "Cargando categorías...",
          "Configurando inventario...",
          "Preparando tu panel...",
          "Casi listo...",
          "Finalizando configuración...",
        ]}
      />
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={async () => {
          setIsOnboardingTransition(true);
          await refreshData();
          setShowOnboarding(false);
          setIsOnboardingTransition(false);
        }}
      />
    );
  }

  return (
    <>
      <PendingCashSessionWatcher />
      <SyncProvider>{children}</SyncProvider>
    </>
  );
}
