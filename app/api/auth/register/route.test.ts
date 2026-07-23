import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import * as apiAuth from "@/lib/api-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    store: { create: vi.fn() },
    subscription: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

afterEach(() => { vi.restoreAllMocks(); });

describe("POST /api/auth/register", () => {
  it("reject missing fields", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("reject already registered email", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "existing" } as any);

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "exists@test.com", password: "12345678", name: "User", storeName: "Store" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("register new user and store", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      const tx = {
        store: { create: vi.fn().mockResolvedValue({ id: "store-new" }) },
        subscription: { create: vi.fn().mockResolvedValue({}) },
        user: { create: vi.fn().mockResolvedValue({ id: "user-new", email: "new@test.com" }) },
      };
      return cb(tx);
    });

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com", password: "12345678", name: "New User", storeName: "New Store" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.email).toBe("new@test.com");
  });
});
