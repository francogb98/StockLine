import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePassword,
} from "@/lib/password-utils.server";

describe("hashPassword", () => {
  it("produce a hash string", async () => {
    const hash = await hashPassword("MiPassword123!");
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe("string");
    expect(hash).not.toBe("MiPassword123!");
  });
});

describe("verifyPassword", () => {
  it("verify correct password", async () => {
    const hash = await hashPassword("CorrectPassword1");
    const match = await verifyPassword("CorrectPassword1", hash);
    expect(match).toBe(true);
  });

  it("reject wrong password", async () => {
    const hash = await hashPassword("CorrectPassword1");
    const match = await verifyPassword("WrongPassword1", hash);
    expect(match).toBe(false);
  });
});

describe("validatePassword (server)", () => {
  it("reject empty password", () => {
    const result = validatePassword("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("La contraseña es requerida");
  });

  it("reject password shorter than 8 characters", () => {
    const result = validatePassword("1234567");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("La contraseña debe tener al menos 8 caracteres");
  });

  it("accept password with 8 or more characters", () => {
    expect(validatePassword("12345678").isValid).toBe(true);
  });
});
