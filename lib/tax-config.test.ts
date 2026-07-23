import { describe, it, expect } from "vitest";
import {
  getTaxConfig,
  calculateTax,
  calculateTotal,
  type TaxConfig,
} from "@/lib/tax-config";

describe("getTaxConfig", () => {
  it("return defaults when no config provided", () => {
    const config = getTaxConfig(null);
    expect(config.enabled).toBe(false);
    expect(config.rate).toBe(21);
    expect(config.name).toBe("IVA");
  });

  it("return defaults when config is not an object", () => {
    const config = getTaxConfig("invalid" as any);
    expect(config.enabled).toBe(false);
  });

  it("return defaults when tax field is missing", () => {
    const config = getTaxConfig({ other: "data" });
    expect(config.enabled).toBe(false);
  });

  it("extract enabled flag", () => {
    const config = getTaxConfig({ tax: { enabled: true } } as any);
    expect(config.enabled).toBe(true);
  });

  it("extract rate within valid range", () => {
    const config = getTaxConfig({ tax: { enabled: true, rate: 10.5 } } as any);
    expect(config.rate).toBe(10.5);
  });

  it("clamp rate to default if out of range", () => {
    const config = getTaxConfig({ tax: { enabled: true, rate: 150 } } as any);
    expect(config.rate).toBe(21);
  });

  it("extract name", () => {
    const config = getTaxConfig({ tax: { name: "GST" } } as any);
    expect(config.name).toBe("GST");
  });

  it("use default name if empty", () => {
    const config = getTaxConfig({ tax: { name: "" } } as any);
    expect(config.name).toBe("IVA");
  });
});

describe("calculateTax", () => {
  it("return 0 when tax is disabled", () => {
    const config: TaxConfig = { enabled: false, rate: 21, name: "IVA" };
    expect(calculateTax(1000, config)).toBe(0);
  });

  it("return 0 when rate is 0", () => {
    const config: TaxConfig = { enabled: true, rate: 0, name: "IVA" };
    expect(calculateTax(1000, config)).toBe(0);
  });

  it("calculate tax correctly", () => {
    const config: TaxConfig = { enabled: true, rate: 21, name: "IVA" };
    expect(calculateTax(1000, config)).toBe(210);
  });

  it("round to 2 decimal places", () => {
    const config: TaxConfig = { enabled: true, rate: 10.5, name: "IVA" };
    expect(calculateTax(999, config)).toBe(104.9);
  });
});

describe("calculateTotal", () => {
  it("calculate total with tax", () => {
    expect(calculateTotal(1000, 210)).toBe(1210);
  });

  it("apply discount", () => {
    expect(calculateTotal(1000, 210, 100)).toBe(1110);
  });

  it("handle zero discount", () => {
    expect(calculateTotal(1000, 0)).toBe(1000);
  });

  it("round to 2 decimal places", () => {
    expect(calculateTotal(10.5, 1.05)).toBe(11.55);
  });
});
