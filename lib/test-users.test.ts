import { describe, it, expect } from "vitest";
import { isTestUserEmail } from "@/lib/test-users";

describe("isTestUserEmail", () => {
  it("return true for admin test user", () => {
    expect(isTestUserEmail("admin@techmart.com")).toBe(true);
  });

  it("return true for employee test user", () => {
    expect(isTestUserEmail("empleado@techmart.com")).toBe(true);
  });

  it("be case insensitive", () => {
    expect(isTestUserEmail("ADMIN@TECHMART.COM")).toBe(true);
    expect(isTestUserEmail("Admin@Techmart.com")).toBe(true);
  });

  it("return false for non-test email", () => {
    expect(isTestUserEmail("real@store.com")).toBe(false);
  });

  it("return false for empty string", () => {
    expect(isTestUserEmail("")).toBe(false);
  });
});
