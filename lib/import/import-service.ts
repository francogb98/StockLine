import type {
  ImportMapping,
  ImportOptions,
  MappedRow,
  ImportError,
  ImportRowResult,
  ValidationResult,
  ImportRowRaw,
} from "./product-import-schemas";
import type { Product, Category } from "@/lib/types";

// ==================== Category Normalization ====================

export function normalizeCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface CategoryAnalysis {
  allUniqueNames: string[];
  existing: { name: string; normalizedName: string; categoryId: string }[];
  newCategories: { name: string; normalizedName: string }[];
}

export function analyzeCategories(
  rows: Partial<MappedRow>[],
  existingCategories: Category[],
): CategoryAnalysis {
  // Build map of normalized name → existing category
  const existingMap = new Map<string, Category>();
  for (const cat of existingCategories) {
    existingMap.set(normalizeCategoryName(cat.name), cat);
  }

  // Collect all unique category names from rows (preserving original casing from first occurrence)
  const uniqueNamesMap = new Map<string, string>(); // normalizedName → originalName
  for (const row of rows) {
    if (row.category) {
      const norm = normalizeCategoryName(row.category);
      if (!uniqueNamesMap.has(norm)) {
        uniqueNamesMap.set(norm, row.category);
      }
    }
  }

  const allUniqueNames = Array.from(uniqueNamesMap.values());
  const existing: CategoryAnalysis["existing"] = [];
  const newCategories: CategoryAnalysis["newCategories"] = [];

  for (const [norm, original] of uniqueNamesMap) {
    const cat = existingMap.get(norm);
    if (cat) {
      existing.push({ name: cat.name, normalizedName: norm, categoryId: cat.id });
    } else {
      newCategories.push({ name: original, normalizedName: norm });
    }
  }

  return { allUniqueNames, existing, newCategories };
}

// ==================== Category Resolution for API ====================

export interface CategoryResolutionMap {
  get(normalizedName: string): string | null;
}

function mapRow(
  raw: ImportRowRaw,
  mapping: ImportMapping,
  rowIndex: number,
): { mapped: Partial<MappedRow>; errors: ImportError[] } {
  const errors: ImportError[] = [];
  const mapped: Partial<MappedRow> = {};

  // Name (required)
  if (mapping.name) {
    const val = String(raw[mapping.name] ?? "").trim();
    if (!val) {
      errors.push({ row: rowIndex, field: "name", message: "El nombre está vacío", value: raw[mapping.name] });
    }
    mapped.name = val;
  }

  // Barcode
  if (mapping.barcode) {
    const val = String(raw[mapping.barcode] ?? "").trim();
    mapped.barcode = val || null;
  }

  // Description
  if (mapping.description) {
    const val = String(raw[mapping.description] ?? "").trim();
    mapped.description = val || null;
  }

  // Category
  if (mapping.category) {
    const val = String(raw[mapping.category] ?? "").trim();
    mapped.category = val || null;
  }

  // Price
  if (mapping.price) {
    const rawVal = raw[mapping.price];
    const numVal = parseNumber(rawVal);
    if (numVal === null) {
      errors.push({ row: rowIndex, field: "price", message: "Precio inválido", value: rawVal });
    } else {
      mapped.price = numVal;
    }
  }

  // Cost
  if (mapping.cost) {
    const rawVal = raw[mapping.cost];
    const numVal = parseNumber(rawVal);
    if (numVal === null) {
      errors.push({ row: rowIndex, field: "cost", message: "Costo inválido", value: rawVal });
    } else {
      mapped.cost = numVal;
    }
  }

  // Stock
  if (mapping.stock) {
    const rawVal = raw[mapping.stock];
    const intVal = parseIntValue(rawVal);
    if (intVal === null) {
      errors.push({ row: rowIndex, field: "stock", message: "Stock inválido", value: rawVal });
    } else {
      mapped.stock = intVal;
    }
  }

  // MinStock
  if (mapping.minStock) {
    const rawVal = raw[mapping.minStock];
    const intVal = parseIntValue(rawVal);
    if (intVal === null) {
      errors.push({ row: rowIndex, field: "minStock", message: "Stock mínimo inválido", value: rawVal });
    } else {
      mapped.minStock = intVal;
    }
  }

  return { mapped, errors };
}

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return 0;
  const str = String(val).replace(/[,$\s]/g, "").replace(",", ".");
  const num = Number(str);
  return isNaN(num) ? null : num;
}

function parseIntValue(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return 0;
  const str = String(val).replace(/[,$\s]/g, "");
  const num = Math.round(Number(str));
  return isNaN(num) ? null : num;
}

function resolveCategory(
  categoryName: string | null | undefined,
  categories: Category[],
): string | null {
  if (!categoryName) return null;
  const normalized = categoryName.toLowerCase().trim();
  const match = categories.find((c) => c.name.toLowerCase().trim() === normalized);
  return match ? match.id : null;
}

function findExistingProduct(
  row: MappedRow,
  existingProducts: Product[],
  matchBy: ImportOptions["matchBy"],
): Product | undefined {
  if (matchBy === "barcode" && row.barcode) {
    return existingProducts.find(
      (p) => p.barcode && p.barcode.toLowerCase() === row.barcode!.toLowerCase(),
    );
  }
  if (matchBy === "name" && row.name) {
    return existingProducts.find(
      (p) => p.name.toLowerCase().trim() === row.name.toLowerCase().trim(),
    );
  }
  return undefined;
}

