"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, ShoppingBag } from "lucide-react";
import { useData } from "@/lib/store-context";
import { formatCurrency } from "@/lib/mock-data";

interface DailySalesBannerProps {
  variant?: "desktop" | "mobile";
}

export function DailySalesBanner({ variant = "desktop" }: DailySalesBannerProps) {
  const { getTodaySales } = useData();
  const router = useRouter();

  const stats = useMemo(() => {
    const todaySales = getTodaySales();
    const completedSales = todaySales.filter((s) => s.status === "completed");
    const totalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0);
    const totalItems = completedSales.reduce(
      (sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    return {
      salesCount: completedSales.length,
      totalRevenue,
      totalItems,
    };
  }, [getTodaySales]);

  const handleClick = () => {
    router.push("/app/daily-summary");
  };

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-3 px-3 py-1 transition-colors hover:bg-white/10"
      >
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
          <span className="text-xs font-medium text-emerald-300">Hoy</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-white tabular-nums">
            {formatCurrency(stats.totalRevenue)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-white/60">
          <ShoppingBag className="h-3 w-3" />
          <span className="text-xs tabular-nums">{stats.salesCount}</span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex cursor-pointer items-center gap-2.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
    >
      <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      <span className="text-emerald-700 dark:text-emerald-300">Hoy</span>
      <span className="font-bold text-emerald-800 tabular-nums dark:text-emerald-200">
        {formatCurrency(stats.totalRevenue)}
      </span>
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <ShoppingBag className="h-3 w-3" />
        <span className="tabular-nums">{stats.salesCount}</span>
      </span>
    </button>
  );
}
