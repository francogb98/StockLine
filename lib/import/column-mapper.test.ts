import { describe, it, expect } from "vitest";
import { detectColumns, getSystemFieldsForSelect } from "./column-mapper";

describe("detectColumns", () => {
  it("detect all fields from spanish headers", () => {
    const headers = [
      "Nombre", "Código", "Detalle", "Categoría",
      "Precio", "Costo", "Stock", "Stock Mínimo",
    ];
    const mapping = detectColumns(headers);
    expect(mapping.name).toBe("Nombre");
    expect(mapping.barcode).toBe("Código");
    expect(mapping.description).toBe("Detalle");
    expect(mapping.category).toBe("Categoría");
    expect(mapping.price).toBe("Precio");
    expect(mapping.cost).toBe("Costo");
    expect(mapping.stock).toBe("Stock");
    expect(mapping.minStock).toBe("Stock Mínimo");
  });

  it("detect using aliases", () => {
    const mapping = detectColumns(["Producto", "Precio", "Cantidad"]);
    expect(mapping.name).toBe("Producto");
    expect(mapping.price).toBe("Precio");
    expect(mapping.stock).toBe("Cantidad");
  });

  it("detect english headers", () => {
    const mapping = detectColumns(["Name", "Price", "Quantity", "Category"]);
    expect(mapping.name).toBe("Name");
    expect(mapping.price).toBe("Price");
    expect(mapping.stock).toBe("Quantity");
    expect(mapping.category).toBe("Category");
  });

  it("handle unknown headers gracefully", () => {
    const mapping = detectColumns(["Unknown1", "Unknown2"]);
    expect(Object.values(mapping).every((v) => v === null)).toBe(true);
  });

  it("handle mixed case and accents", () => {
    const mapping = detectColumns(["CÓDIGO BARRAS", "PRECIO VENTA"]);
    expect(mapping.barcode).toBe("CÓDIGO BARRAS");
    expect(mapping.price).toBe("PRECIO VENTA");
  });
});

describe("getSystemFieldsForSelect", () => {
  it("return all fields with labels", () => {
    const fields = getSystemFieldsForSelect();
    expect(fields).toHaveLength(8);
    expect(fields[0]).toEqual({ value: "name", label: "Nombre", required: true });
  });

  it("only name is marked required", () => {
    const fields = getSystemFieldsForSelect();
    const required = fields.filter((f) => f.required);
    expect(required).toHaveLength(1);
    expect(required[0].value).toBe("name");
  });
});
