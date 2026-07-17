"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CategoryFormProps {
  initialName?: string;
  initialDescription?: string;
  submitLabel: string;
  loadingLabel?: string;
  isLoading?: boolean;
  onSubmit: (data: {
    name: string;
    description?: string;
  }) => Promise<void> | void;
  onCancel?: () => void;
}

export function CategoryForm({
  initialName = "",
  initialDescription = "",
  submitLabel,
  loadingLabel = "Guardando...",
  isLoading = false,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setError(null);
  }, [initialName, initialDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
      data-testid="category-form"
    >
      <div>
        <label
          htmlFor="category-name"
          className="mb-1 block text-sm font-medium"
        >
          Nombre
        </label>
        <Input
          id="category-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Bebidas"
          disabled={isLoading}
        />
      </div>

      <div>
        <label
          htmlFor="category-description"
          className="mb-1 block text-sm font-medium"
        >
          Descripción (opcional)
        </label>
        <Input
          id="category-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Productos fríos y gaseosas"
          disabled={isLoading}
        />
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