export function validateImportRows(
  rawRows: ImportRowRaw[],
  mapping: ImportMapping,
  categories: Category[],
  existingProducts: Product[],
  options: ImportOptions,
): ValidationResult {
  const validRows: ImportRowResult[] = [];
  const errorRows: ImportRowResult[] = [];
  const duplicateRows: ImportRowResult[] = [];
  const existingRows: ImportRowResult[] = [];

  const seenKeys = new Map<string, number>();
  const seenBarcodes = new Map<string, number>();

  // Map all raw rows through the mapping to get category values for analysis
  const mappedAll = rawRows.map((raw, index) => {
    const { mapped } = mapRow(raw, mapping, index + 1);
    return mapped;
  });

  const categoryAnalysis = analyzeCategories(mappedAll, categories);

  rawRows.forEach((raw, index) => {
    const rowIndex = index + 1;
    const { mapped, errors } = mapRow(raw, mapping, rowIndex);

    // Check for barcode duplicates within the batch
    if (mapped.barcode) {
      const barcodeLower = mapped.barcode.toLowerCase().trim();
      const prevBarcodeIndex = seenBarcodes.get(barcodeLower);
      if (prevBarcodeIndex !== undefined) {
        errorRows.push({
          row: rowIndex,
          data: mapped as MappedRow,
          errors: [{ row: rowIndex, field: "barcode", message: `Código de barras duplicado en el archivo (primera ocurrencia: fila ${prevBarcodeIndex})`, value: mapped.barcode }],
          isDuplicate: false,
        });
        return;
      }
      seenBarcodes.set(barcodeLower, rowIndex);

      // Check barcode conflict with existing products in DB
      const barcodeConflict = existingProducts.find(
        (p) => p.barcode && p.barcode.toLowerCase() === barcodeLower,
      );
      if (barcodeConflict) {
        errorRows.push({
          row: rowIndex,
          data: mapped as MappedRow,
          errors: [{ row: rowIndex, field: "barcode", message: `El código de barras "${mapped.barcode}" ya existe en el producto "${barcodeConflict.name}"`, value: mapped.barcode }],
          isDuplicate: false,
        });
        return;
      }
    }

    // Check for internal duplicates by matchBy key
    const duplicateKey = getDuplicateKey(mapped, options.matchBy);
    if (duplicateKey) {
      const prevIndex = seenKeys.get(duplicateKey);
      if (prevIndex !== undefined) {
        duplicateRows.push({
          row: rowIndex,
          data: mapped as MappedRow,
          errors: [{ row: rowIndex, field: "duplicate", message: `Duplicado de fila ${prevIndex}`, value: duplicateKey }],
          isDuplicate: true,
          duplicateOf: String(prevIndex),
        });
        return;
      }
      seenKeys.set(duplicateKey, rowIndex);
    }

    // Check for existing products (create mode)
    const existing = findExistingProduct(mapped as MappedRow, existingProducts, options.matchBy);
    if (existing && options.mode === "create") {
      existingRows.push({
        row: rowIndex,
        data: mapped as MappedRow,
        errors: [{ row: rowIndex, field: "existing", message: `Producto ya existe: ${existing.name}`, value: existing.id }],
        isDuplicate: false,
        existingProduct: { id: existing.id, name: existing.name },
      });
      return;
    }

    if (errors.length > 0) {
      errorRows.push({
        row: rowIndex,
        data: mapped as MappedRow,
        errors,
        isDuplicate: false,
      });
    } else {
      validRows.push({
        row: rowIndex,
        data: mapped as MappedRow,
        errors: [],
        isDuplicate: false,
        existingProduct: existing
          ? { id: existing.id, name: existing.name }
          : undefined,
      });
    }
  });

  return {
    totalRows: rawRows.length,
    validRows,
    errorRows,
    duplicateRows,
    existingRows,
    categoryAnalysis,
  };
}

function getDuplicateKey(row: Partial<MappedRow>, matchBy: ImportOptions["matchBy"]): string | null {
  if (matchBy === "barcode" && row.barcode) {
    return `barcode:${row.barcode.toLowerCase()}`;
  }
  if (matchBy === "name" && row.name) {
    return `name:${row.name.toLowerCase().trim()}`;
  }
  return null;
}

export function generateErrorCSV(errorRows: ImportRowResult[]): string {
  const headers = ["Fila", "Campo", "Error", "Valor"];
  const rows = errorRows.flatMap((row) =>
    row.errors.map((err) => [
      String(err.row),
      err.field,
      err.message,
      String(err.value ?? ""),
    ]),
  );

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return csvContent;
}

export function generateImportReport(
  result: ValidationResult,
  importResult?: { created: number; updated: number; skipped: number; errors: { row: number; message: string }[] },
): string {
  const lines: string[] = [
    "REPORTE DE IMPORTACIÓN",
    "====================",
    "",
    `Total de filas: ${result.totalRows}`,
    `Filas válidas: ${result.validRows.length}`,
    `Filas con errores: ${result.errorRows.length}`,
    `Duplicados: ${result.duplicateRows.length}`,
    `Ya existentes: ${result.existingRows.length}`,
  ];

  if (importResult) {
    lines.push(
      "",
      "RESULTADO",
      "=========",
      `Creados: ${importResult.created}`,
      `Actualizados: ${importResult.updated}`,
      `Omitidos: ${importResult.skipped}`,
      `Errores: ${importResult.errors.length}`,
    );
  }

  if (result.errorRows.length > 0) {
    lines.push("", "ERRORES", "=======");
    for (const row of result.errorRows) {
      for (const err of row.errors) {
        lines.push(`Fila ${err.row}: [${err.field}] ${err.message} (valor: ${err.value})`);
      }
    }
  }

  return lines.join("\n");
}
