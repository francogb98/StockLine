import { useState } from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section className="py-16 px-4 max-w-6xl mx-auto font-sans">
      {/* Encabezado */}
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
          Planes simples, sin sorpresas
        </h2>
        <p className="text-gray-600 text-base sm:text-lg mb-8">
          Todos los planes incluyen 15 días de prueba gratis, sin tarjeta de
          crédito.
        </p>

        {/* Toggle Mensual / Anual con animación de pastilla deslizante */}
        <div className="inline-flex items-center bg-gray-100 p-1.5 rounded-xl border border-gray-200 relative">
          {/* Opción Mensual */}
          <button
            onClick={() => setIsYearly(false)}
            className={`relative z-10 px-5 py-2 text-sm font-semibold transition-colors duration-200 ${
              !isYearly ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {!isYearly && (
              <motion.div
                layoutId="pricing-active-pill"
                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">Facturación Mensual</span>
          </button>

          {/* Opción Anual */}
          <button
            onClick={() => setIsYearly(true)}
            className={`relative z-10 px-5 py-2 text-sm font-semibold transition-colors duration-200 flex items-center gap-2 ${
              isYearly ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {isYearly && (
              <motion.div
                layoutId="pricing-active-pill"
                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              Facturación Anual
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Ahorrá 2 meses
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Grid de Cards de Precios */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
        {/* PLAN SIMPLE */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-gray-300 transition-all">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Plan Simple</h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md">
                Inicial
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Ideal para comercios o emprendimientos que recién están
              comenzando.
            </p>

            {/* Precio con micro-animación de cambio */}
            <div className="mb-6 min-h-[70px]">
              <div className="flex items-baseline gap-1">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isYearly ? "simple-yearly" : "simple-monthly"}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className="text-4xl font-extrabold text-gray-900 inline-block"
                  >
                    ${isYearly ? "100.000" : "10.000"}
                  </motion.span>
                </AnimatePresence>
                <span className="text-gray-500 text-sm font-medium">
                  {isYearly ? "/ año" : "/ mes"}
                </span>
              </div>

              {/* Leyenda mensual sutil */}
              <AnimatePresence>
                {isYearly && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-emerald-600 font-semibold mt-1 overflow-hidden"
                  >
                    Equivale a $8.333 / mes
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Lista de Features */}
            <ul className="space-y-3.5 mb-8 text-sm text-gray-700 border-t border-gray-100 pt-6">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>
                  <strong>Hasta 200 productos</strong> en catálogo
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Ventas ilimitadas</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Control de caja diario</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Soporte por email</span>
              </li>
            </ul>
          </div>

          <button className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-800 rounded-xl font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm">
            Elegir Plan Simple
          </button>
        </div>

        {/* PLAN PRO (DESTACADO) */}
        <div className="relative bg-white rounded-2xl p-8 border-2 border-blue-600 shadow-xl flex flex-col justify-between">
          {/* Badge 'Más elegido' */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
            Más elegido
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Plan Pro</h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md">
                Completo
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Para negocios en crecimiento que necesitan control total y sin
              límites.
            </p>

            {/* Precio con micro-animación de cambio */}
            <div className="mb-6 min-h-[70px]">
              <div className="flex items-baseline gap-1">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isYearly ? "pro-yearly" : "pro-monthly"}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className="text-4xl font-extrabold text-gray-900 inline-block"
                  >
                    ${isYearly ? "150.000" : "15.000"}
                  </motion.span>
                </AnimatePresence>
                <span className="text-gray-500 text-sm font-medium">
                  {isYearly ? "/ año" : "/ mes"}
                </span>
              </div>

              {/* Leyenda de ahorro sutil */}
              <AnimatePresence>
                {isYearly && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-emerald-600 font-semibold mt-1 overflow-hidden"
                  >
                    Equivale a $12.500 / mes (¡Ahorrás $30.000!)
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Lista de Features */}
            <ul className="space-y-3.5 mb-8 text-sm text-gray-700 border-t border-gray-100 pt-6">
              <li className="flex items-center gap-3 font-medium text-blue-950">
                <Check className="w-5 h-5 text-blue-600 shrink-0" />
                <span>
                  <strong>Stock ilimitado</strong>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Ventas ilimitadas</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Control de caja y Reportes inteligentes</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Importación / Exportación desde Excel</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Soporte prioritario</span>
              </li>
            </ul>
          </div>

          <button className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md">
            Elegir Plan Pro
          </button>
        </div>
      </div>
    </section>
  );
}
