"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, UserCog, Mail, Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@/lib/types";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserType | null;
  onUserUpdated?: (user: UserType) => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onUserUpdated,
}: EditUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sincronizar campos cuando cambia el usuario a editar
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPassword("");
      setError(null);
      setSuccess(false);
    }
  }, [user]);

  const closeDialog = () => {
    setPassword("");
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Nombre y email son requeridos");
      return;
    }

    if (password && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      setIsLoading(true);

      const body: Record<string, string> = {
        id: user!.id,
        name: name.trim(),
        email: email.trim(),
      };
      if (password) body.password = password;

      const response = await fetch("/api/auth/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al actualizar el empleado");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      onUserUpdated?.(data.user);

      setTimeout(() => closeDialog(), 1500);
    } catch {
      setError("Error de conexión. Por favor intenta nuevamente.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Editar Empleado
          </DialogTitle>
          <DialogDescription>
            Modificá los datos del empleado. Dejá la contraseña en blanco para
            no cambiarla.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              ¡Empleado actualizado!
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Los cambios se guardaron correctamente
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Name */}
            <div>
              <label
                htmlFor="edit-name"
                className="block text-sm font-medium text-foreground"
              >
                Nombre completo
              </label>
              <div className="relative mt-1">
                <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="edit-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    "h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                  placeholder="Juan Pérez"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="edit-email"
                className="block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                  placeholder="juan@empresa.com"
                />
              </div>
            </div>

            {/* Password (optional) */}
            <div>
              <label
                htmlFor="edit-password"
                className="block text-sm font-medium text-foreground"
              >
                Nueva contraseña{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="edit-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                  placeholder="Dejar en blanco para no cambiar"
                  autoComplete="new-password"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Mínimo 6 caracteres si se cambia
              </p>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeDialog}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center rounded-md border border-input bg-background font-medium text-foreground transition-colors",
                  "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                )}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground transition-colors",
                  "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
