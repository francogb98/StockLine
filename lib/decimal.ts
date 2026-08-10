import { Prisma } from "@prisma/client";
import {
  PRODUCT_UNITS,
  isValidProductUnit,
  type ProductUnit,
  type QuantityType,
} from "@/lib/types";

const QUANTITY_DECIMALS = 3;
const MONEY_DECIMALS = 2;

export function toDecimal(value: number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export function roundQuantity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** QUANTITY_DECIMALS;
  return Math.round(value * factor) / factor;
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** MONEY_DECIMALS;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function normalizeQuantityType(value: unknown): QuantityType {
  return value === "CONTINUA" ? "CONTINUA" : "DISCRETA";
}

export function normalizeUnit(value: unknown, quantityType: QuantityType): ProductUnit {
  if (typeof value !== "string") {
    return quantityType === "DISCRETA" ? "unit" : "kg";
  }
  const trimmed = value.trim();
  if (!isValidProductUnit(trimmed)) {
    return quantityType === "DISCRETA" ? "unit" : "kg";
  }
  if (quantityType === "DISCRETA" && trimmed !== "unit") {
    return "unit";
  }
  return trimmed;
}

export function assertValidUnitForQuantityType(
  unit: string,
  quantityType: QuantityType,
): void {
  if (quantityType === "DISCRETA") {
    if (unit !== "unit") {
      throw new Error(
        "Un producto DISCRETO solo puede utilizar la unidad 'unit'",
      );
    }
    return;
  }
  if (!isValidProductUnit(unit) || unit === "unit") {
    throw new Error(
      `Unidad inválida para producto continuo. Permitidas: ${PRODUCT_UNITS.filter((u) => u !== "unit").join(", ")}`,
    );
  }
}

export const QUANTITY_MAX_DECIMALS = QUANTITY_DECIMALS;
export const MONEY_MAX_DECIMALS = MONEY_DECIMALS;
