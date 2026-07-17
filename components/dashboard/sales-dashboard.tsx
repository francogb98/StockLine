"use client";

import React from "react";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useData } from "@/lib/store-context";
import { formatCurrency } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { SkeletonDashboard } from "@/components/ui/skeletons";
import { ErrorState } from "@/components/ui/error-state";
import { SaleDetailDialog } from "@/components/dashboard/sale-detail-dialog";
import type { Sale } from "@/lib/types";

type DateRange = "today" | "week" | "month";

const COLORS = [
  "hsl(217, 91%, 50%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(0, 72%, 51%)",
];

export function SalesDashboard() {
  const { sales, products, isDataLoading, isDataError, refreshData } = useData();
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    const now = new Date();
    const startDate = new Date();

    switch (dateRange) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    return sales.filter((sale) => new Date(sale.createdAt) >= startDate);
  }, [sales, dateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce(
      (sum, sale) => sum + Number(sale.total),
      0,
    );
    const totalSales = filteredSales.length;
    const totalItems = filteredSales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Payment method distribution
    const paymentMethods = filteredSales.reduce(
      (acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate previous period stats for trends
    const now = new Date();
    let previousStartDate = new Date(now);
    let currentStartDate = new Date(now);

    switch (dateRange) {
      case "today":
        previousStartDate.setHours(0, 0, 0, 0);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        currentStartDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        previousStartDate.setDate(now.getDate() - 14);
        currentStartDate.setDate(now.getDate() - 7);
        break;
      case "month":
        previousStartDate.setMonth(now.getMonth() - 2);
        currentStartDate.setMonth(now.getMonth() - 1);
        break;
    }

    const previousSales = sales.filter((sale) => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= previousStartDate && saleDate < currentStartDate;
    });

    const previousRevenue = previousSales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const previousSalesCount = previousSales.length;
    const previousItems = previousSales.reduce(
      (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const previousAvgTicket = previousSalesCount > 0 ? previousRevenue / previousSalesCount : 0;

    const revenueTrend = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const salesTrend = previousSalesCount > 0 ? ((totalSales - previousSalesCount) / previousSalesCount) * 100 : 0;
    const itemsTrend = previousItems > 0 ? ((totalItems - previousItems) / previousItems) * 100 : 0;
    const ticketTrend = previousAvgTicket > 0 ? ((avgTicket - previousAvgTicket) / previousAvgTicket) * 100 : 0;

    return {
      totalRevenue,
      totalSales,
      totalItems,
      avgTicket,
      paymentMethods,
      trends: {
        revenue: Math.round(revenueTrend * 10) / 10,
        sales: Math.round(salesTrend * 10) / 10,
        items: Math.round(itemsTrend * 10) / 10,
        ticket: Math.round(ticketTrend * 10) / 10,
      },
    };
  }, [filteredSales, sales, dateRange]);

  // Sales by day
  const salesByDay = useMemo(() => {
    const days: Record<
      string,
      { date: string; revenue: number; sales: number }
    > = {};

    filteredSales.forEach((sale) => {
      const date = new Date(sale.createdAt).toLocaleDateString("es-AR", {
        weekday: "short",
        day: "numeric",
      });
      if (!days[date]) {
        days[date] = { date, revenue: 0, sales: 0 };
      }
      days[date].revenue += sale.total;
      days[date].sales += 1;
    });

    return Object.values(days).reverse();
  }, [filteredSales]);

  // Sales by hour
  const salesByHour = useMemo(() => {
    const hours: Record<
      number,
      { hour: string; sales: number; revenue: number }
    > = {};

    for (let i = 9; i <= 21; i++) {
      hours[i] = { hour: `${i}:00`, sales: 0, revenue: 0 };
    }

    filteredSales.forEach((sale) => {
      const hour = new Date(sale.createdAt).getHours();
      if (hours[hour]) {
        hours[hour].sales += 1;
        hours[hour].revenue += sale.total;
      }
    });

    return Object.values(hours);
  }, [filteredSales]);

  // Top products
  const topProducts = useMemo(() => {
    const productSales: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.total;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredSales]);

  // Payment method data for pie chart
  const paymentData = useMemo(() => {
    const labels: Record<string, string> = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
    };
    return Object.entries(stats.paymentMethods).map(([method, count]) => ({
      name: labels[method] || method,
      value: count,
    }));
  }, [stats.paymentMethods]);

  if (isDataLoading) {
    return <SkeletonDashboard />;
  }

  if (isDataError) {
    return (
      <ErrorState
        message="Error al cargar los datos del dashboard"
        onRetry={refreshData}
      />
    );
  }

  return (
    <div className="h-full overflow-auto bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Dashboard de Ventas
            </h1>
            <p className="text-sm text-muted-foreground">
              Análisis y reportes de ventas
            </p>
          </div>

          {/* Date range selector */}
          <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
            {[
              { value: "today", label: "Hoy" },
              { value: "week", label: "Semana" },
              { value: "month", label: "Mes" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value as DateRange)}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  dateRange === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Ingresos Totales"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            trend={stats.trends.revenue}
            color="primary"
            testId="dashboard-revenue-card"
          />
          <StatCard
            title="Total Ventas"
            value={stats.totalSales.toString()}
            icon={ShoppingCart}
            trend={stats.trends.sales}
            color="success"
            testId="dashboard-sales-card"
          />
          <StatCard
            title="Items Vendidos"
            value={stats.totalItems.toString()}
            icon={Package}
            trend={stats.trends.items}
            color="warning"
          />
          <StatCard
            title="Ticket Promedio"
            value={formatCurrency(stats.avgTicket)}
            icon={Users}
            trend={stats.trends.ticket}
            color="primary"
          />
        </div>

        {/* Charts row 1 */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Sales by day */}
          <div className="col-span-2 rounded-lg border bg-card p-4">
            <h3 className="mb-4 font-semibold text-foreground">
              Ventas por Día
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByDay}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Ingresos",
                  ]}
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(217, 91%, 50%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Payment methods */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 font-semibold text-foreground">
              Métodos de Pago
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {paymentData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Sales by hour */}
          <div className="col-span-2 rounded-lg border bg-card p-4">
            <h3 className="mb-4 font-semibold text-foreground">
              <Clock className="mr-2 inline h-4 w-4" />
              Ventas por Horario
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={salesByHour}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="hour"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="Ventas"
                  stroke="hsl(217, 91%, 50%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(217, 91%, 50%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top products */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 font-semibold text-foreground">
              Productos Más Vendidos
            </h3>
            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Sin datos para este período
                </p>
              ) : (
                topProducts.map((product, index) => (
                  <div
                    key={product.name}
                    className="flex items-center justify-between rounded-md bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
                        style={{ backgroundColor: COLORS[index] }}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity} unidades
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(product.revenue)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent sales table */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold text-foreground">
            Ventas Recientes
          </h3>
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Hora</th>
                  <th className="pb-3 font-medium">Productos</th>
                  <th className="pb-3 font-medium">Método</th>
                  <th className="pb-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.slice(0, 10).map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 text-sm text-foreground">
                      {new Date(sale.createdAt).toLocaleDateString("es-AR")}
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {sale.items.length} item(s)
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-xs font-medium",
                          sale.paymentMethod === "cash" &&
                            "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
                          sale.paymentMethod === "card" &&
                            "bg-primary/10 text-primary",
                          sale.paymentMethod === "transfer" &&
                            "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
                        )}
                      >
                        {sale.paymentMethod === "cash"
                          ? "Efectivo"
                          : sale.paymentMethod === "card"
                            ? "Tarjeta"
                            : "Transferencia"}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold tabular-nums text-foreground">
                      {formatCurrency(sale.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SaleDetailDialog
        sale={selectedSale}
        open={!!selectedSale}
        onOpenChange={(open) => {
          if (!open) setSelectedSale(null);
        }}
      />
    </div>
  );
}

// Stat card component
function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  testId,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: number;
  color: "primary" | "success" | "warning";
  testId?: string;
}) {
  const isPositive = trend >= 0;
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    warning: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  };

  return (
    <div className="rounded-lg border bg-card p-4" data-testid={testId}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
        <span className={cn("rounded-full p-2", colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      <div className="mt-1 flex items-center gap-1 text-sm">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
        ) : (
          <TrendingDown className="h-4 w-4 text-destructive" />
        )}
        <span
          className={cn(
            "font-medium",
            isPositive ? "text-[hsl(var(--success))]" : "text-destructive",
          )}
        >
          {isPositive ? "+" : ""}
          {trend}%
        </span>
        <span className="text-muted-foreground">vs período anterior</span>
      </div>
    </div>
  );
}
