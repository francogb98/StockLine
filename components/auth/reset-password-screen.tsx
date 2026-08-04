"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Link2Off } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ResetPasswordScreenProps {
  token: string;
}

type ResetStatus = "checking" | "invalid" | "valid";

export function ResetPasswordScreen({ token }: ResetPasswordScreenProps) {
  const [status, setStatus] = useState<ResetStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      if (!token.trim()) {
        setStatus("invalid");
        return;
      }

      try {
        const response = await fetch("/api/auth/reset-password/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        await response.json().catch(() => ({}));

        if (cancelled) return;

        if (!response.ok) {
          setStatus("invalid");
          return;
        }

        setStatus("valid");
      } catch {
        if (!cancelled) {
          setStatus("invalid");
        }
      }
    };

    validate();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setIsLoading(false);
        setError(data.error || "Error al restablecer la contraseña");
        return;
      }

      window.location.href = "/login?reset=success";
    } catch {
      setIsLoading(false);
      setError("Error de conexión. Intentá nuevamente.");
    }
  };

  if (status === "checking") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Validando enlace...</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <Link2Off className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          El enlace expiró o no es válido
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El enlace que usaste no es válido o ya expiró. Podés solicitar uno
          nuevo.
        </p>
        <div className="mt-8 space-y-4">
          <Link
            href="/forgot-password"
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground",
              "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)]",
              "hover:bg-primary/90 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.18)] hover:-translate-y-px",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "transition-all duration-300 ease-[cubic-bezier(0.25\,0.1\,0.25\,1)]",
            )}
          >
            Solicitar nuevo enlace
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Creá tu nueva contraseña
      </h1>
      <p className="mt-2 text-sm text-muted-foreground/70">
        Elegí una contraseña nueva para tu cuenta.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 text-left">
        <div className="space-y-1.5">
          <label
            htmlFor="new-password"
            className="text-sm font-medium text-foreground/80"
          >
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="new-password"
              data-testid="reset-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "h-11 w-full rounded-xl border bg-background/50 px-4 pr-11 text-sm backdrop-blur-sm",
                "placeholder:text-muted-foreground/50",
                "focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/15",
                "hover:border-border/80",
                "transition-all duration-300 ease-[cubic-bezier(0.25\,0.1\,0.25\,1)]",
              )}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirm-password"
            className="text-sm font-medium text-foreground/80"
          >
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              data-testid="reset-confirm"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(
                "h-11 w-full rounded-xl border bg-background/50 px-4 pr-11 text-sm backdrop-blur-sm",
                "placeholder:text-muted-foreground/50",
                "focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/15",
                "hover:border-border/80",
                "transition-all duration-300 ease-[cubic-bezier(0.25\,0.1\,0.25\,1)]",
              )}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
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
          data-testid="reset-submit"
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
              Cambiando...
            </>
          ) : (
            "Cambiar contraseña"
          )}
        </button>
      </form>
    </motion.div>
  );
}
