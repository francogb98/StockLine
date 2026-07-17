// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// --- Mocks for offline hooks/libs ---
vi.mock("@/hooks/use-offline-status", () => ({
  useOfflineStatus: vi.fn(),
}));

vi.mock("@/lib/offline", () => ({
  isOnline: vi.fn(() => true),
  onStatusChange: vi.fn(() => vi.fn()),
  getQueueCount: vi.fn(() => Promise.resolve(0)),
  setupSyncListener: vi.fn(() => vi.fn()),
  flushSaleQueue: vi.fn(() => Promise.resolve({ synced: 0, failed: 0 })),
  clearSyncedSales: vi.fn(() => Promise.resolve()),
  getPendingSales: vi.fn(() => Promise.resolve([])),
  getFailedSales: vi.fn(() => Promise.resolve([])),
  retryFailedSale: vi.fn(() => Promise.resolve()),
}));

// --- Mocks for POSLayout dependencies ---
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock("@/hooks/use-global-shortcuts", () => ({
  useGlobalShortcuts: vi.fn(() => ({
    helpOpen: false,
    setHelpOpen: vi.fn(),
  })),
}));

vi.mock("@/lib/store-context", () => ({
  useAuth: vi.fn(() => ({
    user: { name: "Test User", role: "admin", hasCompletedOnboarding: true },
    store: { name: "Test Store" },
    logout: vi.fn(),
  })),
  usePOS: vi.fn(() => ({
    cart: [],
  })),
}));

vi.mock("@/lib/cash-control-context", () => ({
  useCashControl: vi.fn(() => ({
    cashControlEnabled: false,
  })),
}));

vi.mock("@/lib/module-registry", () => ({
  getNavigationForRole: vi.fn(() => []),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

vi.mock("@/components/cash/cash-session-bar", () => ({
  CashSessionBar: () => <div data-testid="cash-session-bar" />,
}));

vi.mock("@/components/subscription/subscription-status-badge", () => ({
  SubscriptionStatusBadge: () => <div data-testid="subscription-badge" />,
}));

vi.mock("@/components/pos/barcode-input", () => ({
  BarcodeInput: () => <div data-testid="barcode-input" />,
}));

vi.mock("@/components/pos/cart-panel", () => ({
  CartPanel: () => <div data-testid="cart-panel" />,
}));

vi.mock("@/components/pos/payment-panel", () => ({
  PaymentPanel: () => <div data-testid="payment-panel" />,
}));

vi.mock("@/components/pos/quick-products", () => ({
  QuickProducts: () => <div data-testid="quick-products" />,
}));

vi.mock("@/components/pos/today-sales-panel", () => ({
  TodaySalesPanel: () => <div data-testid="today-sales-panel" />,
}));

vi.mock("@/components/pos/keyboard-help-bar", () => ({
  KeyboardHelpBar: () => <div data-testid="keyboard-help-bar" />,
}));

vi.mock("@/components/pos/keyboard-help-modal", () => ({
  KeyboardHelpModal: () => <div data-testid="keyboard-help-modal" />,
}));

import { useOfflineStatus } from "@/hooks/use-offline-status";
import { MobilePOS } from "@/components/pos/mobile-pos";

const mockUseOfflineStatus = vi.mocked(useOfflineStatus);



describe("MobilePOS — OfflineBanner integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      pendingCount: 0,
      refreshCount: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders OfflineBanner showing 'Sin conexión' when offline", () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      pendingCount: 0,
      refreshCount: vi.fn(),
    });

    const { getByText } = render(<MobilePOS />);
    expect(getByText(/Sin conexión/)).toBeTruthy();
  });
});

describe("MobilePOS — PendingSalesBadge integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      pendingCount: 0,
      refreshCount: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders PendingSalesBadge with count when pending sales exist", () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      pendingCount: 4,
      refreshCount: vi.fn(),
    });

    const { getByText } = render(<MobilePOS />);
    expect(getByText("4")).toBeTruthy();
  });
});
