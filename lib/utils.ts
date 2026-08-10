import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatQuantity(value: number, unit: string, maxDecimals = 3): string {
  if (!Number.isFinite(value)) return `0 ${unit}`;
  const fixed = Number(value).toFixed(maxDecimals);
  const trimmed = fixed.replace(/\.?0+$/, "");
  return `${trimmed} ${unit}`.trim();
}

export function formatQuantityForCart(
  value: number,
  unit: string,
  quantityType: "DISCRETA" | "CONTINUA",
): string {
  if (quantityType === "DISCRETA" || unit === "unit") {
    return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, "");
  }
  return formatQuantity(value, unit);
}

export function formatUnitLabel(unit: string): string {
  switch (unit) {
    case "unit":
      return "unidad";
    case "kg":
      return "kg";
    case "g":
      return "g";
    case "L":
      return "L";
    case "mL":
      return "mL";
    case "m":
      return "m";
    case "cm":
      return "cm";
    default:
      return unit;
  }
}
