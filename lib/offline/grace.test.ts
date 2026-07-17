// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { recordConnection, isGraceActive, getGraceState } from "@/lib/offline/grace";

const STORAGE_KEY = "techmart-grace-period";

describe("grace", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isGraceActive returns false when no connection recorded", async () => {
    expect(await isGraceActive()).toBe(false);
  });

  it("recordConnection makes grace active", async () => {
    await recordConnection();
    expect(await isGraceActive()).toBe(true);
  });

  it("isGraceActive returns false after 5 minutes", async () => {
    await recordConnection();
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    expect(await isGraceActive()).toBe(false);
  });

  it("isGraceActive returns true within 5-minute window", async () => {
    await recordConnection();
    vi.advanceTimersByTime(4 * 60 * 1000); // 4 minutes

    expect(await isGraceActive()).toBe(true);
  });

  it("getGraceState returns correct state after recordConnection", async () => {
    await recordConnection();
    const state = await getGraceState();

    expect(state.isActive).toBe(true);
    expect(state.expiresAt).not.toBeNull();
    expect(state.lastConnectedAt).not.toBeNull();
  });

  it("getGraceState returns inactive state when no connection recorded", async () => {
    const state = await getGraceState();

    expect(state.isActive).toBe(false);
    expect(state.expiresAt).toBeNull();
    expect(state.lastConnectedAt).toBeNull();
  });

  it("recordConnection resets the grace window", async () => {
    await recordConnection();
    vi.advanceTimersByTime(3 * 60 * 1000); // 3 minutes
    expect(await isGraceActive()).toBe(true);

    await recordConnection(); // Reset
    vi.advanceTimersByTime(3 * 60 * 1000); // 3 more minutes (6 total from first)
    expect(await isGraceActive()).toBe(true); // Still active from reset
  });
});
