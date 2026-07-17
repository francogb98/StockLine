// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOfflineStatus } from "@/hooks/use-offline-status";

vi.mock("@/lib/offline", () => ({
  isOnline: vi.fn(),
  onStatusChange: vi.fn(),
  getQueueCount: vi.fn(),
}));

import { isOnline, onStatusChange, getQueueCount } from "@/lib/offline";

const mockIsOnline = vi.mocked(isOnline);
const mockOnStatusChange = vi.mocked(onStatusChange);
const mockGetQueueCount = vi.mocked(getQueueCount);

describe("useOfflineStatus", () => {
  let statusChangeCallback: (online: boolean) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockIsOnline.mockReturnValue(true);
    mockGetQueueCount.mockResolvedValue(0);
    mockOnStatusChange.mockImplementation((cb) => {
      statusChangeCallback = cb;
      return vi.fn();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns initial isOnline from navigator", () => {
    mockIsOnline.mockReturnValue(true);

    const { result } = renderHook(() => useOfflineStatus());

    expect(result.current.isOnline).toBe(true);
  });

  it("returns initial pendingCount as 0", async () => {
    mockGetQueueCount.mockResolvedValue(0);

    const { result } = renderHook(() => useOfflineStatus());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.pendingCount).toBe(0);
  });

  it("fetches pending count on mount", async () => {
    mockGetQueueCount.mockResolvedValue(3);

    renderHook(() => useOfflineStatus());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockGetQueueCount).toHaveBeenCalledTimes(1);
  });

  it("updates isOnline when offline event fires", async () => {
    mockIsOnline.mockReturnValue(true);
    let statusCallback: ((online: boolean) => void) | undefined;
    mockOnStatusChange.mockImplementation((cb) => {
      statusCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() => useOfflineStatus());

    act(() => {
      statusCallback!(false);
    });

    expect(result.current.isOnline).toBe(false);
  });

  it("updates isOnline when online event fires", async () => {
    mockIsOnline.mockReturnValue(false);
    let statusCallback: ((online: boolean) => void) | undefined;
    mockOnStatusChange.mockImplementation((cb) => {
      statusCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() => useOfflineStatus());

    act(() => {
      statusCallback!(true);
    });

    expect(result.current.isOnline).toBe(true);
  });

  it("refreshes pending count when sale-queued event fires", async () => {
    mockGetQueueCount.mockResolvedValue(0);

    const { result } = renderHook(() => useOfflineStatus());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockGetQueueCount).toHaveBeenCalledTimes(1);

    mockGetQueueCount.mockResolvedValue(5);

    await act(async () => {
      window.dispatchEvent(new CustomEvent("sale-queued"));
      await vi.runAllTimersAsync();
    });

    expect(result.current.pendingCount).toBe(5);
  });

  it("refreshes pending count when sync-completed event fires", async () => {
    mockGetQueueCount.mockResolvedValue(3);

    const { result } = renderHook(() => useOfflineStatus());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    mockGetQueueCount.mockResolvedValue(1);

    await act(async () => {
      window.dispatchEvent(new CustomEvent("sync-completed"));
      await vi.runAllTimersAsync();
    });

    expect(result.current.pendingCount).toBe(1);
  });

  it("refreshCount re-fetches pending count", async () => {
    mockGetQueueCount.mockResolvedValue(0);

    const { result } = renderHook(() => useOfflineStatus());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    mockGetQueueCount.mockResolvedValue(7);

    await act(async () => {
      await result.current.refreshCount();
    });

    expect(result.current.pendingCount).toBe(7);
  });

  it("cleans up all listeners on unmount", () => {
    const unsubMock = vi.fn();
    mockOnStatusChange.mockReturnValue(unsubMock);
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useOfflineStatus());

    unmount();

    expect(unsubMock).toHaveBeenCalled();
    expect(
      removeSpy.mock.calls.filter(
        ([event]) => event === "sale-queued" || event === "sync-completed",
      ),
    ).toHaveLength(2);
  });
});
