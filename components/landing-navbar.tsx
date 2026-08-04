"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function LandingNavbar({ promoVisible }: { promoVisible?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [mobileMenuOpen]);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-border/40 bg-background/80 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      } ${promoVisible ? "top-11" : "top-0"}`}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <BrandLogo className="h-7" />

        <div className="hidden items-center gap-8 md:flex">
          <NavLink href="#como-funciona">Cómo funciona</NavLink>
          <NavLink href="#funcionalidades">Funcionalidades</NavLink>
          <NavLink href="#planes">Planes</NavLink>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:brightness-90 hover:shadow-md active:scale-[0.98]"
          >
            Crear cuenta
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="relative z-50 md:hidden"
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5 transition-transform duration-200" />
          ) : (
            <Menu className="h-5 w-5 transition-transform duration-200" />
          )}
        </button>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden border-t border-border/40 bg-background shadow-lg md:hidden"
          >
            <div className="space-y-1.5 px-4 py-4">
              <MobileNavLink href="#como-funciona" onClick={() => setMobileMenuOpen(false)}>
                Cómo funciona
              </MobileNavLink>
              <MobileNavLink href="#funcionalidades" onClick={() => setMobileMenuOpen(false)}>
                Funcionalidades
              </MobileNavLink>
              <MobileNavLink href="#planes" onClick={() => setMobileMenuOpen(false)}>
                Planes
              </MobileNavLink>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-4 block rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:brightness-90 active:scale-[0.98]"
              >
                Comenzar gratis
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg border border-border bg-background px-3 py-2.5 text-center text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted active:scale-[0.98]"
              >
                Iniciar sesión
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="relative text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
    >
      {children}
    </a>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
    >
      {children}
    </a>
  );
}
