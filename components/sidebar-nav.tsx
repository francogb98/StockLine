"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function SidebarNav({
  items,
  currentPath,
  onNavigate,
}: {
  items: { viewId: string; label: string; icon: React.ElementType }[];
  currentPath: string;
  onNavigate: (view: string) => void;
}) {
  const [expanded] = useState(false);

  const navItems = [
    ...items,
    {
      viewId: "settings",
      label: "Configuración",
      icon: Settings,
    },
  ];

  return (
    <nav
      className={cn(
        "flex h-full flex-col transition-all duration-300 ease-out md:gap-1",
        expanded ? "w-52 px-3" : "w-14 items-center px-2.5",
      )}
    >
      <Separator className={cn(expanded ? "mb-2" : "mb-3 w-8 self-center")} />

      <div
        className={cn("flex flex-col gap-1", expanded ? "" : "items-center")}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === `/${item.viewId}`;

          return (
            <Tooltip key={item.viewId}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onNavigate(item.viewId)}
                  data-testid={`nav-${item.viewId}`}
                  aria-label={item.label}
                  type="button"
                  className={cn(
                    "flex items-center gap-3 rounded-lg transition-all duration-200",
                    expanded ? "px-3 py-2" : "h-11 w-11 justify-center",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
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
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  className="rounded-lg border-0 bg-gray-900 px-3 py-2 text-sm text-white shadow-md dark:bg-gray-100 dark:text-gray-900"
                >
                  {item.label}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
    </nav>
  );
}
