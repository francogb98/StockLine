"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseCartNavigationOptions {
  totalItems: number;
  onIncrease: (index: number) => void;
  onDecrease: (index: number) => void;
  onRemove: (index: number) => void;
}

export function useCartNavigation({
  totalItems,
  onIncrease,
  onDecrease,
  onRemove,
}: UseCartNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const focusItem = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalItems) return;
      setFocusedIndex(index);
      const el = containerRef.current?.querySelector<HTMLElement>(
        `[data-cart-index="${index}"]`,
      );
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest" });
    },
    [totalItems],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (totalItems === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (focusedIndex < 0) {
            focusItem(0);
          } else if (focusedIndex < totalItems - 1) {
            focusItem(focusedIndex + 1);
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (focusedIndex < 0) {
            focusItem(totalItems - 1);
          } else if (focusedIndex > 0) {
            focusItem(focusedIndex - 1);
          }
          break;

        case "*":
          e.preventDefault();
          if (focusedIndex >= 0) {
            onIncrease(focusedIndex);
          }
          break;

        case "-":
          e.preventDefault();
          if (focusedIndex >= 0) {
            onDecrease(focusedIndex);
          }
          break;

        case "Delete":
        case "Backspace":
          e.preventDefault();
          if (focusedIndex >= 0) {
            onRemove(focusedIndex);
          }
          break;
      }
    },
    [totalItems, focusedIndex, focusItem, onIncrease, onDecrease, onRemove],
  );

  // Reset index when cart changes
  useEffect(() => {
    if (totalItems === 0) {
      setFocusedIndex(-1);
    } else if (focusedIndex >= totalItems) {
      setFocusedIndex(totalItems - 1);
    }
  }, [totalItems, focusedIndex]);

  // Track focus changes from mouse clicks
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const cartItem = target.closest<HTMLElement>("[data-cart-index]");
      if (cartItem) {
        const idx = parseInt(cartItem.getAttribute("data-cart-index")!, 10);
        setFocusedIndex(idx);
      }
    };

    container.addEventListener("focusin", handleMouseFocus);
    return () => container.removeEventListener("focusin", handleMouseFocus);
  }, []);

  const focusFirst = useCallback(() => {
    if (totalItems > 0) focusItem(0);
  }, [totalItems, focusItem]);

  const resetFocus = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  return {
    focusedIndex,
    containerRef,
    handleKeyDown,
    focusFirst,
    focusItem,
    resetFocus,
  };
}
