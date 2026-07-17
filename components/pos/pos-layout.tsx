"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { BarcodeInput } from "./barcode-input";
import { CartPanel } from "./cart-panel";
import { PaymentPanel } from "./payment-panel";
import { QuickProducts } from "./quick-products";
import type { QuickProductsHandle } from "./quick-products";
import { KeyboardHelpBar } from "./keyboard-help-bar";
import { KeyboardHelpModal } from "./keyboard-help-modal";
import { TodaySalesPanel } from "./today-sales-panel";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { MobilePOS } from "./mobile-pos";
import { useAuth, usePOS } from "@/lib/store-context";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sale } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function POSLayout() {
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  const isMobile = useIsMobile();

  const { user } = useAuth();
  const { cart } = usePOS();
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [panelStateReady, setPanelStateReady] = useState(false);

  const LEFT_PANEL_STORAGE_KEY = "pos:left-panel-collapsed";
  const RIGHT_PANEL_STORAGE_KEY = "pos:right-panel-collapsed";
  const quickProductsRef = useRef<QuickProductsHandle>(null);

  // Keyboard navigation system
  const handleFocusSearch = useCallback(() => {
    quickProductsRef.current?.focusSearch();
  }, []);

  const handleFocusProducts = useCallback(() => {
    if (leftCollapsed) setLeftCollapsed(false);
    quickProductsRef.current?.focusFirstProduct();
  }, [leftCollapsed]);

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return;
    const cobrarBtn = document.querySelector<HTMLButtonElement>(
      '[data-testid="complete-sale"]',
    );
    if (cobrarBtn && !cobrarBtn.disabled) {
      cobrarBtn.click();
    }
  }, [cart]);

  const handleFocusPayment = useCallback(() => {
    if (leftCollapsed) setLeftCollapsed(false);
    const paymentPanel = document.querySelector<HTMLElement>(
      '[data-keyboard-zone="payment"]',
    );
    if (paymentPanel) {
      paymentPanel.focus({ preventScroll: true });
    }
  }, [leftCollapsed]);

  const handleEscape = useCallback(() => {
    setHelpOpen(false);
    quickProductsRef.current?.focusSearch();
  }, []);

  const handleHelp = useCallback(() => {
  }, []);

  const {
    helpOpen,
    setHelpOpen,
  } = useGlobalShortcuts({
    onFocusSearch: handleFocusSearch,
    onFocusProducts: handleFocusProducts,
    onCheckout: handleCheckout,
    onFocusPayment: handleFocusPayment,
    onEscape: handleEscape,
    onHelp: handleHelp,
  });

  const handleSaleComplete = useCallback(
    (sale: Sale) => {
      setLastSale(sale);
      setTimeout(() => {
        quickProductsRef.current?.focusSearch();
      }, 100);
    },
    [],
  );

  useEffect(() => {
    const savedLeft = localStorage.getItem(LEFT_PANEL_STORAGE_KEY);
    const savedRight = localStorage.getItem(RIGHT_PANEL_STORAGE_KEY);

    if (savedLeft === "1") {
      setLeftCollapsed(true);
    }

    if (savedRight === "1") {
      setRightCollapsed(true);
    }

    setPanelStateReady(true);
  }, []);

  useEffect(() => {
    if (!panelStateReady) return;

    if (leftCollapsed) {
      leftPanelRef.current?.collapse();
      localStorage.setItem(LEFT_PANEL_STORAGE_KEY, "1");
    } else {
      leftPanelRef.current?.expand();
      localStorage.setItem(LEFT_PANEL_STORAGE_KEY, "0");
    }
  }, [leftCollapsed, panelStateReady]);

  useEffect(() => {
    if (!panelStateReady) return;

    if (rightCollapsed) {
      rightPanelRef.current?.collapse();
      localStorage.setItem(RIGHT_PANEL_STORAGE_KEY, "1");
    } else {
      rightPanelRef.current?.expand();
      localStorage.setItem(RIGHT_PANEL_STORAGE_KEY, "0");
    }
  }, [rightCollapsed, panelStateReady]);

  return (
    <>
      {isMobile ? (
        <MobilePOS onSaleComplete={handleSaleComplete} />
      ) : (
        <div className="flex h-full flex-col">
          <main className="flex min-h-0 flex-1 overflow-hidden">
            <TooltipProvider delayDuration={120}>
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left panel - Cart & Payment */}
            <ResizablePanel
              ref={leftPanelRef}
              defaultSize={38}
              minSize={20}
              maxSize={45}
              collapsible
              collapsedSize={4}
              onCollapse={() => setLeftCollapsed(true)}
              onExpand={() => setLeftCollapsed(false)}
            >
              {leftCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setLeftCollapsed(false)}
                      aria-label="Abrir carrito"
                      className={cn(
                        "group flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 border-r bg-card px-1",
                        "transition-colors duration-200 hover:bg-muted/40",
                        "focus:outline-none focus:ring-2 focus:ring-ring",
                      )}
                    >
                      <ShoppingCart className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                      <span className="select-none text-[11px] font-medium uppercase tracking-wide text-muted-foreground [writing-mode:vertical-rl] [text-orientation:mixed]">
                        Carrito
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Abrir carrito</TooltipContent>
                </Tooltip>
              ) : (
                <div className="relative flex h-full flex-col border-r bg-card transition-[width] duration-300 ease-out">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setLeftCollapsed(true)}
                        aria-label="Ocultar carrito"
                        className={cn(
                          "absolute right-0 top-1/2 z-20 flex h-20 w-6 -translate-y-1/2 items-center justify-center",
                          "rounded-l-md border-y border-l border-emerald-300 bg-emerald-50 text-emerald-700 transition-colors duration-200",
                          "cursor-pointer hover:bg-emerald-100 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500",
                          "dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 dark:hover:text-emerald-200",
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Ocultar carrito
                    </TooltipContent>
                  </Tooltip>

                  {/* Barcode input */}
                  <div className="shrink-0 border-b p-3">
                    <BarcodeInput />
                  </div>

                  {/* Cart */}
                  <div className="min-h-0 flex-1 overflow-hidden" data-keyboard-zone="cart">
                    <CartPanel />
                  </div>

                  {/* Payment */}
                  <div className="shrink-0" data-keyboard-zone="payment">
                    <PaymentPanel
                      onSaleComplete={handleSaleComplete}
                    />
                  </div>
                </div>
              )}
            </ResizablePanel>

            <ResizableHandle />

            {/* Center panel - Quick Products */}
            <ResizablePanel defaultSize={42} minSize={30}>
              <div className="h-full bg-background">
                <QuickProducts ref={quickProductsRef} />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Right panel - Today's Sales & Alerts */}
            <ResizablePanel
              ref={rightPanelRef}
              defaultSize={20}
              minSize={14}
              maxSize={25}
              collapsible
              collapsedSize={4}
              onCollapse={() => setRightCollapsed(true)}
              onExpand={() => setRightCollapsed(false)}
            >
              {rightCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setRightCollapsed(false)}
                      aria-label="Abrir resumen"
                      className={cn(
                        "group flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 border-l bg-card px-1",
                        "transition-colors duration-200 hover:bg-muted/40",
                        "focus:outline-none focus:ring-2 focus:ring-ring",
                      )}
                    >
                      <BarChart3 className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                      <span className="select-none text-[11px] font-medium uppercase tracking-wide text-muted-foreground [writing-mode:vertical-rl] [text-orientation:mixed]">
                        Resumen
                      </span>
                      <ChevronLeft className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Abrir resumen</TooltipContent>
                </Tooltip>
              ) : (
                <div className="relative h-full border-l bg-card transition-[width] duration-300 ease-out">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setRightCollapsed(true)}
                        aria-label="Ocultar resumen"
                        className={cn(
                          "absolute left-0 top-1/2 z-20 flex h-20 w-6 -translate-y-1/2 items-center justify-center",
                          "rounded-r-md border-y border-r border-emerald-300 bg-emerald-50 text-emerald-700 transition-colors duration-200",
                          "cursor-pointer hover:bg-emerald-100 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500",
                          "dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 dark:hover:text-emerald-200",
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Ocultar resumen</TooltipContent>
                  </Tooltip>
                  <TodaySalesPanel />
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </TooltipProvider>
      </main>

          {/* Status bar with keyboard help */}
          <footer className="flex h-8 shrink-0 items-center justify-between border-t bg-muted/50 px-4 text-xs text-muted-foreground">
            <KeyboardHelpBar />
            <span>v1.0.0 - Demo Mode</span>
          </footer>
        </div>
      )}

      <KeyboardHelpModal
        open={helpOpen}
        onOpenChange={setHelpOpen}
      />
    </>
  );
}
