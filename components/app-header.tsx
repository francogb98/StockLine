"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/store-context";
import { useCashControl } from "@/lib/cash-control-context";
import { getNavigationForRole } from "@/lib/module-registry";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/mock-data";
import { LogOut, Menu, X, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "@/components/brand-logo";
import { SubscriptionStatusBadge } from "@/components/subscription/subscription-status-badge";
import { useCashSession } from "@/components/cash/cash-session-provider";
import { CloseCashDialog } from "@/components/cash/close-cash-dialog";

export function AppHeader() {
  const { user, logout } = useAuth();
  const { session, loading, openCashDialog, refreshSession } = useCashSession();
  const { cashControlEnabled } = useCashControl();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCloseCash, setShowCloseCash] = useState(false);

  const navItems = useMemo(
    () => getNavigationForRole(user?.role || "employee", cashControlEnabled),
    [user?.role, cashControlEnabled],
  );

  const currentPath = pathname.replace("/app", "") || "/pos";

  const navigate = (view: string) => {
    router.push(`/app/${view}`);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-3 md:px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            type="button"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          <BrandLogo className="hidden h-20 md:block" />
        </div>

        <div className="flex items-center gap-2">
          {cashControlEnabled && (
            <div
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                loading && "animate-pulse",
                session
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                  : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900",
              )}
              onClick={() => {
                if (loading) return;
                session ? setShowCloseCash(true) : openCashDialog();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  if (loading) return;
                  session ? setShowCloseCash(true) : openCashDialog();
                }
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                  <span>Cargando Caja</span>
                </span>
              ) : session ? (
                <>
                  <span>
                    Caja {formatCurrency(session.currentCashTotal)}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-500 dark:text-emerald-400">
                    Activa
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span>Caja Cerrada</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <SubscriptionStatusBadge
              variant="desktop"
              onNavigate={() => navigate("subscription")}
            />
          </div>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  type="button"
                >
                  <span className="hidden sm:inline">{user.name}</span>
                  <span className="sm:hidden">{user.name.split(" ")[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-[80] flex flex-col bg-black/30 transition-all duration-200 ease-out md:hidden",
          mobileMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0",
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div
          className="flex w-full max-w-xs flex-1 flex-col bg-card shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <BrandLogo className="h-14" />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Cerrar menú"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === `/${item.viewId}`;
              return (
                <button
                  key={`mobile-${item.viewId}`}
                  onClick={() => navigate(item.viewId)}
                  data-testid={`nav-mobile-${item.viewId}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  type="button"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => navigate("settings")}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                currentPath === "/settings"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              type="button"
            >
              <Settings className="h-5 w-5" />
              <span>Configuración</span>
            </button>
          </nav>
        </div>
      </div>

      {session && (
        <CloseCashDialog
          open={showCloseCash}
          onOpenChange={setShowCloseCash}
          session={session}
          onSessionClosed={() => {
            setShowCloseCash(false);
            refreshSession();
          }}
        />
      )}
    </>
  );
}
