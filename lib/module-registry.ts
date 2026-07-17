import {
  Package,
  BarChart3,
  Wallet,
  ShoppingCart,
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
  { viewId: "pos", label: "Punto de Venta", icon: ShoppingCart, adminOnly: false, sortOrder: 0 },
  { viewId: "stock", label: "Stock", icon: Package, adminOnly: false, sortOrder: 1 },
  { viewId: "dashboard", label: "Reportes", icon: BarChart3, adminOnly: true, sortOrder: 3 },
  { viewId: "cash-sessions", label: "Caja", icon: Wallet, adminOnly: true, sortOrder: 4 },
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
