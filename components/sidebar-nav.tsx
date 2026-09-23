"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/lib/store-context";
import { LogOut, Shield } from "lucide-react";
import type { NavigationItem } from "@/lib/module-registry";

export function SidebarNav({
  items,
  currentPath,
  isSuperAdmin = false,
}: {
  items: NavigationItem[];
  currentPath: string;
  isSuperAdmin?: boolean;
}) {
  const isActive = (viewId: string) => currentPath === `/${viewId}`;
  const { logout } = useAuth();

  return (
    <aside className="hidden w-[235px] shrink-0 flex-col border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-[#0c1222] dark:to-slate-950 md:flex">
      <div className="flex shrink-0 flex-col items-center border-b border-slate-200 dark:border-slate-800/60 px-4 pt-6 pb-6">
        <BrandLogo className="h-14" />
      </div>

      <nav className="flex-1 overflow-y-auto min-h-0 px-4 pt-4">
        <div className="flex flex-col gap-[4px]">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.viewId);

            return (
              <Link
                key={item.viewId}
                href={`/app/${item.viewId}`}
                data-testid={`nav-${item.viewId}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 dark:hover:bg-slate-800/60 dark:hover:text-slate-100",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-slate-200 dark:border-slate-800/60 p-4 space-y-1">
        {isSuperAdmin && (
          <Link
            href="/super-admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-500 transition-colors duration-150 hover:bg-amber-500/10 hover:text-amber-400"
          >
            <Shield className="h-5 w-5 shrink-0" />
            <span>Super Admin</span>
          </Link>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
