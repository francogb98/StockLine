import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merge class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handle conditional classes", () => {
    expect(cn("base", false && "hidden", "block")).toBe("base block");
  });

  it("resolve tailwind conflicts", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });

  it("handle undefined and null", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });

  it("handle empty inputs", () => {
    expect(cn()).toBe("");
  });
});
