"use client";

import { useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { BarcodeInput } from "./barcode-input";
import { CartPanel } from "./cart-panel";
import { PaymentPanel } from "./payment-panel";
import { QuickProducts } from "./quick-products";
import type { QuickProductsHandle } from "./quick-products";
import { KeyboardHelpBar } from "./keyboard-help-bar";
import { KeyboardHelpModal } from "./keyboard-help-modal";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { MobilePOS } from "./mobile-pos";
import { usePOS } from "@/lib/store-context";
import type { Sale } from "@/lib/types";

export function POSLayout() {
  const isMobile = useIsMobile();

  const { cart } = usePOS();
  const quickProductsRef = useRef<QuickProductsHandle>(null);

  const handleFocusSearch = useCallback(() => {
    quickProductsRef.current?.focusSearch();
  }, []);

  const handleFocusProducts = useCallback(() => {
    quickProductsRef.current?.focusFirstProduct();
  }, []);

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
    const paymentPanel = document.querySelector<HTMLElement>(
      '[data-keyboard-zone="payment"]',
    );
    if (paymentPanel) {
      paymentPanel.focus({ preventScroll: true });
    }
  }, []);

  const handleEscape = useCallback(() => {
    setHelpOpen(false);
    quickProductsRef.current?.focusSearch();
  }, []);

  const handleHelp = useCallback(() => {}, []);

  const { helpOpen, setHelpOpen } = useGlobalShortcuts({
    onFocusSearch: handleFocusSearch,
    onFocusProducts: handleFocusProducts,
    onCheckout: handleCheckout,
    onFocusPayment: handleFocusPayment,
    onEscape: handleEscape,
    onHelp: handleHelp,
  });

  const handleSaleComplete = useCallback((_sale: Sale) => {
    setTimeout(() => {
      quickProductsRef.current?.focusSearch();
    }, 100);
  }, []);

  return (
    <>
      {isMobile ? (
        <MobilePOS onSaleComplete={handleSaleComplete} />
      ) : (
        <div className="flex h-full flex-col">
          <main className="flex min-h-0 flex-1 overflow-hidden gap-1.5 p-1.5">
            {/* Products column — takes remaining space */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
              <QuickProducts ref={quickProductsRef} />
            </div>

            {/* Cart column — fixed width */}
            <div className="flex w-[400px] shrink-0 flex-col rounded-lg border bg-card">
              <div className="shrink-0 border-b p-3">
                <BarcodeInput />
              </div>

              <div
                className="min-h-0 flex-1 overflow-hidden"
                data-keyboard-zone="cart"
              >
                <CartPanel />
              </div>

              <div className="shrink-0" data-keyboard-zone="payment">
                <PaymentPanel onSaleComplete={handleSaleComplete} />
              </div>
            </div>
          </main>

          <footer className="flex h-8 shrink-0 items-center justify-between border-t bg-muted/50 px-4 text-xs text-muted-foreground">
            <KeyboardHelpBar />
            <span>v1.0.0 - Demo Mode</span>
          </footer>
        </div>
      )}

      <KeyboardHelpModal open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
