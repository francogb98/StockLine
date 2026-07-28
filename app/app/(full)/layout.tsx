"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/store-context";
import { useCashControl } from "@/lib/cash-control-context";
import { getNavigationForRole } from "@/lib/module-registry";
import { CashSessionProvider } from "@/components/cash/cash-session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileLayout } from "@/components/mobile-layout";
import { useIsMobile } from "@/hooks/use-mobile";

export default function FullLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { cashControlEnabled } = useCashControl();
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();

  const navItems = useMemo(
    () => getNavigationForRole(user?.role || "employee", cashControlEnabled),
    [user?.role, cashControlEnabled],
  );

  const currentPath = pathname.replace("/app", "") || "/pos";

  const navigate = (view: string) => {
    router.push(`/app/${view}`);
  };

  const desktop = (
    <>
      <div className="relative flex h-screen flex-col overflow-hidden bg-background">
        <div className="flex flex-1 overflow-hidden">
          <SidebarNav
            items={navItems}
            currentPath={currentPath}
            onNavigate={navigate}
          />

          <main className="flex flex-1 flex-col overflow-hidden">
            <AppHeader />
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
          </main>
        </div>
      </div>
    </>
  );

  return (
    <CashSessionProvider>
      <TooltipProvider delayDuration={300}>
        {isMobile ? <MobileLayout>{children}</MobileLayout> : desktop}
      </TooltipProvider>
    </CashSessionProvider>
  );
}
