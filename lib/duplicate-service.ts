import { findProducts, type DataContext } from "@/lib/data-access";
import type { StoredProduct } from "@/lib/session-store";

/**
 * Normalizes a product name for duplicate comparison:
 * lowercase, accent folding, punctuation removed, whitespace collapsed.
 * "Coca-Cola 500ml" / "Coca Cola 500 ml" / "COCA COLA 500 ML" all normalize equal.
 */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(name: string): Set<string> {
  return new Set(normalizeProductName(name).split(" ").filter(Boolean));
}

/** Jaccard similarity over normalized token sets. Exact normalized equality => 1. */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeProductName(a);
  const nb = normalizeProductName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : intersection / union;
}

export type DuplicateReason = "barcode" | "name_exact" | "name_similar" | "same_category";

export interface DuplicateMatch {
  product: StoredProduct;
  score: number;
  reasons: DuplicateReason[];
}

export interface DuplicateCheckResult {
  /** Strong match (same barcode): creation must be blocked. */
  block: StoredProduct | null;
  /** Probable matches: user may review and still create. */
  warnings: DuplicateMatch[];
}

const MAX_WARNINGS = 5;
const SIMILARITY_THRESHOLD_SAME_CATEGORY = 0.6;
const SIMILARITY_THRESHOLD_OTHER_CATEGORY = 0.8;

export async function checkDuplicates(
  ctx: DataContext,
  input: {
    name?: string;
    barcode?: string | null;
    categoryId?: string;
    excludeId?: string;
  },
): Promise<DuplicateCheckResult> {
  // findProducts only returns ACTIVE products — merged products never match.
  const products = await findProducts(ctx);
  const barcode = input.barcode?.trim().toLowerCase() || null;
  const inputName = input.name ?? "";

  let block: StoredProduct | null = null;
  const warnings: DuplicateMatch[] = [];

  for (const product of products) {
    if (product.id === input.excludeId) continue;

    const productBarcode = product.barcode?.trim().toLowerCase() || null;
    if (barcode && productBarcode && productBarcode === barcode) {
      block = product;
      continue;
    }

    if (!inputName.trim()) continue;

    const normalizedInput = normalizeProductName(inputName);
    if (!normalizedInput) continue;

    if (normalizeProductName(product.name) === normalizedInput) {
      warnings.push({ product, score: 1, reasons: ["name_exact"] });
      continue;
    }

    const score = nameSimilarity(inputName, product.name);
    const sameCategory =
      Boolean(input.categoryId) && product.categoryId === input.categoryId;
    const threshold = sameCategory
      ? SIMILARITY_THRESHOLD_SAME_CATEGORY
      : SIMILARITY_THRESHOLD_OTHER_CATEGORY;
    if (score >= threshold) {
      const reasons: DuplicateReason[] = ["name_similar"];
      if (sameCategory) reasons.push("same_category");
      warnings.push({ product, score, reasons });
    }
  }

  warnings.sort((a, b) => b.score - a.score);
  return { block, warnings: warnings.slice(0, MAX_WARNINGS) };
}

export interface DuplicateGroup {
  key: string;
  reason: "barcode" | "name";
  products: StoredProduct[];
}

/**
 * Groups existing ACTIVE products that look duplicated.
 * Read-only: never mutates anything.
 */
export async function findDuplicateGroups(
  ctx: DataContext,
): Promise<DuplicateGroup[]> {
  const products = await findProducts(ctx);

  const groups: DuplicateGroup[] = [];
  const barcodeGroups = new Map<string, StoredProduct[]>();
  const nameGroups = new Map<string, StoredProduct[]>();

  for (const product of products) {
    const barcode = product.barcode?.trim().toLowerCase();
    if (barcode) {
      const list = barcodeGroups.get(barcode) ?? [];
      list.push(product);
      barcodeGroups.set(barcode, list);
    }
    const normalized = normalizeProductName(product.name);
    if (normalized) {
      const list = nameGroups.get(normalized) ?? [];
      list.push(product);
      nameGroups.set(normalized, list);
    }
  }

  const seenPairSets = new Set<string>();
  const pairSetKey = (list: StoredProduct[]) =>
    list
      .map((p) => p.id)
      .sort()
      .join("|");

  for (const [barcode, list] of barcodeGroups) {
    if (list.length < 2) continue;
    seenPairSets.add(pairSetKey(list));
    groups.push({ key: `barcode:${barcode}`, reason: "barcode", products: list });
  }

  for (const [normalized, list] of nameGroups) {
    if (list.length < 2) continue;
    const setKey = pairSetKey(list);
    if (seenPairSets.has(setKey)) continue;
    seenPairSets.add(setKey);
    groups.push({ key: `name:${normalized}`, reason: "name", products: list });
  }

  return groups;
}
