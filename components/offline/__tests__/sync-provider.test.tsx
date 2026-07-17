// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { SyncProvider } from "@/components/offline/sync-provider";

vi.mock("@/lib/offline", () => ({
  setupSyncListener: vi.fn(() => vi.fn()),
  flushSaleQueue: vi.fn(() => Promise.resolve({ synced: 0, failed: 0 })),
  clearSyncedSales: vi.fn(() => Promise.resolve()),
}));

import {
  setupSyncListener,
  flushSaleQueue,
  clearSyncedSales,
} from "@/lib/offline";

const mockSetupSyncListener = vi.mocked(setupSyncListener);
const mockFlushSaleQueue = vi.mocked(flushSaleQueue);
const mockClearSyncedSales = vi.mocked(clearSyncedSales);

function TestChild({ onEvent }: { onEvent?: (event: string) => void }) {
  return (
    <div>
      <span data-testid="child">Child Content</span>
      {onEvent && (
        <script>
          {`
            window.addEventListener('sync-started', () => window.__test_events?.push('sync-started'));
            window.addEventListener('sync-completed', () => window.__test_events?.push('sync-completed'));
            window.addEventListener('sync-failed', () => window.__test_events?.push('sync-failed'));
          `}
        </script>
      )}
    </div>
  );
}

describe("SyncProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetupSyncListener.mockReturnValue(vi.fn());
    mockFlushSaleQueue.mockResolvedValue({ synced: 0, failed: 0 });
    mockClearSyncedSales.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders children", () => {
    const { getByTestId } = render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>,
    );

    expect(getByTestId("child")).toBeTruthy();
  });

  it("calls setupSyncListener on mount", () => {
    render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>,
    );

    expect(mockSetupSyncListener).toHaveBeenCalledTimes(1);
  });

  it("calls cleanup function from setupSyncListener on unmount", () => {
    const cleanupFn = vi.fn();
    mockSetupSyncListener.mockReturnValue(cleanupFn);

    const { unmount } = render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>,
    );

    unmount();

    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it("flushes sale queue when sync-requested event fires", async () => {
    render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent("sync-requested"));
      await flushPromise();
    });

    expect(mockFlushSaleQueue).toHaveBeenCalledTimes(1);
  });

  it("calls clearSyncedSales after successful flush (0 failures)", async () => {
    mockFlushSaleQueue.mockResolvedValue({ synced: 3, failed: 0 });

    render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent("sync-requested"));
      await flushPromise();
    });

    expect(mockClearSyncedSales).toHaveBeenCalledTimes(1);
  });

  it("does NOT call clearSyncedSales when flush has failures", async () => {
    mockFlushSaleQueue.mockResolvedValue({ synced: 1, failed: 2 });

    render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent("sync-requested"));
      await flushPromise();
    });

    expect(mockClearSyncedSales).not.toHaveBeenCalled();
  });

  it("dispatches sync-started event before flush", async () => {
    const events: string[] = [];
    window.addEventListener("sync-started", () => events.push("sync-started"));

    render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent("sync-requested"));
      await flushPromise();
    });

    expect(events).toContain("sync-started");
  });

  it("dispatches sync-completed event after successful flush", async () => {
    mockFlushSaleQueue.mockResolvedValue({ synced: 2, failed: 0 });
    const events: string[] = [];
    window.addEventListener("sync-completed", () =>
      events.push("sync-completed"),
    );

    render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent("sync-requested"));
      await flushPromise();
    });

    expect(events).toContain("sync-completed");
  });

  it("dispatches sync-failed event when flush has failures", async () => {
    mockFlushSaleQueue.mockResolvedValue({ synced: 0, failed: 1 });
    const events: string[] = [];
    window.addEventListener("sync-failed", () => events.push("sync-failed"));

    render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent("sync-requested"));
      await flushPromise();
    });

    expect(events).toContain("sync-failed");
  });
});

/** Flush all pending promises */
function flushPromise(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
