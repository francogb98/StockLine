"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import type { NavigationItem } from "@/lib/module-registry";

export function SidebarNav({
  items,
  currentPath,
}: {
  items: NavigationItem[];
  currentPath: string;
}) {
  const isActive = (viewId: string) => currentPath === `/${viewId}`;

  return (
    <aside className="hidden w-[235px] shrink-0 flex-col bg-gradient-to-b from-[#0F172A] via-[#111827] to-[#0B1220] md:flex">
      <div className="flex shrink-0 flex-col items-center px-4 pt-6 pb-6">
        <div className="dark">
          <BrandLogo className="h-14" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto min-h-0 px-4">
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
                  "flex h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "text-blue-200/70 hover:bg-white/[0.08] hover:text-white",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
