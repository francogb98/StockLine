"use client";

import { useMemo } from "react";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SYSTEM_FIELDS,
  type ImportMapping,
} from "@/lib/import/product-import-schemas";
import { getSystemFieldsForSelect } from "@/lib/import/column-mapper";

interface ColumnMappingStepProps {
  headers: string[];
  previewRows: Record<string, unknown>[];
  mapping: ImportMapping;
  onMappingChange: (mapping: ImportMapping) => void;
}

export function ColumnMappingStep({
  headers,
  previewRows,
  mapping,
  onMappingChange,
}: ColumnMappingStepProps) {
  const fields = useMemo(() => getSystemFieldsForSelect(), []);

  const handleChange = (systemField: keyof ImportMapping, value: string) => {
    onMappingChange({
      ...mapping,
      [systemField]: value || null,
    });
  };

  const mappedCount = Object.values(mapping).filter((v) => v !== null).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          {headers.length} columnas detectadas
        </span>
        <span>·</span>
        <span>
          {mappedCount} de {Object.keys(SYSTEM_FIELDS).length} campos mapeados
        </span>
      </div>

      {/* Mapping selectors */}
      <div className="space-y-3">
        {fields.map((field) => {
          const isMapped = mapping[field.value] !== null;
          return (
            <div key={field.value} className="flex items-center gap-3">
              <div className="w-36 shrink-0 text-right">
                <span className="text-sm font-medium text-foreground">
                  {field.label}
                </span>
                {field.required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </div>
              <span className="text-muted-foreground">→</span>
              <select
                value={mapping[field.value] ?? ""}
                onChange={(e) => handleChange(field.value, e.target.value)}
                className={cn(
                  "h-9 flex-1 rounded-md border bg-background px-3 text-sm",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  !isMapped && field.required && "border-destructive",
                )}
              >
                <option value="">No mapear</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              {isMapped && (
                <Check className="h-4 w-4 shrink-0 text-green-600" />
              )}
            </div>
          );
        })}
      </div>

      {/* Preview table */}
      {previewRows.length > 0 && (
        <div className="mt-2">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Vista previa (primeras filas):
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  {headers.slice(0, 8).map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-2 py-1.5 text-left font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                  {headers.length > 8 && (
                    <th className="px-2 py-1.5 text-left text-muted-foreground">
                      +{headers.length - 8} más
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {headers.slice(0, 8).map((h) => (
                      <td
                        key={h}
                        className="whitespace-nowrap px-2 py-1 text-foreground"
                      >
                        {String(row[h] ?? "").substring(0, 30)}
                      </td>
                    ))}
                    {headers.length > 8 && (
                      <td className="px-2 py-1 text-muted-foreground">…</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mapping.name === null && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          El campo &quot;Nombre&quot; es obligatorio. Mapeá una columna para continuar.
        </div>
      )}
    </div>
  );
}
