export interface TaxConfig {
  enabled: boolean;
  rate: number;
  name: string;
}

const DEFAULT_TAX_CONFIG: TaxConfig = {
  enabled: false,
  rate: 21,
  name: "IVA",
};

export function getTaxConfig(storeConfig?: Record<string, unknown> | null): TaxConfig {
  if (!storeConfig || typeof storeConfig !== "object") {
    return DEFAULT_TAX_CONFIG;
  }

  const tax = (storeConfig as Record<string, unknown>).tax;
  if (!tax || typeof tax !== "object") {
    return DEFAULT_TAX_CONFIG;
  }

  const taxObj = tax as Record<string, unknown>;

  return {
    enabled: Boolean(taxObj.enabled),
    rate: typeof taxObj.rate === "number" && taxObj.rate >= 0 && taxObj.rate <= 100
      ? taxObj.rate
      : DEFAULT_TAX_CONFIG.rate,
    name: typeof taxObj.name === "string" && taxObj.name.trim()
      ? taxObj.name
      : DEFAULT_TAX_CONFIG.name,
  };
}

export function calculateTax(subtotal: number, config: TaxConfig): number {
  if (!config.enabled || config.rate === 0) return 0;
  return Math.round((subtotal * config.rate / 100) * 100) / 100;
}

export function calculateTotal(subtotal: number, tax: number, discount: number = 0): number {
  return Math.round((subtotal - discount + tax) * 100) / 100;
}
