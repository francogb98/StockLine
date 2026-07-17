"use client";

import { useEffect, useState, createContext, useContext, type ReactNode, type ElementType } from "react";
import { useAuth } from "@/lib/store-context";
import { useCashControl } from "@/lib/cash-control-context";
import { useCashSession } from "@/components/cash/cash-session-provider";
import { BrandLogo } from "@/components/brand-logo";
import { SubscriptionStatusBadge } from "@/components/subscription/subscription-status-badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/mock-data";
import {
  LogOut,
  Menu,
  X,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  viewId: string;
  label: string;
  icon: ElementType;
}

interface ShellContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const ShellContext = createContext<ShellContextType | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within AppShell");
  return ctx;
}

export function AppHeader({
  navItems,
  currentPath,
  onNavigate,
}: {
  navItems: NavItem[];
  currentPath: string;
  onNavigate: (view: string) => void;
}) {
  const { user, logout } = useAuth();
  const { session, loading } = useCashSession();
  const { cashControlEnabled } = useCashControl();
  const { sidebarOpen, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useShell();
  const router = useRouter();

  const navigate = (view: string) => {
    router.push(`/app/${view}`);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-3 md:px-4">
        <div className="flex items-center gap-3">
          {/* Hamburger — toggles sidebar on desktop, mobile menu on mobile */}
          <button
            onClick={toggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={sidebarOpen ? "Contraer menú" : "Expandir menú"}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Cash info */}
          {cashControlEnabled && !loading && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium",
                session
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
              )}
            >
              <span>
                Caja {session ? formatCurrency(session.currentCashTotal) : "—"}
              </span>
              {session && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-500 dark:text-emerald-400">Activa</span>
                </>
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
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
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

      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[80] flex flex-col bg-card transition-all duration-200 ease-out md:hidden",
          mobileMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <span className="text-sm font-bold text-foreground">Navegación</span>
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
    </>
  );
}

export function AppSidebar({
  items,
  currentPath,
  onNavigate,
}: {
  items: NavItem[];
  currentPath: string;
  onNavigate: (view: string) => void;
}) {
  const { sidebarOpen } = useShell();
  const [hovered, setHovered] = useState(false);

  const expanded = sidebarOpen || hovered;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className="hidden border-r bg-card transition-[width] duration-200 ease-out md:flex md:flex-col"
        onMouseEnter={() => !sidebarOpen && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <nav
          className={cn(
            "flex flex-col gap-1 overflow-hidden py-3 transition-all duration-200",
            expanded ? "w-44 px-3" : "w-14 items-center px-1",
          )}
        >
          {/* Brand */}
          <div className={cn("flex items-center pb-2", expanded ? "gap-2 px-3" : "flex-col gap-1")}>
            <BrandLogo showText={false} className="h-5 w-5" />
            {expanded && (
              <span className="text-sm font-bold text-foreground">StockLine</span>
            )}
          </div>

          <div className={cn("border-t", expanded ? "mb-2" : "mb-2 w-8 self-center")} />

          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === `/${item.viewId}`;
            return (
              <Tooltip key={item.viewId}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onNavigate(item.viewId)}
                    data-testid={`nav-${item.viewId}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg transition-colors",
                      expanded ? "px-3 py-2" : "h-10 w-10 justify-center",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    type="button"
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {expanded && (
                      <span className="truncate text-sm font-medium">
                        {item.label}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            );
          })}

          {/* Separator */}
          <div className={cn("border-t", expanded ? "mx-0 my-2" : "mx-2 my-2 w-8")} />

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onNavigate("settings")}
                data-testid="nav-settings"
                className={cn(
                  "flex items-center gap-3 rounded-lg transition-colors",
                  expanded ? "px-3 py-2" : "h-10 w-10 justify-center",
                  currentPath === "/settings"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                type="button"
              >
                <Settings className="h-5 w-5 shrink-0" />
                {expanded && (
                  <span className="truncate text-sm font-medium">Configuración</span>
                )}
              </button>
            </TooltipTrigger>
            {!expanded && (
              <TooltipContent side="right">Configuración</TooltipContent>
            )}
          </Tooltip>
        </nav>
      </aside>
    </TooltipProvider>
  );
}

export function AppShell({
  navItems,
  currentPath,
  onNavigate,
  children,
}: {
  navItems: NavItem[];
  currentPath: string;
  onNavigate: (view: string) => void;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // On mobile, the hamburger opens the mobile overlay
  // On desktop, it toggles the sidebar expand/collapse
  const toggleSidebar = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setMobileMenuOpen((v) => !v);
    } else {
      setSidebarOpen((v) => !v);
    }
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
    <ShellContext.Provider
      value={{ sidebarOpen, toggleSidebar, mobileMenuOpen, setMobileMenuOpen }}
    >
      <AppHeader navItems={navItems} currentPath={currentPath} onNavigate={onNavigate} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar items={navItems} currentPath={currentPath} onNavigate={onNavigate} />
        {children}
      </div>
    </ShellContext.Provider>
  );
}
