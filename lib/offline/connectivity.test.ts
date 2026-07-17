// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { isOnline, onStatusChange } from "@/lib/offline/connectivity";

describe("connectivity", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isOnline returns navigator.onLine value", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(isOnline()).toBe(true);

    vi.stubGlobal("navigator", { onLine: false });
    expect(isOnline()).toBe(false);
  });

  it("onStatusChange returns unsubscribe function", () => {
    const callback = vi.fn();
    const unsub = onStatusChange(callback);

    expect(typeof unsub).toBe("function");
    unsub();
  });

  it("onStatusChange calls callback on online event", () => {
    const callback = vi.fn();
    const unsub = onStatusChange(callback);

    window.dispatchEvent(new Event("online"));
    expect(callback).toHaveBeenCalledWith(true);

    unsub();
  });

  it("onStatusChange calls callback on offline event", () => {
    const callback = vi.fn();
    const unsub = onStatusChange(callback);

    window.dispatchEvent(new Event("offline"));
    expect(callback).toHaveBeenCalledWith(false);

    unsub();
  });

  it("unsubscribe stops events from triggering callback", () => {
    const callback = vi.fn();
    const unsub = onStatusChange(callback);

    unsub();
    window.dispatchEvent(new Event("online"));
    expect(callback).not.toHaveBeenCalled();
  });
});
