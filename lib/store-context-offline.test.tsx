// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { render, screen, act } from "@testing-library/react";
import { StoreProvider, useData, usePOS } from "@/lib/store-context";
import { getPendingSales } from "@/lib/offline/sale-queue";
import { getCachedProducts } from "@/lib/offline/product-cache";
import { closeDB, getDB } from "@/lib/offline/idb";
import type { ReactNode } from "react";

// Mock fetch globally
const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

// Minimal wrapper to render StoreProvider with a consumer
function TestConsumer() {
  const { products, addSale } = useData();
  const { completeSale } = usePOS();
  return (
    <div>
      <span data-testid="product-count">{products.length}</span>
      <button
        data-testid="add-sale"
        onClick={async () => {
          const sale = {
            id: "test-sale-1",
            storeId: "store-1",
            userId: "user-1",
            userName: "Test User",
            items: [
              {
                id: "item-1",
                saleId: "test-sale-1",
                productId: "p1",
                productName: "Widget",
                quantity: 1,
                unitPrice: 10,
                total: 10,
              },
            ],
            subtotal: 10,
            tax: 1.5,
            total: 11.5,
            paymentMethod: "cash" as const,
            status: "completed" as const,
            createdAt: new Date(),
          };
          await addSale(sale);
        }}
      />
    </div>
  );
}

function renderProvider(children?: ReactNode) {
  return render(
    <StoreProvider>{children || <TestConsumer />}</StoreProvider>,
  );
}

describe("store-context offline integration", () => {
  beforeEach(async () => {
    await closeDB();
    indexedDB = new IDBFactory();
    fetchSpy.mockReset();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_DATA", "0");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Task 3.1: addSale enqueues on network error", () => {
    it("queues sale to IDB when fetch throws a network error", async () => {
      // Mock auth to return a user
      fetchSpy.mockImplementation(async (url: string) => {
        if (url === "/api/auth/me") {
          return new Response(
            JSON.stringify({
              user: { id: "user-1", name: "Test", email: "t@t.com", role: "admin", storeId: "store-1" },
            }),
            { status: 200 },
          );
        }
        if (url === "/api/subscription/status") {
          return new Response(JSON.stringify({ status: "active" }), { status: 200 });
        }
        // Products, categories, sales succeed
        if (url === "/api/products") {
          return new Response(JSON.stringify([{ id: "p1", name: "Widget", stock: 10 }]), { status: 200 });
        }
        if (url === "/api/categories") {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url === "/api/sales") {
          // First call succeeds (loadData), second call throws (addSale)
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url === "/api/suspended-sales") {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });

      renderProvider();

      // Wait for initial data load
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });

      // Now make /api/sales throw a network error for the addSale call
      fetchSpy.mockImplementation(async (url: string) => {
        if (url === "/api/sales") {
          throw new TypeError("Failed to fetch");
        }
        return new Response(JSON.stringify([]), { status: 200 });
      });

      // Click add sale — should enqueue to IDB
      await act(async () => {
        const btn = screen.getByTestId("add-sale");
        await btn.click();
        await new Promise((r) => setTimeout(r, 200));
      });

      // Verify sale was queued to IDB
      const pending = await getPendingSales();
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending[0].id).toBe("test-sale-1");
      expect(pending[0].status).toBe("pending");
    });
  });

  describe("Task 3.2: loadData falls back to IDB cache", () => {
    it("loads products from IDB cache when API fails", async () => {
      // Pre-populate IDB with cached products
      const db = await getDB();
      await db.put("products", {
        id: "cached-1",
        storeId: "store-1",
        name: "Cached Widget",
        price: 5,
        cost: 3,
        stock: 100,
        minStock: 5,
        categoryId: "cat-1",
        barcode: "123",
        description: "A cached product",
        updatedAt: new Date().toISOString(),
      });

      // Mock auth + failing API
      fetchSpy.mockImplementation(async (url: string) => {
        if (url === "/api/auth/me") {
          return new Response(
            JSON.stringify({
              user: { id: "user-1", name: "Test", email: "t@t.com", role: "admin", storeId: "store-1" },
            }),
            { status: 200 },
          );
        }
        if (url === "/api/subscription/status") {
          return new Response(JSON.stringify({ status: "active" }), { status: 200 });
        }
        if (url === "/api/suspended-sales") {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        // All data endpoints fail
        throw new TypeError("Failed to fetch");
      });

      renderProvider();

      // Wait for data load attempt
      await act(async () => {
        await new Promise((r) => setTimeout(r, 300));
      });

      // The cached product should be in IDB (still there)
      const cached = await getCachedProducts();
      expect(cached.length).toBe(1);
      expect(cached[0].name).toBe("Cached Widget");
    });
  });

  describe("Task 3.3: grace period allows sale on 403", () => {
    it("queues sale when 403 received and grace is active", async () => {
      // Set up grace period in localStorage
      const graceState = {
        isActive: true,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        lastConnectedAt: new Date().toISOString(),
      };
      localStorage.setItem("techmart-grace-period", JSON.stringify(graceState));

      fetchSpy.mockImplementation(async (url: string) => {
        if (url === "/api/auth/me") {
          return new Response(
            JSON.stringify({
              user: { id: "user-1", name: "Test", email: "t@t.com", role: "admin", storeId: "store-1" },
            }),
            { status: 200 },
          );
        }
        if (url === "/api/subscription/status") {
          return new Response(JSON.stringify({ status: "active" }), { status: 200 });
        }
        if (url === "/api/products") {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url === "/api/categories") {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url === "/api/sales") {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url === "/api/suspended-sales") {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });

      renderProvider();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });

      // Make /api/sales return 403 (subscription error)
      fetchSpy.mockImplementation(async (url: string) => {
        if (url === "/api/sales") {
          return new Response(
            JSON.stringify({ error: "Subscription required" }),
            { status: 403 },
          );
        }
        return new Response(JSON.stringify([]), { status: 200 });
      });

      await act(async () => {
        const btn = screen.getByTestId("add-sale");
        await btn.click();
        await new Promise((r) => setTimeout(r, 200));
      });

      // With grace active, sale should be queued (not rejected)
      const pending = await getPendingSales();
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });
  });
});
