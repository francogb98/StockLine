/**
 * Text normalization and string similarity utilities for duplicate detection.
 */

/**
 * Normalizes text for comparison:
 * - Converts to lowercase
 * - Removes accents/diacritics via NFD decomposition
 * - Strips non-alphanumeric characters (keeps spaces)
 * - Collapses multiple spaces into one
 * - Trims leading/trailing whitespace
 *
 * "Coca-Cola 500ml" / "coca cola 500 ml" / "COCA COLA 500 ML" all normalize equal.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes the Levenshtein edit distance between two strings.
 * Returns the minimum number of single-character edits (insertions,
 * deletions, or substitutions) required to change one string into the other.
 */
function levenshteinDistance(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  // Use single-row DP for memory efficiency
  let prev = Array.from({ length: lenB + 1 }, (_, i) => i);
  let curr = new Array<number>(lenB + 1);

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,       // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost,     // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lenB];
}

/**
 * Computes bigrams (character pairs) for Dice coefficient calculation.
 */
function getBigrams(str: string): Map<string, number> {
  const bigrams = new Map<string, number>();
  for (let i = 0; i < str.length - 1; i++) {
    const pair = str.substring(i, i + 2);
    bigrams.set(pair, (bigrams.get(pair) ?? 0) + 1);
  }
  return bigrams;
}

/**
 * Computes the Sorensen-Dice coefficient between two strings using bigrams.
 * Returns a value between 0 (no similarity) and 1 (identical).
 */
function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);

  let intersectionSize = 0;
  for (const [pair, countA] of bigramsA) {
    const countB = bigramsB.get(pair);
    if (countB !== undefined) {
      intersectionSize += Math.min(countA, countB);
    }
  }

  return (2 * intersectionSize) / (a.length - 1 + (b.length - 1));
}

/**
 * Calculates similarity between two strings, returning a value between 0 and 1.
 *
 * Uses a combined approach:
 * 1. Normalizes both strings first (lowercase, accent fold, strip special chars)
 * 2. Returns 1 immediately for exact normalized matches
 * 3. Combines Levenshtein distance ratio and Dice coefficient for a robust score
 *
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns Similarity score between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const a = normalizeText(str1);
  const b = normalizeText(str2);

  if (!a || !b) return 0;
  if (a === b) return 1;

  // Levenshtein-based similarity (normalized by the longer string length)
  const maxLen = Math.max(a.length, b.length);
  const levDist = levenshteinDistance(a, b);
  const levSimilarity = 1 - levDist / maxLen;

  // Dice coefficient over bigrams
  const dice = diceCoefficient(a, b);

  // Weighted combination: Dice handles word-order swaps better,
  // Levenshtein handles typos/short strings better
  return 0.5 * levSimilarity + 0.5 * dice;
}
