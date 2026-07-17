"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ImportOptions } from "@/lib/import/product-import-schemas";

interface ImportOptionsStepProps {
  options: ImportOptions;
  onOptionsChange: (options: ImportOptions) => void;
  existingCount: number;
}

export function ImportOptionsStep({
  options,
  onOptionsChange,
  existingCount,
}: ImportOptionsStepProps) {
  const handleModeChange = (mode: ImportOptions["mode"]) => {
    onOptionsChange({
      ...options,
      mode,
      updateFields:
        mode === "update"
          ? ["stock", "price", "cost", "minStock"]
          : [],
    });
  };

  const handleMatchByChange = (matchBy: ImportOptions["matchBy"]) => {
    onOptionsChange({ ...options, matchBy });
  };

  const handleFieldToggle = (field: ImportOptions["updateFields"][number]) => {
    const current = options.updateFields;
    const updated = current.includes(field)
      ? current.filter((f) => f !== field)
      : [...current, field];
    onOptionsChange({ ...options, updateFields: updated });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Mode selection */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-foreground">
          Modo de importación
        </h4>
        <div className="space-y-2">
          <ModeOption
            selected={options.mode === "create"}
            onClick={() => handleModeChange("create")}
            title="Crear productos nuevos"
            description="Solo se crearán productos que no existan. Los existentes serán omitidos."
          />
          <ModeOption
            selected={options.mode === "update"}
            onClick={() => handleModeChange("update")}
            title="Actualizar productos existentes"
            description={
              existingCount > 0
                ? `${existingCount} productos existentes serán actualizados.`
                : "Se actualizarán los productos que coincidan."
            }
          />
        </div>
      </div>

      {/* Match criteria */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-foreground">
          Criterio de coincidencia
        </h4>
        <p className="mb-3 text-xs text-muted-foreground">
          Usá este campo para identificar si un producto ya existe.
        </p>
        <div className="flex gap-2">
          <MatchButton
            selected={options.matchBy === "barcode"}
            onClick={() => handleMatchByChange("barcode")}
            label="Código de barras"
          />
          <MatchButton
            selected={options.matchBy === "name"}
            onClick={() => handleMatchByChange("name")}
            label="Nombre"
          />
        </div>
      </div>

      {/* Update fields */}
      {options.mode === "update" && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-foreground">
            Campos a actualizar
          </h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Elegí qué campos se actualizarán en los productos existentes.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <FieldCheckbox
              label="Stock"
              checked={options.updateFields.includes("stock")}
              onChange={() => handleFieldToggle("stock")}
            />
            <FieldCheckbox
              label="Precio de Venta"
              checked={options.updateFields.includes("price")}
              onChange={() => handleFieldToggle("price")}
            />
            <FieldCheckbox
              label="Costo"
              checked={options.updateFields.includes("cost")}
              onChange={() => handleFieldToggle("cost")}
            />
            <FieldCheckbox
              label="Stock Mínimo"
              checked={options.updateFields.includes("minStock")}
              onChange={() => handleFieldToggle("minStock")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ModeOption({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-muted hover:bg-muted/50",
      )}
    >
      <div
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2",
          selected
            ? "border-primary bg-primary"
            : "border-muted-foreground/30",
        )}
      />
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

function MatchButton({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function FieldCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border p-2.5 transition-colors hover:bg-muted/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-muted-foreground/30"
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}
