"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  Check,
  ArrowRight,
  Barcode,
  Package,
  BarChart3,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/lib/store-context";

export default function LandingPage() {
  const { user, isSessionLoading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isSessionLoading && user) {
      router.replace("/app");
    }
  }, [isSessionLoading, user, router]);

  if (isSessionLoading || user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <BrandLogo className="h-8" />

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#como-funciona"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Como funciona
            </a>
            <a
              href="#funcionalidades"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Funcionalidades
            </a>
            <a
              href="#precios"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Planes
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Iniciar sesion
            </Link>
            <Link
              href="/register"
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Crear cuenta
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </nav>

        {mobileMenuOpen ? (
          <div className="space-y-2 border-t px-4 py-3 md:hidden">
            <a
              href="#como-funciona"
              className="block rounded-md px-3 py-2 hover:bg-muted"
            >
              Como funciona
            </a>
            <a
              href="#funcionalidades"
              className="block rounded-md px-3 py-2 hover:bg-muted"
            >
              Funcionalidades
            </a>
            <a
              href="#precios"
              className="block rounded-md px-3 py-2 hover:bg-muted"
            >
              Planes
            </a>
            <Link
              href="/register"
              className="mt-2 block rounded-md bg-foreground px-3 py-2 text-center text-background"
            >
              Empezar prueba gratis
            </Link>
          </div>
        ) : null}
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
            Incluye 15 dias gratis, sin compromiso
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Vende mas rapido y controla el stock en tiempo real
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            StockLine simplifica tu operacion diaria: ventas, inventario y
            reportes en una sola pantalla.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-background"
            >
              Empezar prueba gratis <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-md border px-5 hover:bg-muted"
            >
              Ver demo
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Vista rapida del sistema
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <Barcode className="h-4 w-4" /> Escanear producto...
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm">Total del carrito</p>
              <p className="text-3xl font-bold">$42.300</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm"
              >
                Efectivo
              </button>
              <button
                type="button"
                className="rounded-md bg-foreground px-3 py-2 text-sm text-background"
              >
                Cobrar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-y bg-muted/30 px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold">Como funciona</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Paso 1</p>
              <p className="mt-1 font-semibold">
                Escaneas y agregas al carrito
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Paso 2</p>
              <p className="mt-1 font-semibold">Cobras en segundos</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Paso 3</p>
              <p className="mt-1 font-semibold">
                El stock se actualiza automaticamente
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold">Funcionalidades clave</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-5">
              <Package className="h-5 w-5" />
              <p className="mt-3 font-semibold">Stock en tiempo real</p>
            </div>
            <div className="rounded-xl border p-5">
              <Barcode className="h-5 w-5" />
              <p className="mt-3 font-semibold">POS con codigo de barras</p>
            </div>
            <div className="rounded-xl border p-5">
              <BarChart3 className="h-5 w-5" />
              <p className="mt-3 font-semibold">Reportes accionables</p>
            </div>
          </div>
        </div>
      </section>

      <section id="precios" className="border-y bg-muted/30 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold">Planes</h2>
          <p className="mt-3 text-center text-muted-foreground">
            Moneda ARS. Incluye 15 dias gratis, sin compromiso.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border bg-card p-8">
              <h3 className="text-2xl font-semibold">Mensual</h3>
              <p className="mt-4 text-5xl font-bold">$15.000</p>
              <p className="text-muted-foreground">ARS / mes</p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Ventas ilimitadas
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Soporte incluido
                </li>
              </ul>
            </article>

            <article className="rounded-2xl border border-emerald-300 bg-card p-8">
              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                Ahorras 2 meses
              </span>
              <h3 className="mt-3 text-2xl font-semibold">Anual</h3>
              <p className="mt-4 text-5xl font-bold">$150.000</p>
              <p className="text-muted-foreground">ARS / ano</p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Equivale a 10 meses
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Mismas funciones completas
                </li>
              </ul>
            </article>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-md bg-foreground px-6 text-background"
            >
              Empezar prueba gratis
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Incluye 15 dias gratis, sin compromiso.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
        © 2026 StockLine
      </footer>
    </div>
  );
}
