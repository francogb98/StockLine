// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/use-offline-status", () => ({
  useOfflineStatus: vi.fn(),
}));

vi.mock("@/lib/offline", () => ({
  getPendingSales: vi.fn(),
  getFailedSales: vi.fn(),
  retryFailedSale: vi.fn(),
  flushSaleQueue: vi.fn(),
}));

import { PendingSalesBadge } from "@/components/offline/pending-sales-badge";
import { useOfflineStatus } from "@/hooks/use-offline-status";

const mockUseOfflineStatus = vi.mocked(useOfflineStatus);

describe("PendingSalesBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows count when there are pending sales", () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      pendingCount: 5,
      refreshCount: vi.fn(),
    });

    const { getByText } = render(<PendingSalesBadge />);
    expect(getByText("5")).toBeTruthy();
  });

  it("does not render when pendingCount is 0", () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      pendingCount: 0,
      refreshCount: vi.fn(),
    });

    const { container } = render(<PendingSalesBadge />);
    expect(container.innerHTML).toBe("");
  });

  it("opens dialog when clicked", () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      pendingCount: 3,
      refreshCount: vi.fn(),
    });

    const { getByText } = render(<PendingSalesBadge />);
    fireEvent.click(getByText("3"));

    // Dialog title should appear after click
    expect(getByText(/Ventas pendientes/)).toBeTruthy();
  });

  it("shows 9+ for counts above 9", () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      pendingCount: 12,
      refreshCount: vi.fn(),
    });

    const { getByText } = render(<PendingSalesBadge />);
    expect(getByText("9+")).toBeTruthy();
  });
});
