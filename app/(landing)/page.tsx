"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Barcode,
  Package,
  BarChart3,
  ScanLine,
  Zap,
  RefreshCw,
  Check,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/lib/store-context";
import { LandingNavbar } from "@/components/landing-navbar";
import { SectionReveal } from "@/components/animations/section-reveal";
import { FadeUp } from "@/components/animations/fade-up";
import { StaggerContainer } from "@/components/animations/stagger-container";
import { AnimatedCard } from "@/components/animations/animated-card";

export default function LandingPage() {
  const { user, isSessionLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isSessionLoading && user) {
      router.replace("/app");
    }
  }, [isSessionLoading, user, router]);

  if (isSessionLoading || user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      {/* ─── Hero ─── */}
      <section className="relative mx-auto max-w-6xl px-4 pt-28 pb-16 md:pt-36 md:pb-24 lg:pt-40 lg:pb-32">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <FadeUp delay={0} y={20}>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Incluye 15 días gratis — sin compromiso
              </span>
            </FadeUp>

            <FadeUp delay={0.1} y={24}>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Vendé más rápido y
                <br />
                <span className="text-primary">controlá tu stock</span>
                <br />
                en tiempo real
              </h1>
            </FadeUp>

            <FadeUp delay={0.2} y={20}>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
                StockLine simplifica tu operación diaria: ventas, inventario y
                reportes en una sola pantalla. Todo lo que necesitás para
                gestionar tu negocio desde el navegador.
              </p>
            </FadeUp>

            <FadeUp delay={0.3} y={20}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center rounded-lg bg-foreground px-6 text-sm font-medium text-background shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                >
                  Empezar prueba gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center rounded-lg border px-6 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:bg-muted active:scale-[0.98]"
                >
                  Ver demo
                </Link>
              </div>
            </FadeUp>
          </div>

          <FadeUp delay={0.35} y={30}>
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b pb-3">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs text-muted-foreground">
                  StockLine POS
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3.5 py-2.5 text-sm"
                >
                  <Barcode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Escanear producto...
                  </span>
                  <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    F8
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.65 }}
                  className="rounded-lg border p-4"
                >
                  <p className="text-xs text-muted-foreground">
                    Total del carrito
                  </p>
                  <p className="text-3xl font-bold tracking-tight">$42.300</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                  className="grid grid-cols-2 gap-2"
                >
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-muted active:scale-[0.98]"
                  >
                    Efectivo
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-foreground px-3 py-2.5 text-sm font-medium text-background transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Cobrar
                  </button>
                </motion.div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ─── Cómo funciona ─── */}
      <SectionReveal className="border-y bg-muted/30 px-4 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Cómo funciona
            </h2>
          </FadeUp>
          <FadeUp delay={0.15}>
            <p className="mt-3 max-w-lg text-muted-foreground">
              Tres pasos simples para empezar a vender y controlar tu stock al
              instante.
            </p>
          </FadeUp>

          <StaggerContainer
            className="mt-10 grid gap-5 md:grid-cols-3"
            staggerDelay={0.12}
          >
            <AnimatedCard className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-shadow duration-300 hover:shadow-md">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ScanLine className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Paso 1
              </span>
              <h3 className="mt-1.5 font-semibold">
                Escaneás y agregás al carrito
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Usá el lector de código de barras o buscá productos al instante.
              </p>
            </AnimatedCard>

            <AnimatedCard className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-shadow duration-300 hover:shadow-md">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Paso 2
              </span>
              <h3 className="mt-1.5 font-semibold">Cobrás en segundos</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Efectivo, transferencia o mercado pago. Todo integrado.
              </p>
            </AnimatedCard>

            <AnimatedCard className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-shadow duration-300 hover:shadow-md">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Paso 3
              </span>
              <h3 className="mt-1.5 font-semibold">
                El stock se actualiza automáticamente
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Cada venta descuenta stock al instante. Nunca más te quedás sin
                producto.
              </p>
            </AnimatedCard>
          </StaggerContainer>
        </div>
      </SectionReveal>

      {/* ─── Funcionalidades ─── */}
      <SectionReveal className="px-4 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Todo lo que necesitás para gestionar tu negocio
            </h2>
          </FadeUp>
          <FadeUp delay={0.15}>
            <p className="mt-3 max-w-lg text-muted-foreground">
              Funcionalidades diseñadas para que puedas vender más y preocuparte
              menos.
            </p>
          </FadeUp>

          <StaggerContainer
            className="mt-10 grid gap-5 md:grid-cols-3"
            staggerDelay={0.1}
          >
            <AnimatedCard className="group rounded-xl border bg-card p-6 transition-shadow duration-300 hover:shadow-md">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Stock en tiempo real</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Sabé exactamente qué tenés en cada momento. Sin cálculos
                manuales ni planillas.
              </p>
            </AnimatedCard>

            <AnimatedCard className="group rounded-xl border bg-card p-6 transition-shadow duration-300 hover:shadow-md">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Barcode className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold">POS con código de barras</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Vendé rápido con escáner o buscador. Carrito al instante, sin
                demoras.
              </p>
            </AnimatedCard>

            <AnimatedCard className="group rounded-xl border bg-card p-6 transition-shadow duration-300 hover:shadow-md">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold">Reportes accionables</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Datos claros para tomar decisiones: productos más vendidos,
                márgenes y más.
              </p>
            </AnimatedCard>
          </StaggerContainer>
        </div>
      </SectionReveal>

      {/* ─── Planes ─── */}
      <SectionReveal className="border-y bg-muted/30 px-4 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
              Planes simples, sin sorpresas
            </h2>
          </FadeUp>
          <FadeUp delay={0.15}>
            <p className="mt-3 text-center text-muted-foreground">
              Precios en ARS. Todos los planes incluyen 15 días gratis, sin
              compromiso.
            </p>
          </FadeUp>

          <StaggerContainer
            className="mt-10 grid gap-6 lg:grid-cols-2 lg:mx-auto lg:max-w-3xl"
            staggerDelay={0.15}
          >
            <AnimatedCard
              delay={0}
              className="relative rounded-2xl border bg-card p-8 transition-shadow duration-300 hover:shadow-lg"
            >
              <h3 className="text-xl font-semibold">Mensual</h3>
              <p className="mt-4">
                <span className="text-5xl font-bold tracking-tight">
                  $15.000
                </span>
                <span className="ml-1 text-sm text-muted-foreground">
                  / mes
                </span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Ventas ilimitadas</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Hasta 500 productos</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Soporte por email</span>
                </li>
              </ul>
              <Link
                href="/register"
                className="mt-8 flex h-11 w-full items-center justify-center rounded-lg border text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:bg-muted active:scale-[0.98]"
              >
                Elegir mensual
              </Link>
            </AnimatedCard>

            <AnimatedCard
              delay={0}
              className="relative rounded-2xl border-2 border-primary/30 bg-card p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg"
            >
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Ahorrás 2 meses
              </span>
              <h3 className="mt-4 text-xl font-semibold">Anual</h3>
              <p className="mt-4">
                <span className="text-5xl font-bold tracking-tight">
                  $150.000
                </span>
                <span className="ml-1 text-sm text-muted-foreground">
                  / año
                </span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Todo lo del plan mensual</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Stock ilimitado</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Soporte prioritario</span>
                </li>
              </ul>
              <Link
                href="/register"
                className="mt-8 flex h-11 w-full items-center justify-center rounded-lg bg-foreground text-sm font-medium text-background shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
              >
                Elegir anual
              </Link>
            </AnimatedCard>
          </StaggerContainer>
        </div>
      </SectionReveal>

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
