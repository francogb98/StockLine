import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "./route";
import * as apiAuth from "@/lib/api-auth";
import * as devolucionesService from "@/lib/devoluciones-service";

vi.mock("@/lib/devoluciones-service", () => ({
  createDevolucion: vi.fn(),
  findDevolucion: vi.fn(),
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
};

const employeeUser = {
  id: "user-2",
  email: "employee@store.com",
  name: "Employee",
  role: "employee",
  storeId: "store-1",
};

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/devoluciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/devoluciones", () => {
  it("returns 401 when not authenticated", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      response: new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    });

    const response = await POST(
      createRequest({
        ventaId: "sale-1",
        detalles: [{ saleItemId: "si-1", cantidad: 1 }],
      }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(401);
  });

  it("returns 400 when payload is invalid", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });

    const response = await POST(
      createRequest({ ventaId: "", detalles: [] }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(400);
  });

  it("returns 400 when cantidad is zero or negative", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });

    const response = await POST(
      createRequest({
        ventaId: "sale-1",
        detalles: [{ saleItemId: "si-1", cantidad: 0 }],
      }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(400);
  });

  it("allows admin to create a return", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });
    vi.mocked(devolucionesService.createDevolucion).mockResolvedValue({
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

    const response = await POST(
      createRequest({
        ventaId: "sale-1",
        detalles: [{ saleItemId: "si-1", cantidad: 1 }],
      }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBe("dev-1");
    expect(data.montoTotalDevuelto).toBe(100);
  });

  it("allows employee to create a return", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: employeeUser,
    });
    vi.mocked(devolucionesService.createDevolucion).mockResolvedValue({
      id: "dev-2",
      storeId: "store-1",
      ventaId: "sale-1",
      userId: "user-2",
      fecha: new Date(),
      motivo: null,
      observaciones: null,
      montoTotalDevuelto: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
      detalles: [],
    } as any);

    const response = await POST(
      createRequest({
        ventaId: "sale-1",
        detalles: [{ saleItemId: "si-1", cantidad: 1 }],
      }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(201);
  });

  it("returns the status from DevolucionProcessingError", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });
    const { DevolucionProcessingError } = await import(
      "@/lib/devoluciones-service"
    );
    vi.mocked(devolucionesService.createDevolucion).mockRejectedValue(
      new DevolucionProcessingError("Venta no encontrada", 404),
    );

    const response = await POST(
      createRequest({
        ventaId: "no-existe",
        detalles: [{ saleItemId: "si-1", cantidad: 1 }],
      }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Venta no encontrada");
  });

  it("returns 500 on unexpected error", async () => {
    vi.spyOn(apiAuth, "requireSessionUser").mockResolvedValue({
      sessionId: "test-session",
      user: adminUser,
    });
    vi.mocked(devolucionesService.createDevolucion).mockRejectedValue(
      new Error("boom"),
    );

    const response = await POST(
      createRequest({
        ventaId: "sale-1",
        detalles: [{ saleItemId: "si-1", cantidad: 1 }],
      }),
    );
    if (!response) throw new Error("Expected response");
    expect(response.status).toBe(500);
  });
});
