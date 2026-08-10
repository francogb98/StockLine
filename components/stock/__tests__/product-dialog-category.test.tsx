// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";

vi.mock("@/lib/store-context", () => ({
  useData: () => ({
    categories: [
      { id: "cat-1", name: "Bebidas", storeId: "store-1", normalizedName: "bebidas" },
      { id: "cat-2", name: "Lácteos", storeId: "store-1", normalizedName: "lacteos" },
    ],
    addProduct: vi.fn(),
    updateProduct: vi.fn(),
  }),
}));

vi.mock("@/components/ui/use-mobile", () => ({
  useIsMobile: () => false,
}));

import { ProductDialog } from "@/components/stock/product-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";

function renderDialog(props: React.ComponentProps<typeof ProductDialog>) {
  return render(
    <TooltipProvider delayDuration={0}>
      <ProductDialog {...props} />
    </TooltipProvider>,
  );
}

describe("ProductDialog - catégorie popover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("abre el popover de categorías al hacer click en el trigger", () => {
    renderDialog({
      open: true,
      onClose: vi.fn(),
      product: null,
      canManageCategories: true,
    });

    const trigger = screen.getByRole("combobox", { name: /categoría/i });
    fireEvent.click(trigger);

    const popover = screen.getByTestId("category-popover-content");
    expect(popover).toBeInTheDocument();
    expect(popover).toHaveAttribute("data-state", "open");
  });

  it("lista las categorías dentro del popover", () => {
    renderDialog({
      open: true,
      onClose: vi.fn(),
      product: null,
      canManageCategories: true,
    });

    fireEvent.click(screen.getByRole("combobox", { name: /categoría/i }));

    expect(screen.getByText("Bebidas")).toBeInTheDocument();
    expect(screen.getByText("Lácteos")).toBeInTheDocument();
  });
});
