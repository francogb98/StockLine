// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

vi.mock("@/hooks/use-offline-status", () => ({
  useOfflineStatus: vi.fn(),
}));

import { OfflineBanner } from "@/components/offline/offline-banner";
import { useOfflineStatus } from "@/hooks/use-offline-status";

const mockUseOfflineStatus = vi.mocked(useOfflineStatus);

describe("OfflineBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows offline message when not connected", () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      pendingCount: 0,
      refreshCount: vi.fn(),
    });

    const { getByText } = render(<OfflineBanner />);
    expect(getByText(/Sin conexión/)).toBeTruthy();
  });

  it("shows syncing message when online with pending sales", () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      pendingCount: 2,
      refreshCount: vi.fn(),
    });

    const { getByText } = render(<OfflineBanner />);
    expect(getByText(/Sincronizando/)).toBeTruthy();
  });

  it("renders nothing when online with no pending sales", () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      pendingCount: 0,
      refreshCount: vi.fn(),
    });

    const { container } = render(<OfflineBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("shows offline message (not syncing) when offline with pending sales", () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      pendingCount: 3,
      refreshCount: vi.fn(),
    });

    const { getByText, queryByText } = render(<OfflineBanner />);
    expect(getByText(/Sin conexión/)).toBeTruthy();
    expect(queryByText(/Sincronizando/)).toBeNull();
  });
});
