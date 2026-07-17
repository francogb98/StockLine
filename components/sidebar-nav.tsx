"use client";

import { useState } from "react";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

export function SidebarNav({
  items,
  currentPath,
  onNavigate,
}: {
  items: { viewId: string; label: string; icon: React.ElementType }[];
  currentPath: string;
  onNavigate: (view: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <nav
      className={cn(
        "flex h-full flex-col transition-all duration-300 ease-out md:gap-1",
        expanded ? "w-52 px-3" : "w-14 items-center px-2.5",
      )}
    >
      {/* Brand */}
      {/* <div
        className={cn(
          "flex items-center py-5",
          expanded ? "justify-between" : "flex-col",
        )}
      >
        <div className={cn("flex items-center", expanded ? "gap-2" : "flex-col gap-2")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center">
            <BrandLogo showText={false} className="h-6 w-6" />
          </div>
          {expanded && (
            <span className="text-sm font-bold text-foreground">StockLine</span>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            expanded ? "" : "mt-3",
          )}
          aria-label={expanded ? "Contraer menú" : "Expandir menú"}
          type="button"
        >
          {expanded ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <Separator className={cn(expanded ? "mb-2" : "mb-3 w-8 self-center")} /> */}
      <Separator className={cn(expanded ? "mb-2" : "mb-3 w-8 self-center")} />
      {/* Nav items */}
      <div
        className={cn("flex flex-col gap-1", expanded ? "" : "items-center")}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === `/${item.viewId}`;
          return (
            <Tooltip key={item.viewId}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onNavigate(item.viewId)}
                  data-testid={`nav-${item.viewId}`}
                  aria-label={item.label}
                  className={cn(
                    "flex items-center gap-3 rounded-lg transition-all duration-200",
                    expanded ? "px-3 py-2" : "h-11 w-11 justify-center",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
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

      {/* Bottom: Settings */}
      <div
        className={cn("mt-auto flex flex-col", expanded ? "" : "items-center")}
      >
        <Separator className={cn(expanded ? "my-2" : "mb-3 w-8")} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onNavigate("settings")}
              data-testid="nav-settings"
              aria-label="Configuración"
              className={cn(
                "flex items-center gap-3 rounded-lg transition-all duration-200",
                expanded ? "px-3 py-2" : "h-11 w-11 justify-center",
                currentPath === "/settings"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              type="button"
            >
              <Settings className="h-5 w-5 shrink-0" />
              {expanded && (
                <span className="truncate text-sm font-medium">
                  Configuración
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
              Configuración
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </nav>
  );
}
