import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    question: '¿Necesito comprar un lector de código de barras o equipamiento especial?',
    answer: 'No es obligatorio. Podés usar tu lector de barras USB/Bluetooth actual, buscar productos manualmente por nombre/código, o incluso usar la cámara de un celular o tablet.',
  },
  {
    question: '¿Cómo funciona la prueba gratis de 15 días?',
    answer: 'Al registrarte tenés acceso completo a todas las funciones del Plan Pro durante 15 días sin costo. No pedimos tarjeta de crédito para empezar.',
  },
  {
    question: '¿Puedo usar StockLine en varios dispositivos al mismo tiempo?',
    answer: 'Sí. Podés abrir tu cuenta en la PC de la caja, en una tablet en el mostrador o monitorear las ventas desde tu celular estés donde estés.',
  },
  {
    question: '¿Qué pasa con mis datos si decido cancelar?',
    answer: 'Tus datos son 100% tuyos. Podés exportar tu catálogo de productos, inventario y registro de ventas a Excel en cualquier momento antes o después de cancelar.',
  },
  {
    question: '¿Qué medios de pago aceptan para la suscripción?',
    answer: 'Aceptamos transferencias bancarias, tarjetas de débito/crédito y Mercado Pago. La facturación puede ser mensual o anual con descuento.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 px-4 max-w-4xl mx-auto font-sans">
      <div className="text-center mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 inline-block mb-3">
          Resolvé tus dudas
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
          Preguntas frecuentes
        </h2>
        <p className="text-gray-600 text-base">
          Todo lo que necesitás saber sobre StockLine antes de empezar.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;

          return (
            <div
              key={index}
              className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden transition-all duration-200 shadow-sm"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full py-5 px-6 text-left flex justify-between items-center gap-4 hover:bg-gray-50/80 transition-colors"
              >
                <span className="font-semibold text-gray-900 text-base sm:text-lg">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    <div className="px-6 pb-5 pt-1 text-gray-600 text-sm sm:text-base border-t border-gray-100 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
