"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ScrollText,
  Building2,
  CreditCard,
  Ticket,
  AlertTriangle,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/super-admin",
    icon: LayoutDashboard,
  },
  {
    label: "Ver Audit Log",
    href: "/super-admin/audit",
    icon: ScrollText,
  },
  {
    label: "Gestión de Empresas",
    href: "/super-admin/companies",
    icon: Building2,
  },
  {
    label: "Suscripciones",
    href: "/super-admin/subscriptions",
    icon: CreditCard,
  },
  {
    label: "Cupones",
    href: "/super-admin/coupons",
    icon: Ticket,
  },
  {
    label: "Errores",
    href: "/super-admin/errors",
    icon: AlertTriangle,
  },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/super-admin") return pathname === "/super-admin";
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-[235px] shrink-0 border-r bg-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-[#0c1222] dark:to-slate-950 dark:border-slate-800/80">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
