"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Package,
  CircleDollarSign,
  BarChart3,
  Sparkles,
  Settings,
} from "lucide-react";
import { useAssistant } from "@/components/mobile-assistant/context";

interface MobileBottomNavigationProps {
  onHeightChange?: (height: number) => void;
}

const navItems = [
  { icon: Package, label: "Productos", href: "/app/stock" },
  { icon: BarChart3, label: "Reportes", href: "/app/dashboard" },
  {
    icon: CircleDollarSign,
    label: "Vender",
    href: "/app/pos",
    isPrimary: true,
  },
  { icon: Sparkles, label: "Asistente", href: null, isAssistant: true },
  { icon: Settings, label: "Ajustes", href: "/app/settings" },
] as const;

export function MobileBottomNavigation({
  onHeightChange,
}: MobileBottomNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const assistant = useAssistant();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el || !onHeightChange) return;
    const report = () =>
      onHeightChange(Math.ceil(el.getBoundingClientRect().height));
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <nav
      ref={navRef}
      className="fixed bottom-0 z-40 w-full"
      aria-label="Navegación principal"
    >
      <div className="rounded-t-2xl border-t bg-white px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:bg-card">
        <div className="flex items-start justify-around">
          {navItems.map((item) => {
            if ("isPrimary" in item) {
              const isActive = item.href === pathname;
              return (
                <div
                  key={item.label}
                  className="relative flex flex-col items-center"
                  style={{ marginTop: -18 }}
                >
                  <button
                    onClick={() => router.push(item.href)}
                    className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-shadow hover:shadow-xl ${
                      isActive
                        ? "bg-primary ring-2 ring-primary/30"
                        : "bg-primary"
                    }`}
                    type="button"
                    aria-label={item.label}
                  >
                    <item.icon className="h-6 w-6" />
                  </button>
                  <span
                    className={`mt-0.5 text-[10px] font-medium ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            }

            if ("isAssistant" in item) {
              return (
                <button
                  key={item.label}
                  onClick={assistant.open}
                  className="relative flex flex-col items-center px-3 py-1"
                  type="button"
                  aria-label={item.label}
                >
                  <div className="relative flex flex-col items-center gap-0.5">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            }

            const isActive = item.href === pathname;
            return (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className="relative flex flex-col items-center px-3 py-1"
                type="button"
                aria-label={item.label}
              >
                <div className="relative flex flex-col items-center gap-0.5">
                  <item.icon
                    className={`h-5 w-5 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
