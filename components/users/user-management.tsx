"use client";

import { useState, useEffect } from "react";
import {
  User,
  Users,
  Shield,
  ShieldCheck,
  Mail,
  Calendar,
  MoreVertical,
  UserPlus,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@/lib/types";
import { UserDialog } from "./user-dialog";
import { useAuth } from "@/lib/store-context";

export function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserType | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    setIsError(null);
    try {
      const response = await fetch("/api/auth/users", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        setIsError("No se pudieron cargar los usuarios");
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      setIsError("Error de conexión al cargar usuarios");
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar usuarios desde la API
  useEffect(() => {
    loadUsers();
  }, []);

  const handleUserCreated = () => {
    fetch("/api/auth/users", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setUsers(data.users))
      .catch((error) => console.error("Error recargando usuarios:", error));
  };

  const handleUserUpdated = (updated: UserType) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
    );
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setIsError(null);
    try {
      const response = await fetch(`/api/auth/users?id=${userToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        setIsError(data.error || "Error al eliminar el usuario");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch {
      setIsError("Error de conexión al eliminar el usuario");
    } finally {
      setIsDeleting(false);
    }
  };

  const roleLabels = {
    admin: "Administrador",
    employee: "Empleado",
  };

  const roleDescriptions = {
    admin: "Acceso completo al sistema, reportes y gestión de usuarios",
    employee: "Acceso a caja y gestión de stock",
  };

  // Verificar si el usuario es admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      setIsError("Solo los administradores pueden gestionar usuarios");
    } else {
      setIsError(null);
    }
  }, [user]);

  return (
    <>
      <div className="h-full overflow-auto bg-background p-6">
        <div className="mx-auto max-w-4xl">
          {/* Error message if not admin */}
          {isError && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-destructive">
                  <strong>Error:</strong> {isError}
                </p>
                {isError !== "Solo los administradores pueden gestionar usuarios" && (
                  <button
                    onClick={loadUsers}
                    className="flex items-center gap-1 text-sm text-destructive underline hover:no-underline"
                    type="button"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Gestión de Usuarios
              </h1>
              <p className="text-sm text-muted-foreground">
                Administra los usuarios y permisos del sistema
              </p>
            </div>
            <button
              onClick={() => setShowAddDialog(true)}
              disabled={isLoading || !user || user.role !== "admin"}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors",
                "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                (!user || user.role !== "admin") &&
                  "cursor-not-allowed opacity-50",
              )}
              type="button"
            >
              <UserPlus className="h-5 w-5" />
              Nuevo Empleado
            </button>
          </div>

          {/* Role explanation cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Administrador
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {roleDescriptions.admin}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Empleado</h3>
                  <p className="text-sm text-muted-foreground">
                    {roleDescriptions.employee}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Users list */}
          <div className="rounded-lg border bg-card">
            <div className="border-b p-4">
              <h2 className="font-semibold text-foreground">
                Empleados ({users.length})
              </h2>
            </div>
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  Cargando empleados...
                </p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No hay empleados registrados
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {users.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full font-semibold text-primary-foreground",
                          member.role === "admin"
                            ? "bg-primary"
                            : "bg-muted-foreground",
                        )}
                      >
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>

                      {/* User info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {member.name}
                          </h3>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              member.id === user?.id &&
                                "ring-1 ring-primary/40",
                              member.role === "admin"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {roleLabels[member.role]}
                            {member.id === user?.id && " (tú)"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {member.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Desde{" "}
                            {new Date(member.createdAt).toLocaleDateString(
                              "es-AR",
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions — solo visibles para el admin */}
                    {user?.role === "admin" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
                              "hover:bg-muted hover:text-foreground",
                            )}
                            type="button"
                            aria-label="Opciones"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => setUserToEdit(member)}
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {member.id !== user?.id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setUserToDelete(member)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div className="h-8 w-8" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permissions table */}
          <div className="mt-6 rounded-lg border bg-card">
            <div className="border-b p-4">
              <h2 className="font-semibold text-foreground">
                Matriz de Permisos
              </h2>
            </div>
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Funcionalidad</th>
                    <th className="p-4 text-center font-medium">
                      Administrador
                    </th>
                    <th className="p-4 text-center font-medium">Empleado</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Realizar ventas", admin: true, employee: true },
                    { feature: "Ver stock", admin: true, employee: true },
                    { feature: "Modificar stock", admin: true, employee: true },
                    {
                      feature: "Agregar productos",
                      admin: true,
                      employee: false,
                    },
                    {
                      feature: "Eliminar productos",
                      admin: true,
                      employee: false,
                    },
                    {
                      feature: "Ver reportes de ventas",
                      admin: true,
                      employee: false,
                    },
                    {
                      feature: "Gestionar usuarios",
                      admin: true,
                      employee: false,
                    },
                    {
                      feature: "Configuración del sistema",
                      admin: true,
                      employee: false,
                    },
                  ].map((permission) => (
                    <tr
                      key={permission.feature}
                      className="border-b last:border-0"
                    >
                      <td className="p-4 text-sm text-foreground">
                        {permission.feature}
                      </td>
                      <td className="p-4 text-center">
                        {permission.admin ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            ✗
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {permission.employee ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            ✗
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Demo mode notice */}
          <div className="mt-6 rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-4">
            <p className="text-sm text-[hsl(var(--warning))]">
              <strong>Modo Demo:</strong> La gestión de usuarios está
              deshabilitada en esta demostración. En producción, podrás crear,
              editar y eliminar usuarios con autenticación completa.
            </p>
          </div>
        </div>
      </div>

      {/* Crear usuario */}
      <UserDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        storeId={user?.storeId ?? ""}
        onUserCreated={handleUserCreated}
      />

      {/* Editar usuario */}
      <EditUserDialog
        open={userToEdit !== null}
        onOpenChange={(open) => !open && setUserToEdit(null)}
        user={userToEdit}
        onUserUpdated={handleUserUpdated}
      />

      {/* Confirmación de eliminación */}
      <AlertDialog
        open={userToDelete !== null}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar empleado
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que querés eliminar a{" "}
              <strong>{userToDelete?.name}</strong>? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
