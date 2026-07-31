import { motion } from "framer-motion";
import { ScanLine, CreditCard, RefreshCw, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    stepPill: "Paso 1",
    title: "Escaneás y agregás al carrito",
    description:
      "Usá el lector de código de barras o buscá tus productos al instante sin perder tiempo.",
    icon: ScanLine,
    accentColor: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    number: "02",
    stepPill: "Paso 2",
    title: "Cobrás en segundos",
    description:
      "Aceptá efectivo, transferencia o Mercado Pago. Todo registrado en un solo lugar.",
    icon: CreditCard,
    accentColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    number: "03",
    stepPill: "Paso 3",
    title: "El stock se actualiza solo",
    description:
      "Cada venta descuenta el inventario al instante. Chau desfasajes y nunca más sin stock.",
    icon: RefreshCw,
    accentColor: "bg-purple-50 text-purple-600 border-purple-100",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-20 px-4 max-w-6xl mx-auto font-sans relative overflow-hidden">
      {/* Encabezado */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 inline-block mb-3">
          Flujo Ágil
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
          Tres pasos simples para controlar tu local
        </h2>
        <p className="text-gray-600 text-base sm:text-lg">
          Sin configuraciones complejas. Empezás a cobrar y gestionar tu
          inventario desde el primer minuto.
        </p>
      </div>

      {/* Grilla de Pasos con Conector Visual */}
      <div className="relative">
        {/* Línea conectora entre pasos (Solo visible en Desktop) */}
        <div
          className="hidden md:block absolute top-1/2 left-[12%] right-[12%] h-[2px] -translate-y-12 border-t-2 border-dashed border-gray-200 z-0"
          aria-hidden="true"
        />

        <div className="grid md:grid-cols-3 gap-8 relative z-10">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.15 }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-2xl p-8 border border-gray-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                <div>
                  {/* Encabezado de la Card: Icono + Número/Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border ${step.accentColor} shadow-sm group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md">
                        {step.stepPill}
                      </span>
                      <span className="text-2xl font-black text-gray-200 group-hover:text-gray-300 transition-colors">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {step.title}
                  </h3>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Flecha indicadora en mobile para dar sentido de dirección */}
                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center pt-6 -mb-2">
                    <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
