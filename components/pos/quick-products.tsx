"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import Link from "next/link";
import { Search, Package, Loader2, MoreVertical, Pencil, PackageMinus } from "lucide-react";
import { useAuth, useData, usePOS } from "@/lib/store-context";
import { formatCurrency } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SkeletonProductGrid } from "@/components/ui/skeletons";
import { useProductGridNavigation } from "@/hooks/use-product-grid-navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ProductDialog } from "@/components/stock/product-dialog";
import { OwnerWithdrawalDialog } from "@/components/stock/owner-withdrawal-dialog";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { QuantityDialog } from "./quantity-dialog";
import { PresentationDialog } from "./presentation-dialog";
import type { Product, ProductPresentation } from "@/lib/types";

const ITEMS_PER_PAGE = 20;

export interface QuickProductsHandle {
  focusSearch: () => void;
  focusFirstProduct: () => void;
  scrollToTop: () => void;
}

export const QuickProducts = forwardRef<QuickProductsHandle>(function QuickProducts(
  _props,
  ref,
) {
  const { user, isSessionLoading, isDemo } = useAuth();
  const { products, categories, isDataLoading, recordOwnerWithdrawal } = useData();
  const { addToCart, getAvailableStock } = usePOS();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [withdrawalProduct, setWithdrawalProduct] = useState<Product | null>(null);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [quantityDialogProduct, setQuantityDialogProduct] =
    useState<Product | null>(null);
  const [presentationDialogProduct, setPresentationDialogProduct] =
    useState<Product | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      search === "" ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.barcode?.includes(search) ?? false);

    const matchesCategory =
      selectedCategory === null || product.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleAddProduct = (product: (typeof products)[0]) => {
    const activePresentations = (product.presentations ?? []).filter(
      (p) => p.active,
    );
    if (product.quantityType === "DISCRETA") {
      const ok = addToCart(product, 1);
      if (!ok) toast.error("Sin stock disponible");
      return;
    }
    if (activePresentations.length === 0) {
      setQuantityDialogProduct(product);
      return;
    }
    setPresentationDialogProduct(product);
  };

  const handleQuantityDialogConfirm = (product: Product, quantity: number) => {
    const ok = addToCart(product, quantity, null);
    if (!ok) {
      toast.error("Sin stock disponible");
      return;
    }
    setQuantityDialogProduct(null);
  };

  const handlePresentationDialogSelectPresentation = (
    product: Product,
    presentation: ProductPresentation,
  ) => {
    const ok = addToCart(product, 1, presentation);
    if (!ok) {
      toast.error("Sin stock disponible");
      return;
    }
    setPresentationDialogProduct(null);
  };

  const handlePresentationDialogSelectFree = (
    product: Product,
    quantity: number,
  ) => {
    const ok = addToCart(product, quantity, null);
    if (!ok) {
      toast.error("Sin stock disponible");
      return;
    }
    setPresentationDialogProduct(null);
  };

  const handleOpenEdit = (product: (typeof products)[0]) => {
    setEditingProduct(product);
    setEditDialogOpen(true);
  };

  const handleOpenWithdrawal = (product: (typeof products)[0]) => {
    setWithdrawalProduct(product);
    setWithdrawalDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingProduct(null);
  };

  const handleWithdrawalDialogClose = () => {
    setWithdrawalDialogOpen(false);
    setWithdrawalProduct(null);
  };

  const handleWithdrawalConfirm = async (
    quantity: number,
    reason: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!withdrawalProduct) return { ok: false, error: "Producto no seleccionado" };

    const result = await recordOwnerWithdrawal(
      withdrawalProduct.id,
      quantity,
      reason,
    );

    if (result.ok) {
      toast.success(`Retiro registrado: -${quantity} unidades`);
      return { ok: true };
    }

    toast.error(result.error ?? "Error al registrar retiro");
    return result;
  };

  const {
    focusedIndex,
    containerRef: gridContainerRef,
    handleKeyDown: handleGridKeyDown,
    focusFirst,
  } = useProductGridNavigation({
    totalItems: paginatedProducts.length,
    onActivateItem: (index) => {
      const product = paginatedProducts[index];
      if (product) handleAddProduct(product);
    },
  });

  // Auto-focus search input on mount — product search is the primary entry point
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      searchInputRef.current?.focus();
    },
    focusFirstProduct: () => {
      if (filteredProducts.length > 0) focusFirst();
    },
    scrollToTop: () => {
      scrollContainerRef.current?.scrollTo({ top: 0 });
    },
  }));

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-muted/30 px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar productos..."
            className={cn(
              "h-9 w-full rounded-md border bg-background pl-9 pr-4 text-sm",
              "placeholder:text-muted-foreground",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            )}
          />
        </div>

        {/* Category filter */}
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setCurrentPage(1);
            }}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
            type="button"
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setCurrentPage(1);
              }}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              type="button"
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto p-3">
        {isSessionLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Cargando sesión...</p>
          </div>
        ) : !user ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="max-w-md text-sm font-medium text-foreground">
              Debes iniciar sesión de nuevo para cargar productos y vender.
            </p>
            <Link
              href="/login"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        ) : isDataLoading ? (
          <SkeletonProductGrid />
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Package className="h-12 w-12 opacity-30" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          <>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando{" "}
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}{" "}
              de {filteredProducts.length} productos
            </p>
          </div>
          <div
            ref={gridContainerRef}
            data-keyboard-zone="products"
            className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3"
            onKeyDown={handleGridKeyDown}
            role="grid"
            aria-label="Productos"
          >
            {paginatedProducts.map((product, index) => {
              const isLowStock = product.stock <= product.minStock;
              const isOutOfStock = getAvailableStock(product.id) <= 0;
              const isFocused = focusedIndex === index;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (isOutOfStock) return;
                    handleAddProduct(product);
                  }}
                  data-testid="add-to-cart"
                  data-product-barcode={product.barcode}
                  data-product-name={product.name}
                  data-product-index={index}
                  className={cn(
                    "group relative flex h-full cursor-pointer flex-col rounded-xl border border-gray-200 p-3 text-left transition-all duration-200 active:scale-95",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    isOutOfStock
                      ? "cursor-not-allowed bg-muted/50 opacity-60"
                      : "hover:border-blue-400 hover:shadow-md hover:bg-accent/30",
                    isFocused && "keyboard-product-focused",
                  )}
                  tabIndex={isFocused ? 0 : -1}
                  role="gridcell"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (!isOutOfStock) handleAddProduct(product);
                    }
                  }}
                >
                  {/* 3-dot menu */}
                  {user?.role === "admin" && (
                    <div className="absolute right-1 top-1 z-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-md",
                              "bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                            aria-label="Opciones"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[120px]">
                          {!isDemo && (
                            <>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(product);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWithdrawal(product);
                                }}
                              >
                                <PackageMinus className="h-4 w-4" />
                                Retiro de dueño
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {/* Product image — only when imageUrl exists */}
                  {product.imageUrl && (
                    <div className="mb-2 overflow-hidden rounded-lg border bg-muted/40">
                      <div className="h-28 w-full">
                        <ProductThumbnail
                          imageUrl={product.imageUrl}
                          name={product.name}
                          className="h-full w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Name — primary element */}
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                    {product.name}
                  </p>

                  {/* Spacer to keep price+stock at bottom */}
                  <div className="flex-1" />

                  {/* Price + Stock badge */}
                  <div className="mt-2 flex items-center justify-between gap-1.5">
                    <span className="text-sm font-bold text-blue-600">
                      {formatCurrency(product.price)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs",
                        isOutOfStock
                          ? "bg-red-100 text-red-600 font-medium"
                          : isLowStock
                            ? "bg-amber-100 text-amber-600 font-medium"
                            : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {isOutOfStock
                        ? "Sin stock"
                        : getAvailableStock(product.id)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      aria-disabled={currentPage === 1}
                      className={cn(
                        "cursor-pointer",
                        currentPage === 1 && "pointer-events-none opacity-50",
                      )}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1,
                    )
                    .reduce<(number | "ellipsis")[]>((acc, page, idx, arr) => {
                      if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                        acc.push("ellipsis");
                      }
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <span className="px-2 text-muted-foreground">...</span>
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={item}>
                          <PaginationLink
                            isActive={currentPage === item}
                            onClick={() => setCurrentPage(item)}
                            className="cursor-pointer"
                          >
                            {item}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      aria-disabled={currentPage === totalPages}
                      className={cn(
                        "cursor-pointer",
                        currentPage === totalPages &&
                          "pointer-events-none opacity-50",
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
          </>
        )}
      </div>

      {/* Product Edit Dialog */}
      <ProductDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        product={editingProduct}
        canManageCategories={false}
      />

      {/* Owner Withdrawal Dialog */}
      {withdrawalProduct && (
        <OwnerWithdrawalDialog
          open={withdrawalDialogOpen}
          onClose={handleWithdrawalDialogClose}
          product={withdrawalProduct}
          onConfirm={handleWithdrawalConfirm}
        />
      )}

      <QuantityDialog
        open={quantityDialogProduct !== null}
        onClose={() => setQuantityDialogProduct(null)}
        product={
          quantityDialogProduct ?? {
            id: "",
            storeId: "",
            barcode: null,
            name: "",
            description: null,
            categoryId: "",
            price: 0,
            cost: 0,
            stock: 0,
            minStock: 0,
            quantityType: "DISCRETA",
            unit: "unit",
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
        onConfirm={handleQuantityDialogConfirm}
      />

      <PresentationDialog
        open={presentationDialogProduct !== null}
        onClose={() => setPresentationDialogProduct(null)}
        product={
          presentationDialogProduct ?? {
            id: "",
            storeId: "",
            barcode: null,
            name: "",
            description: null,
            categoryId: "",
            price: 0,
            cost: 0,
            stock: 0,
            minStock: 0,
            quantityType: "DISCRETA",
            unit: "unit",
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
        onSelectFree={handlePresentationDialogSelectFree}
        onSelectPresentation={handlePresentationDialogSelectPresentation}
      />
    </div>
  );
});
