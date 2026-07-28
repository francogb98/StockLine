import {
  ShoppingCart,
  Package,
  ReceiptText,
  BarChart3,
  Wallet,
  UserCog,
  CreditCard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  viewId: string;
  label: string;
  icon: LucideIcon;
  adminOnly: boolean;
  sortOrder: number;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { viewId: "pos",            label: "Punto de Venta",    icon: ShoppingCart,    adminOnly: false, sortOrder: 0 },
  { viewId: "stock",          label: "Productos",         icon: Package,         adminOnly: false, sortOrder: 1 },
  { viewId: "daily-summary",  label: "Ventas",            icon: ReceiptText,     adminOnly: false, sortOrder: 2 },
  { viewId: "dashboard",      label: "Reportes",          icon: BarChart3,       adminOnly: true,  sortOrder: 3 },
  { viewId: "cash-sessions",  label: "Caja",              icon: Wallet,          adminOnly: true,  sortOrder: 4 },
  { viewId: "users",          label: "Usuarios",          icon: UserCog,         adminOnly: true,  sortOrder: 5 },
  { viewId: "subscription",   label: "Suscripción",       icon: CreditCard,      adminOnly: false, sortOrder: 6 },
  { viewId: "settings",       label: "Configuración",     icon: Settings,        adminOnly: false, sortOrder: 7 },
];

export function getNavigationForRole(
  userRole: string,
  cashControlEnabled: boolean,
): NavigationItem[] {
  return NAVIGATION_ITEMS.filter((item) => {
    if (item.adminOnly && userRole !== "admin") return false;
    if (item.viewId === "cash-sessions" && !cashControlEnabled) return false;
    return true;
  });
}
