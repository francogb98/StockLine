import { describe, it, expect } from "vitest";
import {
  validatePassword,
  hasNumber,
  hasSpecialChar,
  hasUppercase,
  hasLowercase,
} from "@/lib/password-validation";

describe("validatePassword", () => {
  it("reject empty password", () => {
    const result = validatePassword("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("La contraseña es requerida");
  });

  it("reject password shorter than 6 characters", () => {
    const result = validatePassword("Ab1!");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("La contraseña debe tener al menos 6 caracteres");
  });

  it("accept valid password of 6 characters", () => {
    expect(validatePassword("abcdef").isValid).toBe(true);
  });

  it("accept valid password with mixed characters", () => {
    expect(validatePassword("MiPassword123!").isValid).toBe(true);
  });
});

describe("hasNumber", () => {
  it("return true when password contains a number", () => {
    expect(hasNumber("abc123")).toBe(true);
  });

  it("return false when password has no numbers", () => {
    expect(hasNumber("abcdef")).toBe(false);
  });
});

describe("hasSpecialChar", () => {
  it("return true when password contains a special char", () => {
    expect(hasSpecialChar("abc!def")).toBe(true);
    expect(hasSpecialChar("abc@def")).toBe(true);
    expect(hasSpecialChar("abc#def")).toBe(true);
  });

  it("return false when password has no special chars", () => {
    expect(hasSpecialChar("abcdef1")).toBe(false);
  });
});

describe("hasUppercase", () => {
  it("return true when password has uppercase", () => {
    expect(hasUppercase("Abcdef")).toBe(true);
  });

  it("return false when all lowercase", () => {
    expect(hasUppercase("abcdef")).toBe(false);
  });
});

describe("hasLowercase", () => {
  it("return true when password has lowercase", () => {
    expect(hasLowercase("ABCDEf")).toBe(true);
  });

  it("return false when all uppercase", () => {
    expect(hasLowercase("ABCDEF")).toBe(false);
  });
});
