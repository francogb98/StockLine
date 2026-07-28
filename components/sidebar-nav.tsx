"use client";

import { ChevronDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/store-context";
import { cn } from "@/lib/utils";
import type { NavigationItem } from "@/lib/module-registry";

export function SidebarNav({
  items,
  currentPath,
  onNavigate,
}: {
  items: NavigationItem[];
  currentPath: string;
  onNavigate: (view: string) => void;
}) {
  const { user, logout } = useAuth();

  const isActive = (viewId: string) => currentPath === `/${viewId}`;

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col bg-gradient-to-b from-[#0F172A] via-[#111827] to-[#0B1220] md:flex">
      <div className="flex shrink-0 flex-col items-center px-6 pt-10 pb-10">
        <img
          src="/logo-horizontal-dark.svg"
          alt="StockLine"
          className="h-7 object-contain"
        />
      </div>

      <nav className="flex-1 overflow-y-auto min-h-0 px-4">
        <div className="flex flex-col gap-[6px]">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.viewId);

            return (
              <button
                key={item.viewId}
                onClick={() => onNavigate(item.viewId)}
                data-testid={`nav-${item.viewId}`}
                type="button"
                className={cn(
                  "flex h-[50px] items-center gap-3.5 rounded-xl px-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "text-blue-200/70 hover:bg-white/[0.08] hover:text-white",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
