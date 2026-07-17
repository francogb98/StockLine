// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("@/hooks/use-offline-status", () => ({
  useOfflineStatus: vi.fn(),
}));

vi.mock("@/lib/offline", () => ({
  getPendingSales: vi.fn(),
  getFailedSales: vi.fn(),
  retryFailedSale: vi.fn(),
  flushSaleQueue: vi.fn(),
}));

import { PendingSalesDialog } from "@/components/offline/pending-sales-dialog";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import {
  getPendingSales,
  getFailedSales,
  retryFailedSale,
  flushSaleQueue,
} from "@/lib/offline";

const mockUseOfflineStatus = vi.mocked(useOfflineStatus);
const mockGetPendingSales = vi.mocked(getPendingSales);
const mockGetFailedSales = vi.mocked(getFailedSales);
const mockRetryFailedSale = vi.mocked(retryFailedSale);
const mockFlushSaleQueue = vi.mocked(flushSaleQueue);

const pendingSale = {
  id: "sale-p1",
  items: [{ productId: "p1", productName: "Widget", quantity: 2, unitPrice: 10, total: 20 }],
  subtotal: 20,
  tax: 0,
  total: 20,
  paymentMethod: "cash" as const,
  userId: "user-1",
  storeId: "store-1",
  createdAt: "2025-01-15T10:30:00Z",
  status: "pending" as const,
  retryCount: 0,
  lastError: null,
};

const failedSale = {
  id: "sale-f1",
  items: [{ productId: "p2", productName: "Gadget", quantity: 1, unitPrice: 50, total: 50 }],
  subtotal: 50,
  tax: 0,
  total: 50,
  paymentMethod: "card" as const,
  userId: "user-2",
  storeId: "store-1",
  createdAt: "2025-01-15T11:00:00Z",
  status: "failed" as const,
  retryCount: 2,
  lastError: "API returned 500",
};

describe("PendingSalesDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      pendingCount: 1,
      refreshCount: vi.fn(),
    });
    mockGetPendingSales.mockResolvedValue([pendingSale]);
    mockGetFailedSales.mockResolvedValue([failedSale]);
    mockRetryFailedSale.mockResolvedValue(true);
    mockFlushSaleQueue.mockResolvedValue({ synced: 0, failed: 0 });
  });

  afterEach(() => {
    cleanup();
  });

  it("displays pending sales with ID, item count, total, and timestamp", async () => {
    await act(async () => {
      render(
        <PendingSalesDialog open={true} onOpenChange={vi.fn()} />,
      );
    });

    expect(await vi.waitFor(() => {
      return document.body.textContent?.includes("sale-p1");
    })).toBeTruthy();

    expect(document.body.textContent?.includes("1 producto")).toBeTruthy();
    expect(document.body.textContent?.includes("$20")).toBeTruthy();
  });

  it("displays failed sales with retry button", async () => {
    await act(async () => {
      render(
        <PendingSalesDialog open={true} onOpenChange={vi.fn()} />,
      );
    });

    await vi.waitFor(() => {
      expect(document.body.textContent?.includes("sale-f1")).toBeTruthy();
    });

    expect(document.body.textContent?.includes("1 producto")).toBeTruthy();
    expect(document.body.textContent?.includes("Reintentar")).toBeTruthy();
  });

  it("calls retryFailedSale when Reintentar is clicked", async () => {
    await act(async () => {
      render(
        <PendingSalesDialog open={true} onOpenChange={vi.fn()} />,
      );
    });

    await vi.waitFor(() => {
      expect(document.body.textContent?.includes("sale-f1")).toBeTruthy();
    });

    const retryButton = document.body.querySelector("button");
    // Find the Reintentar button specifically
    const buttons = document.body.querySelectorAll("button");
    let reintentarBtn: HTMLButtonElement | null = null;
    buttons.forEach((btn) => {
      if (btn.textContent?.includes("Reintentar")) {
        reintentarBtn = btn as HTMLButtonElement;
      }
    });

    expect(reintentarBtn).not.toBeNull();
    await act(async () => {
      reintentarBtn!.click();
    });

    expect(mockRetryFailedSale).toHaveBeenCalledWith("sale-f1");
  });

  it("dispatches sync-requested event when Sync Now is clicked", async () => {
    const events: string[] = [];
    window.addEventListener("sync-requested", () => events.push("sync-requested"));

    await act(async () => {
      render(
        <PendingSalesDialog open={true} onOpenChange={vi.fn()} />,
      );
    });

    await vi.waitFor(() => {
      expect(document.body.textContent?.includes("sale-f1")).toBeTruthy();
    });

    const buttons = document.body.querySelectorAll("button");
    let syncNowBtn: HTMLButtonElement | null = null;
    buttons.forEach((btn) => {
      if (btn.textContent?.includes("Sync Now")) {
        syncNowBtn = btn as HTMLButtonElement;
      }
    });

    expect(syncNowBtn).not.toBeNull();
    await act(async () => {
      syncNowBtn!.click();
    });

    expect(events).toContain("sync-requested");
  });

  it("shows empty message when no pending or failed sales", async () => {
    mockGetPendingSales.mockResolvedValue([]);
    mockGetFailedSales.mockResolvedValue([]);

    await act(async () => {
      render(
        <PendingSalesDialog open={true} onOpenChange={vi.fn()} />,
      );
    });

    await vi.waitFor(() => {
      expect(document.body.textContent?.includes("No hay ventas pendientes")).toBeTruthy();
    });
  });

  it("displays multiple pending sales with correct count", async () => {
    const secondPending = { ...pendingSale, id: "sale-p2", total: 35 };
    mockGetPendingSales.mockResolvedValue([pendingSale, secondPending]);
    mockGetFailedSales.mockResolvedValue([]);

    await act(async () => {
      render(
        <PendingSalesDialog open={true} onOpenChange={vi.fn()} />,
      );
    });

    await vi.waitFor(() => {
      expect(document.body.textContent?.includes("sale-p1")).toBeTruthy();
    });

    expect(document.body.textContent?.includes("sale-p2")).toBeTruthy();
    expect(document.body.textContent?.includes("2 ventas")).toBeTruthy();
  });
});
