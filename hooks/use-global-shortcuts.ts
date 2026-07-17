"use client";

import { useEffect, useCallback, useState, useRef, type RefObject } from "react";

export type FocusZone = "search" | "products" | "cart" | "payment" | null;

interface GlobalShortcutOptions {
  onFocusSearch: () => void;
  onFocusProducts: () => void;
  onCheckout: () => void;
  onFocusPayment: () => void;
  onEscape: () => void;
  onHelp: () => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export function useGlobalShortcuts({
  onFocusSearch,
  onFocusProducts,
  onCheckout,
  onFocusPayment,
  onEscape,
  onHelp,
  searchInputRef,
}: GlobalShortcutOptions) {
  const [focusZone, setFocusZone] = useState<FocusZone>("search");
  const [helpOpen, setHelpOpen] = useState(false);
  const zoneRef = useRef<FocusZone>("search");
  zoneRef.current = focusZone;

  // Check if focus is inside a text input where shortcuts should not fire
  const isInsideTextInput = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if ((el as HTMLElement).isContentEditable) return true;
    if (el.getAttribute("role") === "textbox") return true;
    return false;
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key;
      const isInput = isInsideTextInput();
      const isAlt = e.altKey;

      // Alt-based shortcuts: fire even inside text inputs (Alt doesn't interfere with typing)
      if (isAlt && !e.ctrlKey && !e.metaKey) {
        switch (key.toLowerCase()) {
          case "f":
            e.preventDefault();
            setFocusZone("search");
            onFocusSearch();
            return;

          case "d":
            e.preventDefault();
            setFocusZone("products");
            onFocusProducts();
            return;

          case "c":
            e.preventDefault();
            onCheckout();
            return;

          case "p":
            e.preventDefault();
            setFocusZone("payment");
            onFocusPayment();
            return;

          case "h":
            e.preventDefault();
            setHelpOpen((prev) => !prev);
            onHelp();
            return;
        }
      }

      // Escape: close modals, dropdowns, return to search
      if (key === "Escape") {
        e.preventDefault();
        setFocusZone("search");
        onEscape();
        if (zoneRef.current === "payment") {
          const event = new CustomEvent("pos:cancel-payment");
          window.dispatchEvent(event);
        }
        return;
      }

      // Payment zone shortcuts: 1, 2, 3 for method selection
      if (zoneRef.current === "payment" && !isInput) {
        const numericKey = parseInt(key);
        if (numericKey >= 1 && numericKey <= 3) {
          e.preventDefault();
          const methods: Array<"cash" | "card" | "transfer"> = [
            "cash",
            "card",
            "transfer",
          ];
          const event = new CustomEvent("pos:select-payment-method", {
            detail: { method: methods[numericKey - 1] },
          });
          window.dispatchEvent(event);
          return;
        }
        if (key === "Enter") {
          e.preventDefault();
          const event = new CustomEvent("pos:confirm-payment");
          window.dispatchEvent(event);
          return;
        }
      }
    },
    [isInsideTextInput, onFocusSearch, onFocusProducts, onCheckout, onFocusPayment, onEscape, onHelp],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { focusZone, setFocusZone, helpOpen, setHelpOpen };
}
