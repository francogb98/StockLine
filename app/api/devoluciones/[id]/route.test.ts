import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "./route";
import * as apiAuth from "@/lib/api-auth";
import * as devolucionesService from "@/lib/devoluciones-service";

vi.mock("@/lib/devoluciones-service", () => ({
  findDevolucion: vi.fn(),
  createDevolucion: vi.fn(),
  DevolucionProcessingError: class extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

const adminUser = {
  id: "user-1",
  email: "admin@store.com",
  name: "Admin",
  role: "admin",
  storeId: "store-1",
  isSuperAdmin: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/devoluciones/:id", () => {
  it("returns 401 when not authenticated", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      response: new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    });

    const response = await GET(new Request("http://localhost/api/devoluciones/dev-1"), {
      params: Promise.resolve({ id: "dev-1" }),
    } as any);
    expect(response.status).toBe(401);
  });

  it("returns the devolucion by id", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });
    vi.mocked(devolucionesService.findDevolucion).mockResolvedValue({
      id: "dev-1",
      storeId: "store-1",
      ventaId: "sale-1",
      userId: "user-1",
      fecha: new Date(),
      motivo: null,
      observaciones: null,
      montoTotalDevuelto: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      detalles: [],
    } as any);

    const response = await GET(new Request("http://localhost/api/devoluciones/dev-1"), {
      params: Promise.resolve({ id: "dev-1" }),
    } as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe("dev-1");
  });

  it("returns 404 when devolucion not found", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });
    vi.mocked(devolucionesService.findDevolucion).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/devoluciones/missing"), {
      params: Promise.resolve({ id: "missing" }),
    } as any);
    expect(response.status).toBe(404);
  });
});
