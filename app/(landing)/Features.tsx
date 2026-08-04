import {
  Zap,
  Wallet,
  FileSpreadsheet,
  BarChart3,
  Boxes,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

// 1. Las 6 funcionalidades estrella (Cards visuales)
const mainFeatures = [
  {
    title: "Ventas rápidas",
    description:
      "Registrá ventas en segundos desde una interfaz optimizada para comercios.",
    badge: "Hasta 50 ventas/día",
    icon: Zap,
  },
  {
    title: "Control de Caja",
    description:
      "Abrí, cerrá y monitoreá los movimientos de tu caja diariamente con precisión.",
    badge: "$12.450",
    icon: Wallet,
  },
  {
    title: "Control de Stock",
    description:
      "Gestioná el inventario en tiempo real. Cada venta descuenta automáticamente.",
    badge: "142 productos",
    icon: Boxes,
  },
  {
    title: "Aviso de bajo stock",
    description:
      "Recibí alertas automáticas cuando un producto esté por agotarse.",
    badge: "3 críticos",
    icon: CheckCircle2,
  },
  {
    title: "Importación desde Excel",
    description:
      "Cargá cientos de productos en pocos segundos subiendo tu planilla.",
    badge: "Ahorrá horas",
    icon: FileSpreadsheet,
  },
  {
    title: "Reportes Inteligentes",
    description:
      "Visualizá ventas diarias, semanales y mensuales en gráficos claros.",
    badge: "+12% vs anterior",
    icon: BarChart3,
  },
];

// 2. Funcionalidades secundarias (Lista compacta)
const secondaryFeatures = [
  {
    title: "Devoluciones y cambios",
    desc: "Registrá devoluciones manteniendo el stock al día.",
  },
  {
    title: "Gestión de empleados",
    desc: "Creá usuarios con distintos niveles de permisos.",
  },
  {
    title: "Asistente integrado",
    desc: "Accedé a atajos de teclado para vender más rápido.",
  },
  {
    title: "Resumen diario automático",
    desc: "Consultá el balance al finalizar la jornada.",
  },
  {
    title: "Productos más vendidos",
    desc: "Identificá tus ítems de mayor margen.",
  },
  {
    title: "Soporte e historial",
    desc: "Auditoría completa de movimientos pasados.",
  },
];

// Configuración de variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Tiempo de retraso entre la aparición de cada tarjeta
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.215, 0.61, 0.355, 1], // Ease out suave
    },
  },
};

export default function FeaturesSection() {
  return (
    <section className="py-20 px-4 max-w-6xl mx-auto font-sans">
      {/* Titular Animado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
          Todo lo que necesitás para administrar tu negocio
        </h2>
        <p className="text-gray-600 text-base sm:text-lg">
          Desde el control de stock hasta las ventas diarias, StockLine reúne
          todas las herramientas que necesitás en un solo lugar.
        </p>
      </motion.div>

      {/* GRILLA PRINCIPAL: 6 Cards con animación progresiva al hacer scroll */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
      >
        {mainFeatures.map((feat, i) => {
          const Icon = feat.icon;
          return (
            <motion.div
              key={i}
              //@ts-ignore
              variants={itemVariants}
              className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm hover:border-gray-300 hover:shadow-md transition-all flex flex-col justify-between relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Icon className="w-5 h-5" />
                  </div>
                  {/* Badge superior derecho */}
                  <span className="text-[11px] font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md border border-gray-200/60">
                    {feat.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feat.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {feat.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* BLOQUE SECUNDARIO: Animado al llegar a la parte inferior */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="bg-gray-50 rounded-2xl p-8 border border-gray-200/80"
      >
        <div className="text-center md:text-left mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            Y mucho más para simplificar tu día a día
          </h3>
          <p className="text-sm text-gray-600">
            Pequeños detalles pensados para que la gestión no sea una carga.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {secondaryFeatures.map((item, index) => (
            <motion.div
              key={index}
              //@ts-ignore
              variants={itemVariants}
              className="flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  {item.title}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
