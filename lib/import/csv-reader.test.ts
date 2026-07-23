// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import {
  getFileExtension,
  validateFile,
  formatFileSize,
} from "./csv-reader";

describe("getFileExtension", () => {
  it("extract extension from filename", () => {
    expect(getFileExtension("data.xlsx")).toBe(".xlsx");
    expect(getFileExtension("data.CSV")).toBe(".csv");
    expect(getFileExtension("data.xls")).toBe(".xls");
  });

  it("return empty string when no extension", () => {
    expect(getFileExtension("data")).toBe("");
  });
});

describe("validateFile", () => {
  function createMockFile(name: string, size: number): File {
    return new File([""], name, { type: "application/octet-stream" });
  }

  it("accept valid .xlsx file", () => {
    const file = createMockFile("data.xlsx", 1024);
    const result = validateFile(file);
    expect(result.valid).toBe(true);
  });

  it("accept valid .csv file", () => {
    const file = createMockFile("data.csv", 1024);
    const result = validateFile(file);
    expect(result.valid).toBe(true);
  });

  it("reject unsupported format", () => {
    const file = createMockFile("data.pdf", 1024);
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Formato no soportado");
  });

  it("reject file exceeding size limit", () => {
    const large = new Array(11 * 1024 * 1024).fill("a").join("");
    const file = new File([large], "data.xlsx");
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("supera el tamaño máximo");
  });
});

describe("formatFileSize", () => {
  it("format bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("format kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("format megabytes", () => {
    expect(formatFileSize(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
});
