"use client";

import { useMemo, useState } from "react";
import { MoreVertical, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { CategoryForm } from "./category-form";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  canManage: boolean;
  onCategoriesChange: (categories: Category[]) => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  categories,
  canManage,
  onCategoriesChange,
}: CategoryDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const closeForms = () => {
    setIsCreating(false);
    setEditingCategory(null);
  };

  const handleCreate = async (payload: {
    name: string;
    description?: string;
  }) => {
    setError(null);
    setFeedback(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear la categoría");
        return;
      }
      onCategoriesChange([...categories, data]);
      setFeedback("Categoría creada");
      closeForms();
    } catch {
      setError("Error de conexión al crear categoría");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (payload: {
    name: string;
    description?: string;
  }) => {
    if (!editingCategory) return;

    setError(null);
    setFeedback(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingCategory.id,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo editar la categoría");
        return;
      }
      onCategoriesChange(categories.map((c) => (c.id === data.id ? data : c)));
      setFeedback("Categoría actualizada");
      closeForms();
    } catch {
      setError("Error de conexión al editar categoría");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    setError(null);
    setFeedback(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/categories?id=${categoryToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo eliminar la categoría");
        return;
      }
      onCategoriesChange(
        categories.filter((c) => c.id !== categoryToDelete.id),
      );
      setFeedback(data.message || "Categoría eliminada");
      setCategoryToDelete(null);
    } catch {
      setError("Error de conexión al eliminar categoría");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-auto sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-primary" />
              Gestionar categorías
            </DialogTitle>
            <DialogDescription>
              Creá, editá o eliminá categorías sin salir del módulo de stock.
            </DialogDescription>
          </DialogHeader>

          {!canManage && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Solo administradores pueden gestionar categorías.
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {feedback && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
              {feedback}
            </div>
          )}

          {canManage && !isCreating && !editingCategory && (
            <div className="flex justify-end">
              <Button
                onClick={() => setIsCreating(true)}
                data-testid="create-category-btn"
              >
                <Plus className="h-4 w-4" />
                Agregar categoría
              </Button>
            </div>
          )}

          {canManage && isCreating && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 font-medium">Nueva categoría</h3>
              <CategoryForm
                submitLabel="Crear categoría"
                loadingLabel="Creando..."
                isLoading={isLoading}
                onSubmit={handleCreate}
                onCancel={closeForms}
              />
            </div>
          )}

          {canManage && editingCategory && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 font-medium">Editar categoría</h3>
              <CategoryForm
                initialName={editingCategory.name}
                initialDescription={editingCategory.description ?? ""}
                submitLabel="Guardar cambios"
                loadingLabel="Guardando..."
                isLoading={isLoading}
                onSubmit={handleUpdate}
                onCancel={closeForms}
              />
            </div>
          )}

          <div className="rounded-lg border">
            <div className="border-b p-3 text-sm font-medium">
              Categorías ({sortedCategories.length})
            </div>
            {sortedCategories.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No hay categorías aún.
              </div>
            ) : (
              <div className="divide-y">
                {sortedCategories.map((category) => (
                  <div
                    key={category.id}
                    data-testid={`category-row-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex items-center justify-between p-3 transition-colors hover:bg-muted/30"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {category.name}
                      </p>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      )}
                    </div>

                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
                              "hover:bg-muted hover:text-foreground",
                            )}
                            aria-label="Opciones"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => {
                              setError(null);
                              setFeedback(null);
                              setEditingCategory(category);
                              setIsCreating(false);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => setCategoryToDelete(category)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={categoryToDelete !== null}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar la categoría{" "}
              <strong>{categoryToDelete?.name}</strong>. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
