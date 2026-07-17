"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import Link from "next/link";
import { Search, Package, AlertTriangle, Loader2, MoreVertical, Pencil } from "lucide-react";
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
import type { Product } from "@/lib/types";

const ITEMS_PER_PAGE = 20;

export interface QuickProductsHandle {
  focusSearch: () => void;
  focusFirstProduct: () => void;
}

export const QuickProducts = forwardRef<QuickProductsHandle>(function QuickProducts(
  _props,
  ref,
) {
  const { user, isSessionLoading } = useAuth();
  const { products, categories, isDataLoading } = useData();
  const { addToCart, getAvailableStock } = usePOS();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    const ok = addToCart(product, 1);
    if (!ok) toast.error("Sin stock disponible");
  };

  const handleOpenEdit = (product: (typeof products)[0]) => {
    setEditingProduct(product);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingProduct(null);
  };

  const {
    focusedIndex,
    containerRef: gridContainerRef,
    handleKeyDown: handleGridKeyDown,
    focusFirst,
    focusItem,
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
  }));

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-muted/30 p-4">
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
              "h-10 w-full rounded-md border bg-background pl-9 pr-4 text-sm",
              "placeholder:text-muted-foreground",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            )}
          />
        </div>

        {/* Category filter */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setCurrentPage(1);
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
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
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
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
      <div className="flex-1 overflow-auto p-4">
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
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando{" "}
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}{" "}
              de {filteredProducts.length} productos
            </p>
          </div>
          <div
            ref={gridContainerRef}
            data-keyboard-zone="products"
            className="grid grid-cols-2 gap-2 lg:grid-cols-3"
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
                    "group relative flex cursor-pointer flex-col rounded-lg border p-2 text-left transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    isOutOfStock
                      ? "cursor-not-allowed bg-muted/50 opacity-60"
                      : "hover:border-primary hover:shadow-sm",
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
                  {/* Low stock indicator */}
                  {isLowStock && !isOutOfStock && (
                    <div className="absolute -right-1 -top-1 z-10">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]">
                        <AlertTriangle className="h-3 w-3" />
                      </span>
                    </div>
                  )}

                  <p className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {product.barcode}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(product.price)}
                    </span>
                    <span
                      className={cn(
                        "truncate text-[11px]",
                        isOutOfStock
                          ? "font-medium text-destructive"
                          : isLowStock
                            ? "text-[hsl(var(--warning))]"
                            : "text-muted-foreground",
                      )}
                    >
                      {isOutOfStock
                        ? "Sin stock"
                        : `Stock: ${getAvailableStock(product.id)}`}
                    </span>
                  </div>

                  {/* 3-dot menu */}
                  {user?.role === "admin" && (
                    <div className="absolute right-1 top-1 z-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition-opacity",
                              "text-muted-foreground hover:bg-muted hover:text-foreground",
                              "group-hover:opacity-100 focus:opacity-100",
                            )}
                            aria-label="Opciones"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[120px]">
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
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
    </div>
  );
});
