import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="py-16 px-4 max-w-6xl mx-auto font-sans">
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 sm:p-12 md:p-16 border border-slate-800 shadow-2xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Empezá a ordenar tu local hoy mismo
          </h2>
          <p className="text-slate-300 text-base sm:text-lg mb-8 leading-relaxed">
            Unite a los comercios que optimizan sus ventas y controlan su stock
            sin complicaciones.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-8 text-base font-semibold text-white shadow-lg transition-all hover:bg-blue-500 active:scale-[0.98]"
            >
              Probar 15 días gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>

            <a
              href="https://wa.me/+5493855956688"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 px-6 text-base font-medium text-slate-200 transition-all hover:bg-slate-800 hover:text-white active:scale-[0.98]"
            >
              <MessageCircle className="mr-2 h-5 w-5 text-emerald-400" />
              Consultar por WhatsApp
            </a>
          </div>

          <p className="mt-6 text-xs text-slate-400">
            Sin tarjeta de crédito • Configuración en 2 minutos • Soporte
            incluido
          </p>
        </div>
      </div>
    </section>
  );
}
