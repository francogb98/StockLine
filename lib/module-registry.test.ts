import { describe, it, expect } from "vitest";
import { NAVIGATION_ITEMS, getNavigationForRole } from "@/lib/module-registry";

describe("NAVIGATION_ITEMS", () => {
  it("have at least the core 4 items", () => {
    expect(NAVIGATION_ITEMS.length).toBeGreaterThanOrEqual(4);
  });

  it("include pos, stock, dashboard, cash-sessions", () => {
    const viewIds = NAVIGATION_ITEMS.map((i) => i.viewId);
    expect(viewIds).toContain("pos");
    expect(viewIds).toContain("stock");
    expect(viewIds).toContain("dashboard");
    expect(viewIds).toContain("cash-sessions");
  });

  it("include devoluciones as admin-only entry", () => {
    const devoluciones = NAVIGATION_ITEMS.find((i) => i.viewId === "devoluciones");
    expect(devoluciones).toBeDefined();
    expect(devoluciones?.adminOnly).toBe(true);
  });

  it("be sorted by sortOrder", () => {
    for (let i = 1; i < NAVIGATION_ITEMS.length; i++) {
      expect(NAVIGATION_ITEMS[i].sortOrder).toBeGreaterThanOrEqual(
        NAVIGATION_ITEMS[i - 1].sortOrder,
      );
    }
  });
});

describe("getNavigationForRole", () => {
  it("show admin-only items for admin role", () => {
    const items = getNavigationForRole("admin", true);
    expect(items.some((i) => i.viewId === "dashboard")).toBe(true);
    expect(items.some((i) => i.viewId === "cash-sessions")).toBe(true);
  });

  it("hide admin-only items for employee", () => {
    const items = getNavigationForRole("employee", true);
    expect(items.some((i) => i.viewId === "dashboard")).toBe(false);
    expect(items.some((i) => i.viewId === "cash-sessions")).toBe(false);
  });

  it("hide cash-sessions when cash control disabled", () => {
    const items = getNavigationForRole("admin", false);
    expect(items.some((i) => i.viewId === "cash-sessions")).toBe(false);
  });

  it("keep pos and stock for all roles", () => {
    const admin = getNavigationForRole("admin", false);
    const employee = getNavigationForRole("employee", false);

    expect(admin.some((i) => i.viewId === "pos")).toBe(true);
    expect(admin.some((i) => i.viewId === "stock")).toBe(true);
    expect(employee.some((i) => i.viewId === "pos")).toBe(true);
    expect(employee.some((i) => i.viewId === "stock")).toBe(true);
  });
});
