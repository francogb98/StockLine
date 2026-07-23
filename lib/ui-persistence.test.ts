// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveUIState, loadUIState, removeUIState } from "@/lib/ui-persistence";

beforeEach(() => {
  localStorage.clear();
});

describe("ui-persistence", () => {
  it("save and load a value", () => {
    saveUIState("theme", "dark");
    expect(loadUIState("theme", "light")).toBe("dark");
  });

  it("return fallback when key not found", () => {
    expect(loadUIState("nonexistent", 42)).toBe(42);
  });

  it("store complex objects", () => {
    const data = { a: 1, b: [2, 3], c: { d: "e" } };
    saveUIState("complex", data);
    expect(loadUIState("complex", null)).toEqual(data);
  });

  it("remove a stored value", () => {
    saveUIState("temp", "value");
    removeUIState("temp");
    expect(loadUIState("temp", "default")).toBe("default");
  });

  it("handle storage errors gracefully", () => {
    const orig = localStorage.setItem;
    localStorage.setItem = vi.fn(() => { throw new Error("Storage full"); });

    expect(() => saveUIState("key", "val")).not.toThrow();

    localStorage.setItem = orig;
  });
});
