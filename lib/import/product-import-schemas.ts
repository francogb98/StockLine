import { z } from "zod";

// ==================== System Fields ====================

export const SYSTEM_FIELDS = {
  name: "Nombre",
  barcode: "Código de Barras",
  description: "Descripción",
  category: "Categoría",
  price: "Precio de Venta",
  cost: "Costo",
  stock: "Stock",
  minStock: "Stock Mínimo",
} as const;

export type SystemField = keyof typeof SYSTEM_FIELDS;

export const REQUIRED_FIELDS: SystemField[] = ["name"];

export const OPTIONAL_FIELDS: SystemField[] = [
  "barcode",
  "description",
  "category",
  "price",
  "cost",
  "stock",
  "minStock",
];

// ==================== Column Mapping ====================

export const COLUMN_ALIASES: Record<SystemField, string[]> = {
  name: [
    "nombre",
    "producto",
    "descripcion",
    "descripción",
    "articulo",
    "artículo",
    "item",
    "name",
    "product",
    "description",
  ],
  barcode: [
    "codigo",
    "código",
    "barcode",
    "ean",
    "codigo barras",
    "código barras",
    "upc",
    "gtin",
    "code",
  ],
  description: [
    "detalle",
    "observaciones",
    "notas",
    "detail",
    "notes",
  ],
  category: [
    "categoria",
    "categoría",
    "rubro",
    "grupo",
    "familia",
    "category",
    "group",
  ],
  price: [
    "precio",
    "precio venta",
    "precio final",
    "valor",
    "importe",
    "price",
    "sale price",
    "retail price",
    "pvp",
    "pv",
  ],
  cost: [
    "costo",
    "cost",
    "precio costo",
    "costo unitario",
    "purchase price",
    "buy price",
  ],
  stock: [
    "stock",
    "cantidad",
    "existencia",
    "inventario",
    "unidades",
    "qty",
    "quantity",
    "inventory",
  ],
  minStock: [
    "stock minimo",
    "stock mínimo",
    "minimo",
    "mínimo",
    "min stock",
    "minimum",
    "reorder point",
  ],
};

// ==================== Zod Schemas ====================

export const importRowRawSchema = z.record(z.string(), z.any());

export type ImportRowRaw = z.infer<typeof importRowRawSchema>;

export const importMappingSchema = z.object({
  name: z.string().nullable(),
  barcode: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  price: z.string().nullable(),
  cost: z.string().nullable(),
  stock: z.string().nullable(),
  minStock: z.string().nullable(),
});

export type ImportMapping = z.infer<typeof importMappingSchema>;

export const importOptionsSchema = z.object({
  mode: z.enum(["create", "update"]),
  matchBy: z.enum(["barcode", "name"]),
  updateFields: z.array(z.enum(["stock", "price", "cost", "minStock"])),
});

export type ImportOptions = z.infer<typeof importOptionsSchema>;

export const mappedRowSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  barcode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0").optional(),
  cost: z.number().min(0, "El costo debe ser mayor o igual a 0").optional(),
  stock: z.number().int().min(0, "El stock debe ser un entero mayor o igual a 0").optional(),
  minStock: z.number().int().min(0, "El stock mínimo debe ser un entero mayor o igual a 0").optional(),
});

export type MappedRow = z.infer<typeof mappedRowSchema>;

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value: unknown;
}

export interface ImportRowResult {
  row: number;
  data: MappedRow;
  errors: ImportError[];
  isDuplicate: boolean;
  duplicateOf?: string;
  existingProduct?: { id: string; name: string };
}

export interface CategoryAnalysis {
  allUniqueNames: string[];
  existing: { name: string; normalizedName: string; categoryId: string }[];
  newCategories: { name: string; normalizedName: string }[];
}

export interface ValidationResult {
  totalRows: number;
  validRows: ImportRowResult[];
  errorRows: ImportRowResult[];
  duplicateRows: ImportRowResult[];
  existingRows: ImportRowResult[];
  categoryAnalysis: CategoryAnalysis;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

// ==================== Mapping Helpers ====================

export function createEmptyMapping(): ImportMapping {
  return {
    name: null,
    barcode: null,
    description: null,
    category: null,
    price: null,
    cost: null,
    stock: null,
    minStock: null,
  };
}

export function isMappingComplete(mapping: ImportMapping): boolean {
  return REQUIRED_FIELDS.every((field) => mapping[field] !== null);
}

export function getMissingRequiredFields(mapping: ImportMapping): SystemField[] {
  return REQUIRED_FIELDS.filter((field) => mapping[field] === null);
}

export function countMappedFields(mapping: ImportMapping): number {
  return Object.values(mapping).filter((v) => v !== null).length;
}
