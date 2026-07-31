"use client";

import { motion } from "framer-motion";
import {
  ShoppingCart,
  Wallet,
  BarChart3,
  TrendingUp,
  Package,
  AlertTriangle,
  FileText,
  Users,
  RefreshCw,
  Command,
  ClipboardList,
} from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
  badge: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
}

const features: Feature[] = [
  {
    title: "Ventas rápidas",
    description:
      "Permite registrar ventas en segundos desde una interfaz optimizada para comercios.",
    icon: ShoppingCart,
    badge: "Hasta 50 ventas/día",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100",
    darkBgColor: "dark:bg-blue-900/30",
  },
  {
    title: "Control de Caja",
    description:
      "Abrí, cerrá y controlá los movimientos de caja fácilmente.",
    icon: Wallet,
    badge: "$12,450",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100",
    darkBgColor: "dark:bg-emerald-900/30",
  },
  {
    title: "Importación desde Excel",
    description:
      "Importá cientos de productos en pocos segundos utilizando un archivo Excel.",
    icon: FileText,
    badge: "Ahorrá horas",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100",
    darkBgColor: "dark:bg-violet-900/30",
  },
  {
    title: "Reportes inteligentes",
    description:
      "Visualizá ventas diarias, semanales y mensuales.",
    icon: BarChart3,
    badge: "12% vs mes anterior",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100",
    darkBgColor: "dark:bg-orange-900/30",
  },
  {
    title: "Control de Stock",
    description:
      "Gestioná el inventario en tiempo real.",
    icon: Package,
    badge: "142 productos",
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-100",
    darkBgColor: "dark:bg-sky-900/30",
  },
  {
    title: "Aviso de bajo stock",
    description:
      "Recibí alertas cuando un producto esté por agotarse.",
    icon: AlertTriangle,
    badge: "3 productos críticos",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100",
    darkBgColor: "dark:bg-rose-900/30",
  },
  {
    title: "Gestión de usuarios",
    description:
      "Creá empleados y administradores con distintos permisos.",
    icon: Users,
    badge: "5 usuarios activos",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100",
    darkBgColor: "dark:bg-indigo-900/30",
  },
  {
    title: "Productos más vendidos",
    description:
      "Descubrí cuáles son los productos que mejor funcionan.",
    icon: TrendingUp,
    badge: "Top 3: 45% de ventas",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100",
    darkBgColor: "dark:bg-amber-900/30",
  },
  {
    title: "Asistente integrado",
    description:
      "Accedé rápidamente a las acciones más utilizadas desde un único lugar.",
    icon: Command,
    badge: "Ctrl + K",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100",
    darkBgColor: "dark:bg-cyan-900/30",
  },
  {
    title: "Devoluciones",
    description:
      "Registrá devoluciones de forma simple y mantené actualizado el stock.",
    icon: RefreshCw,
    badge: "Última: ayer",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100",
    darkBgColor: "dark:bg-purple-900/30",
  },
  {
    title: "Resumen del día",
    description:
      "Consultá rápidamente las ventas realizadas durante la jornada.",
    icon: ClipboardList,
    badge: "$2,340",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100",
    darkBgColor: "dark:bg-teal-900/30",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export function LandingFeatures() {
  return (
    <section className="px-4 py-20 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-[700px] text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl"
          >
            Todo lo que necesitás para administrar tu negocio.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.1,
            }}
            className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Desde las ventas diarias hasta el control de stock y los reportes,
            StockLine reúne todas las herramientas que necesitás en un solo
            lugar.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-6"
        >
          {/* Ventas rápidas — col-span-2 */}
          <FeatureCard feature={features[0]} className="lg:col-span-2 lg:row-span-1" />

          {/* Caja — col-span-1 */}
          <FeatureCard feature={features[1]} className="lg:col-span-1" />

          {/* Excel — col-span 2 */}
          <FeatureCard feature={features[2]} className="lg:col-span-2 lg:row-span-1" highlighted />

          {/* Reportes — col-span 1 */}
          <FeatureCard feature={features[3]} className="lg:col-span-1" />

          {/* Stock — col-span 1 */}
          <FeatureCard feature={features[4]} className="lg:col-span-1" />

          {/* Bajo stock — col-span 1 */}
          <FeatureCard feature={features[5]} className="lg:col-span-1" />

          {/* Usuarios — col-span 1 */}
          <FeatureCard feature={features[6]} className="lg:col-span-1" />

          {/* Más vendidos — col-span 2 */}
          <FeatureCard feature={features[7]} className="lg:col-span-2" />

          {/* Asistente — col-span 1 */}
          <FeatureCard feature={features[8]} className="lg:col-span-1" />

          {/* Devoluciones — col-span 1 */}
          <FeatureCard feature={features[9]} className="lg:col-span-1" />

          {/* Resumen — col-span 1 */}
          <FeatureCard feature={features[10]} className="lg:col-span-1" />
        </motion.div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  feature: Feature;
  className?: string;
  highlighted?: boolean;
}

function FeatureCard({ feature, className, highlighted }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{
        y: -6,
        boxShadow: "0 20px 60px -12px rgba(0,0,0,0.08)",
        transition: { duration: 0.25, ease: "easeOut" },
      }}
      className={`group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover:border-border/80 sm:p-7 ${
        highlighted
          ? "border-primary/20 shadow-sm ring-1 ring-primary/5"
          : "shadow-sm"
      } ${className ?? ""}`}
    >
      {highlighted && (
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      )}

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.bgColor} ${feature.darkBgColor}`}
          >
            <Icon className={`h-6 w-6 ${feature.color}`} />
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full border bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm`}
          >
            {feature.badge === "Ctrl + K" && (
              <kbd className="flex size-3.5 items-center justify-center rounded border border-border bg-muted text-[9px] font-semibold">
                ⌘
              </kbd>
            )}
            {feature.badge}
          </span>
        </div>

        <div>
          <h3 className="text-base font-semibold leading-snug">{feature.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {feature.description}
          </p>
        </div>
      </div>

      {highlighted && (
        <div className="absolute bottom-0 left-0 right-0 z-0 h-24 bg-gradient-to-t from-primary/[0.02] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      )}
    </motion.div>
  );
}
