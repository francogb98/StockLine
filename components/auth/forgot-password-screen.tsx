"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AuthLayout } from "./auth-layout";
import { AuthHeroShowcase } from "./auth-hero-showcase";
import { AuthCard } from "./auth-card";
import { BrandLogo } from "@/components/brand-logo";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Ingresá tu correo electrónico");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email inválido");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setIsLoading(false);
        setError(data.error || "Error al enviar el correo. Intentá nuevamente.");
        return;
      }

      setSubmitted(true);
    } catch {
      setIsLoading(false);
      setError("Error de conexión. Intentá nuevamente.");
    }
  };

  if (submitted) {
    return (
      <>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40"
        >
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-foreground">Revisá tu correo</h1>
          <p className="mt-2 text-muted-foreground">
            Si el correo está registrado, vas a recibir un enlace para restablecer tu
            contraseña. El enlace expira en 1 hora.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Volver al inicio de sesión
          </Link>
        </motion.div>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-foreground/80"
        >
          Correo electrónico
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            id="email"
            data-testid="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(
              "h-11 w-full rounded-xl border bg-background/50 pl-10 pr-4 text-sm backdrop-blur-sm",
              "placeholder:text-muted-foreground/50",
              "focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/15",
              "hover:border-border/80",
              "transition-all duration-300 ease-[cubic-bezier(0.25\,0.1\,0.25\,1)]",
            )}
            placeholder="juan@empresa.com"
            autoComplete="email"
          />
        </div>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-destructive"
        >
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        data-testid="forgot-submit"
        disabled={isLoading}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground",
          "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)]",
          "hover:bg-primary/90 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.18)] hover:-translate-y-px",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)]",
          "transition-all duration-300 ease-[cubic-bezier(0.25\,0.1\,0.25\,1)]",
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          "Enviar enlace"
        )}
      </button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.5,
          delay: 0.2,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        className="text-center text-sm text-muted-foreground"
      >
        ¿Ya te acordaste?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Iniciar sesión
        </Link>
      </motion.p>
    </form>
  );
}

export function ForgotPasswordScreen() {
  return (
    <AuthLayout
      left={<AuthHeroShowcase />}
      right={
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="space-y-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.05,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="flex justify-center md:hidden"
          >
            <Link href="/">
              <BrandLogo className="h-16" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.05,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="text-center md:text-left space-y-1"
          >
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              ¿Olvidaste tu contraseña?
            </h1>
            <p className="text-sm text-muted-foreground/70">
              Ingresá tu correo electrónico y te enviaremos un enlace para
              restablecer tu contraseña.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.12,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <AuthCard>
              <ForgotPasswordForm />
            </AuthCard>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.35,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="text-center text-xs text-muted-foreground/50"
          >
            &copy; 2026 StockLine. Todos los derechos reservados.
          </motion.p>
        </motion.div>
      }
    />
  );
}
