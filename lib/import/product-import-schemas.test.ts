import { describe, it, expect } from "vitest";
import {
  SYSTEM_FIELDS,
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  COLUMN_ALIASES,
  createEmptyMapping,
  isMappingComplete,
  getMissingRequiredFields,
  countMappedFields,
  importOptionsSchema,
  importMappingSchema,
} from "./product-import-schemas";

describe("SYSTEM_FIELDS", () => {
  it("have all expected fields", () => {
    expect(Object.keys(SYSTEM_FIELDS)).toEqual([
      "name", "barcode", "description", "category",
      "price", "cost", "stock", "minStock", "unit", "quantityType",
    ]);
  });
});

describe("REQUIRED_FIELDS", () => {
  it("only name is required", () => {
    expect(REQUIRED_FIELDS).toEqual(["name"]);
  });
});

describe("OPTIONAL_FIELDS", () => {
  it("have 9 optional fields", () => {
    expect(OPTIONAL_FIELDS).toHaveLength(9);
  });
});

describe("COLUMN_ALIASES", () => {
  it("have aliases for every system field", () => {
    expect(Object.keys(COLUMN_ALIASES).sort()).toEqual(Object.keys(SYSTEM_FIELDS).sort());
  });

  it("include spanish and english variants", () => {
    expect(COLUMN_ALIASES.name).toContain("nombre");
    expect(COLUMN_ALIASES.name).toContain("name");
    expect(COLUMN_ALIASES.price).toContain("precio");
    expect(COLUMN_ALIASES.price).toContain("price");
  });
});

describe("createEmptyMapping", () => {
  it("return all null values", () => {
    const mapping = createEmptyMapping();
    expect(Object.values(mapping).every((v) => v === null)).toBe(true);
  });
});

describe("isMappingComplete", () => {
  it("return true when name is mapped", () => {
    expect(isMappingComplete({ ...createEmptyMapping(), name: "nombre" })).toBe(true);
  });

  it("return false when name is null", () => {
    expect(isMappingComplete(createEmptyMapping())).toBe(false);
  });
});

describe("getMissingRequiredFields", () => {
  it("return name when missing", () => {
    expect(getMissingRequiredFields(createEmptyMapping())).toEqual(["name"]);
  });

  it("return empty when all required mapped", () => {
    const mapping = createEmptyMapping();
    mapping.name = "nombre";
    expect(getMissingRequiredFields(mapping)).toEqual([]);
  });
});

describe("countMappedFields", () => {
  it("count mapped fields", () => {
    const mapping = createEmptyMapping();
    mapping.name = "nombre";
    mapping.price = "precio";
    expect(countMappedFields(mapping)).toBe(2);
  });

  it("return 0 for empty mapping", () => {
    expect(countMappedFields(createEmptyMapping())).toBe(0);
  });
});

describe("importOptionsSchema", () => {
  it("accept valid options", () => {
    expect(
      importOptionsSchema.safeParse({
        mode: "create",
        matchBy: "barcode",
        updateFields: ["stock", "price"],
      }).success,
    ).toBe(true);
  });

  it("reject invalid mode", () => {
    expect(
      importOptionsSchema.safeParse({ mode: "delete", matchBy: "barcode", updateFields: [] }).success,
    ).toBe(false);
  });
});

describe("importMappingSchema", () => {
  it("accept valid mapping with all fields", () => {
    expect(
      importMappingSchema.safeParse({
        name: "nombre",
        barcode: null,
        description: null,
        category: null,
        price: "precio",
        cost: null,
        stock: null,
        minStock: null,
        unit: null,
        quantityType: null,
      }).success,
    ).toBe(true);
  });

  it("reject non-null required field types", () => {
    const result = importMappingSchema.safeParse({
      name: null,
      barcode: null,
      description: null,
      category: null,
      price: "precio",
      cost: null,
      stock: null,
      minStock: null,
      unit: null,
      quantityType: null,
    });
    expect(result.success).toBe(true);
  });
});
