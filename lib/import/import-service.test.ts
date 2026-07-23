import { describe, it, expect } from "vitest";
import {
  normalizeCategoryName,
  analyzeCategories,
  validateImportRows,
  generateErrorCSV,
  generateImportReport,
  type CategoryAnalysis,
} from "./import-service";
import type { Category, Product } from "@/lib/types";

const mockCategories: Category[] = [
  { id: "cat-1", storeId: "store-1", name: "Electrónica", description: null },
  { id: "cat-2", storeId: "store-1", name: "Accesorios", description: null },
];

const mockProducts: Product[] = [
  {
    id: "prod-1", storeId: "store-1", barcode: "7790001000011",
    name: "Mouse", description: null, categoryId: "cat-2",
    price: 15000, cost: 9000, stock: 25, minStock: 5,
    createdAt: new Date(), updatedAt: new Date(),
  },
];

describe("normalizeCategoryName", () => {
  it("lowercase, trim and remove accents", () => {
    expect(normalizeCategoryName("  Electrónica ")).toBe("electronica");
  });

  it("handle already clean strings", () => {
    expect(normalizeCategoryName("Accesorios")).toBe("accesorios");
  });
});

describe("analyzeCategories", () => {
  const rows = [
    { category: "Accesorios" },
    { category: "Nueva Categoría" },
    { category: "Electrónica" },
  ];

  it("classify existing and new categories", () => {
    const result = analyzeCategories(rows, mockCategories);
    expect(result.existing).toHaveLength(2);
    expect(result.newCategories).toHaveLength(1);
    expect(result.newCategories[0].name).toBe("Nueva Categoría");
  });

  it("collect all unique names preserving original casing", () => {
    const result = analyzeCategories(
      [{ category: "electrónica" }, { category: "ELECTRÓNICA" }],
      mockCategories,
    );
    expect(result.allUniqueNames).toHaveLength(1);
    expect(result.existing).toHaveLength(1);
  });

  it("handle rows without category", () => {
    const result = analyzeCategories([{ category: null }, {}], mockCategories);
    expect(result.allUniqueNames).toHaveLength(0);
  });
});

describe("validateImportRows", () => {
  const mapping = {
    name: "nombre", barcode: "codigo", price: "precio",
    cost: "costo", stock: "stock", minStock: "min_stock",
    description: null, category: null,
  };

  const options = { mode: "create" as const, matchBy: "barcode" as const, updateFields: [] as string[] };

  it("return valid rows for correct data", () => {
    const raw = [{ nombre: "Producto 1", codigo: "123", precio: "100", costo: "50", stock: "10", min_stock: "2" }];
    const result = validateImportRows(raw, mapping, mockCategories, mockProducts, options);
    expect(result.validRows).toHaveLength(1);
    expect(result.totalRows).toBe(1);
  });

  it("mark rows with errors for missing name", () => {
    const raw = [{ nombre: "", codigo: "123" }];
    const result = validateImportRows(raw, mapping, mockCategories, mockProducts, options);
    expect(result.errorRows).toHaveLength(1);
  });

  it("detect barcode duplicates within file", () => {
    const raw = [
      { nombre: "A", codigo: "111", precio: "10", costo: "5", stock: "1", min_stock: "0" },
      { nombre: "B", codigo: "111", precio: "10", costo: "5", stock: "1", min_stock: "0" },
    ];
    const result = validateImportRows(raw, mapping, mockCategories, mockProducts, options);
    expect(result.errorRows).toHaveLength(1);
    expect(result.errorRows[0].errors[0].field).toBe("barcode");
  });

  it("detect barcode conflict with existing products", () => {
    const raw = [{ nombre: "New Mouse", codigo: "7790001000011", precio: "10", costo: "5", stock: "1", min_stock: "0" }];
    const result = validateImportRows(raw, mapping, mockCategories, mockProducts, options);
    expect(result.errorRows).toHaveLength(1);
    expect(result.errorRows[0].errors[0].field).toBe("barcode");
  });

  it("mark existing products in create mode", () => {
    const nameMapping = { ...mapping, barcode: null };
    const nameOptions = { mode: "create" as const, matchBy: "name" as const, updateFields: [] as string[] };
    const raw = [{ nombre: "Mouse", precio: "10", costo: "5", stock: "1", min_stock: "0" }];
    const result = validateImportRows(raw, nameMapping, mockCategories, mockProducts, nameOptions);
    expect(result.existingRows).toHaveLength(1);
  });

  it("parse price/cost as numbers", () => {
    const raw = [{ nombre: "Test", codigo: "999", precio: "99.99", costo: "49.50", stock: "5", min_stock: "1" }];
    const result = validateImportRows(raw, mapping, mockCategories, mockProducts, options);
    expect(result.validRows[0].data.price).toBe(99.99);
    expect(result.validRows[0].data.cost).toBe(49.5);
  });

  it("handle invalid price", () => {
    const raw = [{ nombre: "Test", codigo: "999", precio: "not-a-number", costo: "50", stock: "5", min_stock: "0" }];
    const result = validateImportRows(raw, mapping, mockCategories, mockProducts, options);
    expect(result.errorRows).toHaveLength(1);
  });
});

describe("generateErrorCSV", () => {
  it("generate CSV from error rows", () => {
    const errors = [
      {
        row: 1, data: { name: "Test" } as any, errors: [
          { row: 1, field: "price", message: "Precio inválido", value: "abc" },
        ], isDuplicate: false,
      },
    ];
    const csv = generateErrorCSV(errors);
    expect(csv).toContain("Fila");
    expect(csv).toContain("Precio inválido");
    expect(csv).toContain("abc");
  });
});

describe("generateImportReport", () => {
  it("generate report with validation results", () => {
    const result = {
      totalRows: 10, validRows: [1, 2] as any, errorRows: [] as any,
      duplicateRows: [] as any, existingRows: [] as any,
      categoryAnalysis: { allUniqueNames: [], existing: [], newCategories: [] },
    };
    const report = generateImportReport(result);
    expect(report).toContain("Total de filas: 10");
    expect(report).toContain("Filas válidas: 2");
  });

  it("include import results when provided", () => {
    const result = {
      totalRows: 5, validRows: [] as any, errorRows: [] as any,
      duplicateRows: [] as any, existingRows: [] as any,
      categoryAnalysis: { allUniqueNames: [], existing: [], newCategories: [] },
    };
    const importResult = { created: 3, updated: 1, skipped: 0, errors: [] };
    const report = generateImportReport(result, importResult);
    expect(report).toContain("Creados: 3");
  });
});
