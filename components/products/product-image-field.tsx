"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, X, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileToDataUrl } from "@/lib/image-utils";
import { validateImageFile } from "@/lib/validations";
import { ProductThumbnail } from "./product-thumbnail";

export interface ProductImageSelection {
  file: File | null;
  removed: boolean;
}

interface ProductImageFieldProps {
  imageUrl?: string | null;
  productName?: string;
  selection: ProductImageSelection;
  onSelectionChange: (selection: ProductImageSelection) => void;
  disabled?: boolean;
}

export function ProductImageField({
  imageUrl,
  productName,
  selection,
  onSelectionChange,
  disabled = false,
}: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openFilePicker = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setPreviewUrl(null);
      setError(validationError);
      onSelectionChange({ file: null, removed: false });
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setPreviewUrl(dataUrl);
      setError(null);
      onSelectionChange({ file, removed: false });
    } catch {
      setPreviewUrl(null);
      setError("No se pudo leer la imagen.");
    }
  };

  const clearSelection = () => {
    setPreviewUrl(null);
    setError(null);
    onSelectionChange({ file: null, removed: false });
  };

  const removeExistingImage = () => {
    setPreviewUrl(null);
    setError(null);
    onSelectionChange({ file: null, removed: true });
  };

  const undoRemoval = () => {
    setError(null);
    onSelectionChange({ file: null, removed: false });
  };

  const hasNewSelection = selection.file !== null;

  return (
    <div className="rounded-md border border-dashed p-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      {hasNewSelection && previewUrl ? (
        <div className="flex items-center gap-3">
          <img
            src={previewUrl}
            alt="Vista previa de la imagen"
            className="h-16 w-16 shrink-0 rounded-md border object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Nueva imagen</p>
            <p className="truncate text-xs text-muted-foreground">
              {selection.file?.name}
            </p>
            <button
              type="button"
              onClick={clearSelection}
              disabled={disabled}
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-destructive",
                "hover:underline disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <X className="h-3.5 w-3.5" />
              Quitar selección
            </button>
          </div>
        </div>
      ) : selection.removed ? (
        <div className="flex items-center gap-3">
          <ProductThumbnail className="h-16 w-16 shrink-0 rounded-md border" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Imagen eliminada
            </p>
            <p className="text-xs text-muted-foreground">
              Se quitará al guardar los cambios.
            </p>
            <div className="mt-1.5 flex gap-3">
              <button
                type="button"
                onClick={openFilePicker}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium text-primary",
                  "hover:underline disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Seleccionar imagen
              </button>
              <button
                type="button"
                onClick={undoRemoval}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground",
                  "hover:underline disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Deshacer
              </button>
            </div>
          </div>
        </div>
      ) : imageUrl ? (
        <div className="flex items-center gap-3">
          <img
            src={imageUrl}
            alt={productName ? `Imagen de ${productName}` : "Imagen del producto"}
            className="h-16 w-16 shrink-0 rounded-md border object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Imagen actual
            </p>
            <div className="mt-1.5 flex gap-3">
              <button
                type="button"
                onClick={openFilePicker}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium text-primary",
                  "hover:underline disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Cambiar imagen
              </button>
              <button
                type="button"
                onClick={removeExistingImage}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium text-destructive",
                  "hover:underline disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar imagen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openFilePicker}
          disabled={disabled}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed px-3 py-5 text-center",
            "transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Seleccionar imagen
          </span>
        </button>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
