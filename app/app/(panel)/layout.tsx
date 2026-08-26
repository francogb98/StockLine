"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/store-context";
import { useCashControl } from "@/lib/cash-control-context";
import { getNavigationForRole } from "@/lib/module-registry";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { GlobalProductDialog } from "@/components/global-product-dialog";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileLayout } from "@/components/mobile-layout";
import { useIsMobile } from "@/hooks/use-mobile";

export default function PanelLayout({
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

  useEffect(() => {
    if (user?.isSuperAdmin) {
      router.replace("/super-admin");
      return;
    }
    if (!cashControlEnabled && pathname === "/app/cash-sessions") {
      router.replace("/app/pos");
    }
  }, [user?.isSuperAdmin, cashControlEnabled, pathname, router]);

  useEffect(() => {
    if (isMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-product-dialog"));
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile]);

  const desktop = (
    <>
      <div className="relative flex h-screen flex-col overflow-hidden bg-background">
        <div className="flex flex-1 overflow-hidden">
          <SidebarNav items={navItems} currentPath={currentPath} />

          <main className="flex flex-1 flex-col overflow-hidden">
            <AppHeader />
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
          </main>
        </div>
      </div>
      <GlobalProductDialog />
    </>
  );

  return (
    <TooltipProvider delayDuration={300}>
      {isMobile ? <MobileLayout>{children}</MobileLayout> : desktop}
    </TooltipProvider>
  );
}
