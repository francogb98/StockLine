import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
} from "@/lib/mock-data";

describe("formatCurrency", () => {
  it("format number as ARS currency", () => {
    const result = formatCurrency(15000);
    expect(result).toContain("15.000");
  });

  it("handle zero", () => {
    expect(formatCurrency(0)).toBeTruthy();
  });

  it("handle decimals", () => {
    const result = formatCurrency(99.99);
    expect(result).toContain("99");
  });
});

describe("formatDate", () => {
  it("format date with short style", () => {
    const date = new Date(2024, 0, 15, 10, 30);
    const result = formatDate(date);
    expect(result).toBeTruthy();
  });
});

describe("formatTime", () => {
  it("format time only", () => {
    const date = new Date(2024, 0, 1, 14, 30);
    const result = formatTime(date);
    expect(result).toBeTruthy();
  });
});

describe("formatDateTime", () => {
  it("format date from Date", () => {
    const result = formatDateTime(new Date(2024, 0, 1));
    expect(result).toBeTruthy();
  });

  it("format date from string", () => {
    const result = formatDateTime("2024-01-01T12:00:00");
    expect(result).toBeTruthy();
  });
});
