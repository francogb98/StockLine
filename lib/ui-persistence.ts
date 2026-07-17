const STORAGE_PREFIX = "vendepro:";

function getKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function saveUIState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(getKey(key), JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadUIState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(getKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function removeUIState(key: string): void {
  try {
    localStorage.removeItem(getKey(key));
  } catch {
    // ignore
  }
}
