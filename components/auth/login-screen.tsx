"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2, Eye, EyeOff, LogIn, Check } from "lucide-react"
import { useAuth } from "@/lib/store-context"
import { cn } from "@/lib/utils"
import { AuthLayout } from "./auth-layout"
import { AuthBranding } from "./auth-branding"
import { AuthCard } from "./auth-card"
import { PendingCashSessionDialog } from "@/components/cash/pending-cash-session-dialog"
import Link from "next/link"

interface LoginScreenProps {
  onLoginSuccess?: () => void
}

function LoginForm({ onLoginSuccess }: { onLoginSuccess?: () => void }) {
  const { login, isLoading, pendingCashSession, clearPendingCashSession } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPendingSession, setShowPendingSession] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError("Por favor ingresa email y contraseña")
      return
    }

    const result = await login(email, password)
    if (result.success) {
      if (result.pendingCashSession) {
        setShowPendingSession(true)
      } else {
        onLoginSuccess?.()
      }
    } else {
      setError("Credenciales inválidas")
    }
  }

  const handlePendingClosed = () => {
    setShowPendingSession(false)
    clearPendingCashSession()
    onLoginSuccess?.()
  }

  const handlePendingDismiss = () => {
    setShowPendingSession(false)
    clearPendingCashSession()
    onLoginSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground/80">
          Email
        </label>
        <input
          id="email"
          data-testid="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(
            "h-11 w-full rounded-xl border bg-background/50 px-4 text-sm backdrop-blur-sm",
            "placeholder:text-muted-foreground/50",
            "focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/15",
            "hover:border-border/80",
            "transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          )}
          placeholder="admin@techmart.com"
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground/80">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            data-testid="login-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(
              "h-11 w-full rounded-xl border bg-background/50 px-4 pr-11 text-sm backdrop-blur-sm",
              "placeholder:text-muted-foreground/50",
              "focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/15",
              "hover:border-border/80",
              "transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
            )}
            placeholder="••••••••"
            autoComplete="current-password"
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
        data-testid="login-submit"
        disabled={isLoading}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground",
          "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)]",
          "hover:bg-primary/90 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.18)] hover:-translate-y-px",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)]",
          "transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Ingresando...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            Ingresar
          </>
        )}
      </button>

      <div className="rounded-xl bg-muted/20 p-3">
        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground/50">
          Credenciales de prueba:
        </p>
        <div className="space-y-0.5 text-[11px] text-muted-foreground/50">
          <p>
            <strong className="text-foreground/50">Admin:</strong>{" "}
            admin@techmart.com
          </p>
          <p>
            <strong className="text-foreground/50">Empleado:</strong>{" "}
            empleado@techmart.com
          </p>
          <p>
            <strong className="text-foreground/50">Contraseña:</strong>{" "}
            password123
          </p>
        </div>
      </div>

      {pendingCashSession && (
        <PendingCashSessionDialog
          open={showPendingSession}
          session={pendingCashSession}
          onClose={handlePendingDismiss}
          onSessionClosed={handlePendingClosed}
        />
      )}
    </form>
  )
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  return (
    <AuthLayout
      left={<AuthBranding />}
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
            transition={{ duration: 0.5, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center md:text-left space-y-1"
          >
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Bienvenido de nuevo
            </h1>
            <p className="text-sm text-muted-foreground/70">
              Iniciá sesión para seguir gestionando tu negocio.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <AuthCard>
              <LoginForm onLoginSuccess={onLoginSuccess} />
            </AuthCard>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center text-sm text-muted-foreground"
          >
            ¿No tenés cuenta?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Crear cuenta
            </Link>
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground/40"
          >
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Acceso desde cualquier dispositivo
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Datos protegidos
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Copias de seguridad automáticas
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center text-xs text-muted-foreground/50"
          >
            &copy; 2026 StockLine. Todos los derechos reservados.
          </motion.p>
        </motion.div>
      }
    />
  )
}
