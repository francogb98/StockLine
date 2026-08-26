"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/lib/store-context";
import { LandingNavbar } from "@/components/landing-navbar";
import { PromoBar } from "@/components/promo-bar";
import { SectionReveal } from "@/components/animations/section-reveal";
import { FadeUp } from "@/components/animations/fade-up";
import PricingSection from "./PlanesPrueba";
import HowItWorksSection from "./ComoFunciona";
import FeaturesSection from "./Features";
import FAQSection from "./FAQSection";
import FinalCTA from "./FinalCTA";

export default function LandingPage() {
  const { user, isSessionLoading, loginAsDemo } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isSessionLoading && user) {
      router.replace("/app");
    }
  }, [isSessionLoading, user, router]);

  const [promoVisible, setPromoVisible] = useState(true);

  const handlePromoDismiss = useCallback(() => {
    setPromoVisible(false);
  }, []);

  if (isSessionLoading || user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PromoBar visible={promoVisible} onDismiss={handlePromoDismiss} />
      <LandingNavbar promoVisible={promoVisible} />

      {/* ─── Hero ─── */}
      <section
        className="relative mx-auto max-w-6xl px-4 pt-20 pb-12 md:pt-28 md:pb-16 lg:pt-32 lg:pb-16"
        style={{
          minHeight: promoVisible
            ? "calc(100vh - 6.25rem)"
            : "calc(100vh - 3.5rem)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.25fr] lg:items-start lg:gap-12">
          <div className="flex flex-col">
            <FadeUp delay={0.16} y={24}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.15]">
                Vendé más rápido y
                <br />
                <span className="text-primary">controlá tu stock</span>
                <br />
                en tiempo real
              </h1>
            </FadeUp>

            <FadeUp delay={0.24} y={20}>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                StockLine simplifica tu operación diaria: ventas, inventario y
                reportes en una sola pantalla. Todo lo que necesitás para
                gestionar tu negocio desde el navegador.
              </p>
            </FadeUp>

            <FadeUp delay={0.32} y={16}>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Sin instalación
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  PC, Tablet y Celular
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Soporte por WhatsApp
                </span>
              </div>
            </FadeUp>

            <FadeUp delay={0.4} y={20}>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/register?promo=LAUNCH50"
                  className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:brightness-90 hover:shadow-md active:scale-[0.98]"
                >
                  Comenzar gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </FadeUp>

            <FadeUp delay={0.46} y={12}>
              <div className="mt-3 flex flex-col gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 md:hidden">
                  <span>🎁</span>
                  <span>Oferta de lanzamiento — 15 días gratis + 50% OFF en los primeros 3 meses</span>
                </div>
                <p className="text-xs text-muted-foreground/70">
                  Sin tarjeta de crédito • Cancelá cuando quieras • Activación
                  inmediata
                </p>
              </div>
            </FadeUp>
          </div>

          <div className="hero-image-container">
            <img
              src="/hero-showcase.png"
              alt="StockLine Multiplatform ERP Ecosystem"
              className="hero-mockup-img"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* ─── Cómo funciona ─── */}
      <SectionReveal
        id="como-funciona"
        className="scroll-mt-28 border-y bg-muted/30 px-4 py-20 md:py-28"
      >
        <HowItWorksSection />
      </SectionReveal>

      <div id="funcionalidades" className="scroll-mt-28">
        <FeaturesSection />
      </div>

      <SectionReveal
        id="planes"
        className="scroll-mt-28 border-y bg-muted/30 px-4 py-20 md:py-28"
      >
        <PricingSection />
      </SectionReveal>

      <FAQSection />

      <FinalCTA />

      {/* ─── Footer ─── */}
      <SectionReveal className="px-4 py-12">
        <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <BrandLogo className="h-7" />
          <p className="text-xs text-muted-foreground">
            © 2026 StockLine. Todos los derechos reservados.
          </p>
        </footer>
      </SectionReveal>
    </div>
  );
}
