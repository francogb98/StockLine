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

export default function FullLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { cashControlEnabled } = useCashControl();
  const pathname = usePathname();
  const router = useRouter();

  const navItems = useMemo(
    () => getNavigationForRole(user?.role || "employee", cashControlEnabled),
    [user?.role, cashControlEnabled],
  );

  const currentPath = pathname.replace("/app", "") || "/pos";

  const navigate = (view: string) => {
    router.push(`/app/${view}`);
  };

  return (
    <CashSessionProvider>
      <TooltipProvider delayDuration={300}>
      <div className="relative flex h-screen flex-col overflow-hidden bg-background">
        <AppHeader />

        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden flex-shrink-0 border-r bg-card md:flex md:flex-col">
            <SidebarNav
              items={navItems}
              currentPath={currentPath}
              onNavigate={navigate}
            />
          </aside>

          <main className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
            <footer className="shrink-0 border-t px-4 py-2 text-center text-xs text-muted-foreground">
              © 2026 StockLine
            </footer>
          </main>
        </div>
      </div>
      </TooltipProvider>
    </CashSessionProvider>
  );
}
