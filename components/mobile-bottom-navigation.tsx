"use client";

import { usePathname, useRouter } from "next/navigation";
import { Package, CircleDollarSign, BarChart3 } from "lucide-react";

const navItems = [
  { icon: Package, label: "Productos", href: "/app/stock" },
  { icon: CircleDollarSign, label: "Vender", href: "/app/pos", isPrimary: true },
  { icon: BarChart3, label: "Reportes", href: "/app/dashboard" },
];

export function MobileBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 z-40 w-full">
      <div className="rounded-t-2xl border-t bg-white px-6 pb-1 pt-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:bg-card">
        <div className="flex items-start justify-around">
          {navItems.map((item) => {
            const isActive = item.href === pathname;

            if (item.isPrimary) {
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

            return (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className="relative flex flex-col items-center px-6 py-1"
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
