import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "./route";
import * as apiAuth from "@/lib/api-auth";

const saUser = {
  id: "user-sa-1",
  email: "sa@platform.com",
  name: "Super Admin",
  role: "admin",
  storeId: "store-1",
  isSuperAdmin: true,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/super-admin/me", () => {
  it("returns 200 with the SA user shape", async () => {
    vi.spyOn(apiAuth, "requireSuperAdmin").mockResolvedValue({
      auth: { sessionId: "session-sa-1", user: saUser },
    } as any);

    const response = await GET();
    if (!response) throw new Error("Expected response");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: saUser.id,
      email: saUser.email,
      name: saUser.name,
      role: saUser.role,
      storeId: saUser.storeId,
      isSuperAdmin: true,
    });
  });

  it("returns 403 when the session is not a Super Admin", async () => {
    vi.spyOn(apiAuth, "requireSuperAdmin").mockResolvedValue({
      response: new Response(
        JSON.stringify({ error: "Acceso restringido a Super Admin" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    });

    const response = await GET();
    if (!response) throw new Error("Expected response");

    expect(response.status).toBe(403);
  });

  it("returns 401 when there is no authenticated session", async () => {
    vi.spyOn(apiAuth, "requireSuperAdmin").mockResolvedValue({
      response: new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    });

    const response = await GET();
    if (!response) throw new Error("Expected response");

    expect(response.status).toBe(401);
  });
});
