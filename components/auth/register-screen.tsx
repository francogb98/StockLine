"use client"

import { useRef, useEffect, useCallback } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Building,
  MapPin,
  Phone,
  Check,
  Sparkles,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/store-context"
import { cn } from "@/lib/utils"
import { AuthLayout } from "./auth-layout"
import { AuthBranding } from "./auth-branding"
import { AuthCard } from "./auth-card"
import { motion } from "framer-motion"

interface RegisterScreenProps {
  onBack?: () => void
}

export function RegisterScreen({ onBack }: RegisterScreenProps) {
  const { login } = useAuth()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [storeName, setStoreName] = useState("")
  const [storeAddress, setStoreAddress] = useState("")
  const [storePhone, setStorePhone] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [progress, setProgress] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const progressRef = useRef<{ timer: ReturnType<typeof setTimeout> | null }>({
    timer: null,
  })

  const clearProgressTimer = useCallback(() => {
    if (progressRef.current.timer) {
      clearTimeout(progressRef.current.timer)
      progressRef.current.timer = null
    }
  }, [])

  const simulateProgress = useCallback(
    (onComplete: () => void) => {
      clearProgressTimer()
      setProgress(0)

      const step = (current: number) => {
        let next: number
        let delay: number

        if (current < 70) {
          next = current + 2
          delay = 20
        } else if (current < 90) {
          next = current + 1
          delay = 200
        } else {
          onComplete()
          return
        }

        setProgress(next)
        progressRef.current.timer = setTimeout(() => step(next), delay)
      }

      progressRef.current.timer = setTimeout(() => step(0), 20)
    },
    [clearProgressTimer],
  )

  useEffect(() => {
    return () => clearProgressTimer()
  }, [clearProgressTimer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name || !email || !password || !confirmPassword || !storeName) {
      setError("Por favor completa todos los campos requeridos")
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setIsSubmitting(true)

    let requestCompleted = false

    simulateProgress(() => {
      if (!requestCompleted) {
        setProgress(90)
      }
    })

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          storeName,
          storeAddress,
          storePhone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        requestCompleted = true
        clearProgressTimer()
        setProgress(0)
        setIsSubmitting(false)
        setError(data.error || "Error al registrar el usuario")
        return
      }

      requestCompleted = true
      clearProgressTimer()
      setProgress(100)

      setTimeout(() => {
        setSuccess(true)

        login(email, password).then((result) => {
          if (result.success) {
            setTimeout(() => {
              router.push("/app")
            }, 800)
          }
        })
      }, 600)
    } catch (err) {
      requestCompleted = true
      clearProgressTimer()
      setProgress(0)
      setIsSubmitting(false)
      setError("Error de conexión. Por favor intenta nuevamente.")
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <AuthCard>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40"
            >
              <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-center"
            >
              <h1 className="text-2xl font-bold text-foreground">
                ¡Registro exitoso!
              </h1>
              <p className="mt-2 text-muted-foreground">
                Tu cuenta ha sido creada correctamente. Redirigiendo...
              </p>
            </motion.div>
          </AuthCard>
        </div>
      </div>
    )
  }

  const fields = [
    {
      id: "name",
      label: "Nombre completo",
      Icon: User,
      value: name,
      onChange: setName,
      placeholder: "Juan Pérez",
      autoComplete: "name",
    },
    {
      id: "email",
      label: "Email",
      Icon: Mail,
      value: email,
      onChange: setEmail,
      placeholder: "juan@empresa.com",
      autoComplete: "email",
      type: "email",
    },
    {
      id: "password",
      label: "Contraseña",
      Icon: Lock,
      value: password,
      onChange: setPassword,
      placeholder: "••••••••",
      autoComplete: "new-password",
      type: "password",
      hint: "Mínimo 6 caracteres",
    },
    {
      id: "confirmPassword",
      label: "Confirmar contraseña",
      Icon: Lock,
      value: confirmPassword,
      onChange: setConfirmPassword,
      placeholder: "••••••••",
      autoComplete: "new-password",
      type: "password",
    },
    {
      id: "storeName",
      label: "Nombre de la Empresa",
      Icon: Building,
      value: storeName,
      onChange: setStoreName,
      placeholder: "TechMart Argentina",
      autoComplete: "organization-name",
    },
    {
      id: "storeAddress",
      label: "Dirección",
      Icon: MapPin,
      value: storeAddress,
      onChange: setStoreAddress,
      placeholder: "Calle 123, Buenos Aires",
      autoComplete: "street-address",
    },
    {
      id: "storePhone",
      label: "Teléfono",
      Icon: Phone,
      value: storePhone,
      onChange: setStorePhone,
      placeholder: "+54 11 1234-5678",
      autoComplete: "tel",
      type: "tel",
    },
  ]

  return (
    <AuthLayout
      left={<AuthBranding />}
      right={
        <div className="space-y-6">
          <div className="text-center md:text-left space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Crear cuenta
            </h1>
            <p className="text-sm text-muted-foreground/70">
              Empezá a gestionar tu inventario en minutos.
            </p>
          </div>

          <AuthCard>
            <form onSubmit={handleSubmit} className="space-y-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-sm text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </button>
              )}

              {fields.map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <label
                    htmlFor={f.id}
                    className="text-sm font-medium text-foreground"
                  >
                    {f.label}
                  </label>
                  <div className="relative">
                    <f.Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <input
                      id={f.id}
                      type={(f as any).type || "text"}
                      value={f.value}
                      onChange={(e) => (f.onChange as any)(e.target.value)}
                      className={cn(
                        "h-11 w-full rounded-xl border bg-background pl-10 pr-4 text-sm",
                        "placeholder:text-muted-foreground/50",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
                        "transition-[border,box-shadow] duration-200",
                      )}
                      placeholder={f.placeholder}
                      autoComplete={f.autoComplete}
                    />
                  </div>
                  {"hint" in f && f.hint && (
                    <p className="text-xs text-muted-foreground/50">{f.hint}</p>
                  )}
                </div>
              ))}

              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}

              <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/30 px-4 py-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Tu cuenta incluye una prueba gratuita de{" "}
                    <strong>15 días</strong>. No se requiere tarjeta.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || progress === 100}
                className={cn(
                  "relative flex h-11 w-full items-center justify-center overflow-hidden rounded-xl font-semibold transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  progress === 100
                    ? "bg-emerald-600 text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                  (isSubmitting || progress === 100) && "cursor-not-allowed",
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0 transition-none",
                    progress === 100 ? "bg-emerald-500" : "bg-primary/40",
                  )}
                  style={{ width: `${progress}%` }}
                />

                <span className="relative z-10 flex items-center gap-2">
                  {progress === 100 ? (
                    <>
                      <Check className="h-4 w-4" />
                      Cuenta creada
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    "Crear cuenta"
                  )}
                </span>
              </button>
            </form>
          </AuthCard>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Iniciar sesión
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground/50">
            &copy; 2026 StockLine. Todos los derechos reservados.
          </p>
        </div>
      }
    />
  )
}
