"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseProductGridNavigationOptions {
  totalItems: number;
  onActivateItem: (index: number) => void;
  columns?: number;
}

export function useProductGridNavigation({
  totalItems,
  onActivateItem,
  columns: _columns,
}: UseProductGridNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect grid columns from computed style
  const getColumns = useCallback((): number => {
    if (_columns) return _columns;
    if (!containerRef.current) return 3;
    const style = getComputedStyle(containerRef.current);
    const template = style.gridTemplateColumns;
    if (template === "none") return 3;
    return template.split(/\s+/).length;
  }, [_columns]);

  const focusItem = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalItems) return;
      setFocusedIndex(index);
      const el = containerRef.current?.querySelector<HTMLElement>(
        `[data-product-index="${index}"]`,
      );
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest" });
    },
    [totalItems],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (totalItems === 0) return;

      const cols = getColumns();
      let newIndex = focusedIndex;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          newIndex = focusedIndex + 1;
          if (newIndex >= totalItems) newIndex = 0;
          focusItem(newIndex);
          break;

        case "ArrowLeft":
          e.preventDefault();
          newIndex = focusedIndex - 1;
          if (newIndex < 0) newIndex = totalItems - 1;
          focusItem(newIndex);
          break;

        case "ArrowDown":
          e.preventDefault();
          newIndex = focusedIndex + cols;
          if (newIndex >= totalItems) {
            const remainder = (totalItems - 1 - focusedIndex) % cols;
            newIndex = totalItems - 1 - remainder;
            if (newIndex <= focusedIndex) {
              newIndex = focusedIndex % cols;
            }
          }
          focusItem(newIndex);
          break;

        case "ArrowUp":
          e.preventDefault();
          newIndex = focusedIndex - cols;
          if (newIndex < 0) {
            newIndex = focusedIndex % cols;
          }
          focusItem(newIndex);
          break;

        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < totalItems) {
            onActivateItem(focusedIndex);
          }
          break;
      }
    },
    [totalItems, focusedIndex, getColumns, focusItem, onActivateItem],
  );

  // Reset index when items change
  useEffect(() => {
    if (focusedIndex >= totalItems) {
      setFocusedIndex(totalItems > 0 ? 0 : -1);
    }
  }, [totalItems, focusedIndex]);

  // Set up delegated click-to-focus on product buttons
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const indexAttr = target.getAttribute("data-product-index");
      if (indexAttr !== null) {
        setFocusedIndex(parseInt(indexAttr, 10));
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
