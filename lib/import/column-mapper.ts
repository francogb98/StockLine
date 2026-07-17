import {
  COLUMN_ALIASES,
  type ImportMapping,
  type SystemField,
  createEmptyMapping,
} from "./product-import-schemas";

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

export function detectColumns(headers: string[]): ImportMapping {
  const mapping = createEmptyMapping();
  const normalizedHeaders = headers.map(normalizeString);

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [
    SystemField,
    string[],
  ][]) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const normalized = normalizedHeaders[i];
      if (aliases.includes(normalized)) {
        mapping[field] = headers[i];
        break;
      }
    }
  }

  return mapping;
}

export function getSystemFieldsForSelect(): {
  value: SystemField;
  label: string;
  required: boolean;
}[] {
  const required: SystemField[] = ["name"];
  return [
    { value: "name", label: "Nombre", required: true },
    { value: "barcode", label: "Código de Barras", required: false },
    { value: "description", label: "Descripción", required: false },
    { value: "category", label: "Categoría", required: false },
    { value: "price", label: "Precio de Venta", required: false },
    { value: "cost", label: "Costo", required: false },
    { value: "stock", label: "Stock", required: false },
    { value: "minStock", label: "Stock Mínimo", required: false },
  ];
}
