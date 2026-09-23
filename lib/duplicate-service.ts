import { findProducts, type DataContext } from "@/lib/data-access";
import type { StoredProduct } from "@/lib/session-store";
import { calculateSimilarity } from "@/lib/utils/string-similarity";

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

// ---- Fuzzy duplicate detection for audit module ----

export interface FuzzyDuplicatePair {
  productA: StoredProduct;
  productB: StoredProduct;
  similarity: number;
  reason: "barcode" | "name_exact" | "name_fuzzy";
}

export interface FuzzyDuplicateGroup {
  key: string;
  pairs: FuzzyDuplicatePair[];
  products: StoredProduct[];
}

const AUDIT_DEFAULT_THRESHOLD = 0.75;

/**
 * Finds groups of similar products using fuzzy string matching.
 * Compares all product pairs and groups those above the similarity threshold.
 * Also groups by exact barcode and exact normalized name.
 *
 * @param ctx - Data context (storeId, etc.)
 * @param threshold - Minimum similarity score to consider a match (default 0.75)
 */
export async function findFuzzyDuplicateGroups(
  ctx: DataContext,
  threshold: number = AUDIT_DEFAULT_THRESHOLD,
): Promise<FuzzyDuplicateGroup[]> {
  const products = await findProducts(ctx);
  if (products.length < 2) return [];

  // Phase 1: group by exact barcode
  const barcodeMap = new Map<string, StoredProduct[]>();
  for (const p of products) {
    const bc = p.barcode?.trim().toLowerCase();
    if (bc) {
      const list = barcodeMap.get(bc) ?? [];
      list.push(p);
      barcodeMap.set(bc, list);
    }
  }

  // Phase 2: find fuzzy name pairs
  const pairs: FuzzyDuplicatePair[] = [];
  const productIdsInPair = new Set<string>();

  // Exact barcode pairs
  for (const [, list] of barcodeMap) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        pairs.push({
          productA: list[i],
          productB: list[j],
          similarity: 1,
          reason: "barcode",
        });
        productIdsInPair.add(list[i].id);
        productIdsInPair.add(list[j].id);
      }
    }
  }

  // Exact normalized name pairs (not already captured by barcode)
  const normalizedNameMap = new Map<string, StoredProduct[]>();
  for (const p of products) {
    const norm = normalizeProductName(p.name);
    if (norm) {
      const list = normalizedNameMap.get(norm) ?? [];
      list.push(p);
      normalizedNameMap.set(norm, list);
    }
  }

  for (const [, list] of normalizedNameMap) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        // Skip if already paired by barcode
        const alreadyPaired = pairs.some(
          (p) =>
            (p.productA.id === list[i].id && p.productB.id === list[j].id) ||
            (p.productA.id === list[j].id && p.productB.id === list[i].id),
        );
        if (alreadyPaired) continue;

        pairs.push({
          productA: list[i],
          productB: list[j],
          similarity: 1,
          reason: "name_exact",
        });
        productIdsInPair.add(list[i].id);
        productIdsInPair.add(list[j].id);
      }
    }
  }

  // Fuzzy name comparison — O(n²) but fine for typical product catalogs (<10k items)
  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const a = products[i];
      const b = products[j];

      // Skip if already paired
      const alreadyPaired = pairs.some(
        (p) =>
          (p.productA.id === a.id && p.productB.id === b.id) ||
          (p.productA.id === b.id && p.productB.id === a.id),
      );
      if (alreadyPaired) continue;

      const sim = calculateSimilarity(a.name, b.name);
      if (sim >= threshold) {
        pairs.push({
          productA: a,
          productB: b,
          similarity: Math.round(sim * 100) / 100,
          reason: "name_fuzzy",
        });
        productIdsInPair.add(a.id);
        productIdsInPair.add(b.id);
      }
    }
  }

  if (pairs.length === 0) return [];

  // Phase 3: union-find to group connected pairs into clusters
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // Path compression
    let curr = x;
    while (curr !== root) {
      const next = parent.get(curr)!;
      parent.set(curr, root);
      curr = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const pair of pairs) {
    union(pair.productA.id, pair.productB.id);
  }

  // Group products by cluster root
  const clusterMap = new Map<string, Set<string>>();
  for (const id of productIdsInPair) {
    const root = find(id);
    if (!clusterMap.has(root)) clusterMap.set(root, new Set());
    clusterMap.get(root)!.add(id);
  }

  // Build output groups
  const productById = new Map(products.map((p) => [p.id, p]));
  const groups: FuzzyDuplicateGroup[] = [];
  let groupIdx = 0;

  for (const [, idSet] of clusterMap) {
    const groupProducts = [...idSet]
      .map((id) => productById.get(id)!)
      .filter(Boolean);

    if (groupProducts.length < 2) continue;

    const groupPairs = pairs.filter(
      (p) => idSet.has(p.productA.id) && idSet.has(p.productB.id),
    );

    groups.push({
      key: `fuzzy-${groupIdx++}`,
      pairs: groupPairs,
      products: groupProducts,
    });
  }

  // Sort groups by highest similarity first
  groups.sort((a, b) => {
    const maxA = Math.max(...a.pairs.map((p) => p.similarity));
    const maxB = Math.max(...b.pairs.map((p) => p.similarity));
    return maxB - maxA;
  });

  return groups;
}
