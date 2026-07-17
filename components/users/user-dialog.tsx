"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  UserPlus,
  Mail,
  Lock,
  Building2,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { validatePassword } from "@/lib/password-validation";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onUserCreated?: () => void;
}

export function UserDialog({
  open,
  onOpenChange,
  storeId,
  onUserCreated,
}: UserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
    setIsLoading(false);
  };

  const closeDialog = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!name || !email || !password || !confirmPassword) {
      setError("Por favor completa todos los campos");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || "La contraseña es inválida");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          password,
          storeId,
          role: "employee",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al crear el empleado");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      onUserCreated?.();

      // Cerrar diálogo y resetear estado después de 2 segundos (si no se cierra manualmente antes)
      setTimeout(() => {
        closeDialog();
      }, 2000);
    } catch (err) {
      setError("Error de conexión. Por favor intenta nuevamente.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Crear Empleado
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo empleado a la tienda
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              ¡Empleado creado!
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              El empleado ha sido creado exitosamente
            </p>
            <button
              type="button"
              onClick={closeDialog}
              className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground"
              >
                Nombre completo
              </label>
              <div className="relative mt-1">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    "mt-1 h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                  placeholder="Juan Pérez"
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "mt-1 h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                  placeholder="juan@empresa.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                Contraseña
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "mt-1 h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Mínimo 6 caracteres
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-foreground"
              >
                Confirmar contraseña
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    "mt-1 h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground transition-colors",
                "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Empleado"
              )}
            </button>
          </form>
        )}

        <DialogFooter>
          {success && (
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Cerrar
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
