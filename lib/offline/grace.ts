// Subscription Grace Period

import type { GracePeriodState } from "./types";

const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = "techmart-grace-period";

interface StoredGrace {
  isActive: boolean;
  expiresAt: string | null;
  lastConnectedAt: string | null;
}

function readGrace(): StoredGrace {
  if (typeof window === "undefined") {
    return { isActive: false, expiresAt: null, lastConnectedAt: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { isActive: false, expiresAt: null, lastConnectedAt: null };
    return JSON.parse(raw) as StoredGrace;
  } catch {
    return { isActive: false, expiresAt: null, lastConnectedAt: null };
  }
}

function writeGrace(state: StoredGrace): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — fail silently
  }
}

export async function recordConnection(): Promise<void> {
  const now = new Date().toISOString();
  const state: StoredGrace = {
    isActive: true,
    expiresAt: new Date(Date.now() + GRACE_PERIOD_MS).toISOString(),
    lastConnectedAt: now,
  };
  writeGrace(state);
}

export async function isGraceActive(): Promise<boolean> {
  const state = readGrace();
  if (!state.isActive || !state.expiresAt) return false;
  return Date.now() < new Date(state.expiresAt).getTime();
}

export async function getGraceState(): Promise<GracePeriodState> {
  const state = readGrace();
  const active = state.isActive
    ? Date.now() < new Date(state.expiresAt ?? "").getTime()
    : false;
  return {
    isActive: active,
    expiresAt: state.expiresAt,
    lastConnectedAt: state.lastConnectedAt,
  };
}
