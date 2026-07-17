"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  ArrowUpDown,
  Filter,
  History,
  Upload,
} from "lucide-react";
import { useAuth, useData } from "@/lib/store-context";
import { formatCurrency } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { SkeletonStockPage } from "@/components/ui/skeletons";
import { ErrorState } from "@/components/ui/error-state";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ProductDialog } from "./product-dialog";
import { CategoryDialog } from "./category-dialog";
import { StockMovementHistory } from "./stock-movement-history";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";
import { ImportSheet } from "./import/import-sheet";
import type { Product, Category } from "@/lib/types";

type SortField = "name" | "stock" | "price" | "category";
type SortDirection = "asc" | "desc";
type StockFilter = "all" | "low" | "out";

const ITEMS_PER_PAGE = 20;

export function StockManagement() {
  const { user } = useAuth();
  const {
    products,
    categories: contextCategories,
    deleteProduct,
    isDataLoading,
    isDataError,
    refreshData,
  } = useData();
  const [categories, setCategories] = useState<Category[]>(contextCategories);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCategories(contextCategories);
  }, [contextCategories]);

  useEffect(() => {
    const handleOpenProductDialog = () => {
      setEditingProduct(null);
      setDialogOpen(true);
    };
    window.addEventListener("open-product-dialog", handleOpenProductDialog);
    return () =>
      window.removeEventListener("open-product-dialog", handleOpenProductDialog);
  }, []);

  useEffect(() => {
    if (
      selectedCategory &&
      !categories.some((c) => c.id === selectedCategory)
    ) {
      setSelectedCategory(null);
    }
  }, [selectedCategory, categories]);

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "Sin categoría";
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      if (!product || typeof product.name !== "string") return false;

      // Search filter
      const matchesSearch =
        search === "" ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        (typeof product.barcode === "string" && product.barcode.includes(search));

      // Category filter
      const matchesCategory =
        selectedCategory === null || product.categoryId === selectedCategory;

      // Stock filter
      let matchesStock = true;
      if (stockFilter === "low") {
        matchesStock = product.stock <= product.minStock && product.stock > 0;
      } else if (stockFilter === "out") {
        matchesStock = product.stock === 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "");
          break;
        case "stock":
          comparison = (a.stock ?? 0) - (b.stock ?? 0);
          break;
        case "price":
          comparison = (a.price ?? 0) - (b.price ?? 0);
          break;
        case "category":
          comparison = getCategoryName(a.categoryId).localeCompare(
            getCategoryName(b.categoryId),
          );
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    products,
    search,
    selectedCategory,
    stockFilter,
    sortField,
    sortDirection,
    categories,
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    if (window.confirm(`¿Eliminar "${product.name}"?`)) {
      deleteProduct(product.id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingProduct(null);
  };

  const lowStockCount = products.filter(
    (p) => p.stock <= p.minStock && p.stock > 0,
  ).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  if (isDataLoading) {
    return <SkeletonStockPage />;
  }

  if (isDataError) {
    return (
      <ErrorState
        message="Error al cargar los productos"
        onRetry={refreshData}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Gestión de Stock
            </h1>
            <p className="text-sm text-muted-foreground">
              {products.length} productos en total
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <>
                <button
                  onClick={() => setImportSheetOpen(true)}
                  data-testid="open-import-sheet-btn"
                  className={cn(
                    "flex items-center gap-2 rounded-lg border bg-background px-4 py-2 font-medium text-foreground transition-colors",
                    "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  )}
                  type="button"
                >
                  <Upload className="h-5 w-5" />
                  Importar
                </button>
                <button
                  onClick={() => setCategoryDialogOpen(true)}
                  data-testid="open-category-dialog-btn"
                  className={cn(
                    "flex items-center gap-2 rounded-lg border bg-background px-4 py-2 font-medium text-foreground transition-colors",
                    "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  )}
                  type="button"
                >
                  Gestionar categorías
                </button>
              </>
            )}
            <button
              onClick={() => setDialogOpen(true)}
              data-testid="open-product-dialog-btn"
              className={cn(
                "flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors",
                "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              )}
              type="button"
            >
              <Plus className="h-5 w-5" />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por nombre o código..."
              className={cn(
                "h-10 w-full rounded-md border bg-background pl-9 pr-4 text-sm",
                "placeholder:text-muted-foreground",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              )}
            />
          </div>

          {/* Stock filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex rounded-md border">
              <button
                onClick={() => {
                  setStockFilter("all");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  stockFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                type="button"
              >
                Todos
              </button>
              <button
                onClick={() => {
                  setStockFilter("low");
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex items-center gap-1 border-x px-3 py-1.5 text-sm font-medium transition-colors",
                  stockFilter === "low"
                    ? "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"
                    : "text-muted-foreground hover:bg-muted",
                )}
                type="button"
              >
                Bajo ({lowStockCount})
              </button>
              <button
                onClick={() => {
                  setStockFilter("out");
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-colors",
                  stockFilter === "out"
                    ? "bg-destructive text-destructive-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                type="button"
              >
                Sin stock ({outOfStockCount})
              </button>
            </div>
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory || ""}
            onChange={(e) => {
              setSelectedCategory(e.target.value || null);
              setCurrentPage(1);
            }}
            className={cn(
              "h-10 rounded-md border bg-background px-3 text-sm",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            )}
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Showing X of Y indicator */}
      {filteredProducts.length > 0 && (
        <div className="shrink-0 border-b bg-muted/30 px-4 py-2">
          <p className="text-sm text-muted-foreground">
            Mostrando{" "}
            {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}{" "}
            de {filteredProducts.length} productos
          </p>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
            <tr className="border-b">
              <th className="p-3 text-left">
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  Producto
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                Código
              </th>
              <th className="p-3 text-left">
                <button
                  onClick={() => handleSort("category")}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  Categoría
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="p-3 text-right">
                <button
                  onClick={() => handleSort("price")}
                  className="flex items-center justify-end gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  Precio
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="p-3 text-right">
                <button
                  onClick={() => handleSort("stock")}
                  className="flex items-center justify-end gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  Stock
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="p-3 text-right text-sm font-medium text-muted-foreground">
                Min. Stock
              </th>
              <th className="p-3 text-center text-sm font-medium text-muted-foreground" style={{minWidth: 130}}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-2 text-muted-foreground">
                    No se encontraron productos
                  </p>
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => {
                const isLowStock =
                  product.stock <= product.minStock && product.stock > 0;
                const isOutOfStock = product.stock === 0;

                return (
                  <tr
                    key={product.id}
                    data-testid={`stock-row-${product.barcode}`}
                    className={cn(
                      "border-b transition-colors hover:bg-muted/50",
                      isOutOfStock && "bg-destructive/5",
                      isLowStock && "bg-[hsl(var(--warning))]/5",
                    )}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {(isLowStock || isOutOfStock) && (
                          <AlertTriangle
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isOutOfStock
                                ? "text-destructive"
                                : "text-[hsl(var(--warning))]",
                            )}
                          />
                        )}
                        <span className="font-medium text-foreground">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-sm text-muted-foreground">
                      {product.barcode}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {getCategoryName(product.categoryId)}
                    </td>
                    <td className="p-3 text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(product.price)}
                    </td>
                    <td
                      data-testid={`stock-value-${product.barcode}`}
                      className={cn(
                        "p-3 text-right font-bold tabular-nums",
                        isOutOfStock
                          ? "text-destructive"
                          : isLowStock
                            ? "text-[hsl(var(--warning))]"
                            : "text-foreground",
                      )}
                    >
                      {product.stock}
                    </td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                      {product.minStock}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setHistoryProduct(product)}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
                            "hover:bg-muted hover:text-foreground",
                          )}
                          title="Historial de movimientos"
                          type="button"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        {user?.role === "admin" && (
                          <button
                            onClick={() => setAdjustProduct(product)}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
                              "hover:bg-muted hover:text-foreground",
                            )}
                            title="Ajustar stock"
                            type="button"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(product)}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
                            "hover:bg-muted hover:text-foreground",
                          )}
                          title="Editar"
                          type="button"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
                            "hover:bg-destructive/10 hover:text-destructive",
                          )}
                          title="Eliminar"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="shrink-0 border-t bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando{" "}
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}{" "}
              de {filteredProducts.length} productos
            </p>
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
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
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
        </div>
      )}

      {/* Product Dialog */}
      <ProductDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        product={editingProduct}
        categories={categories}
        onManageCategories={() => setCategoryDialogOpen(true)}
        canManageCategories={user?.role === "admin"}
      />

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        categories={categories}
        canManage={user?.role === "admin"}
        onCategoriesChange={setCategories}
      />

      <StockMovementHistory
        open={historyProduct !== null}
        onClose={() => setHistoryProduct(null)}
        productId={historyProduct?.id ?? ""}
        productName={historyProduct?.name ?? ""}
      />

      {adjustProduct && (
        <StockAdjustmentDialog
          open={adjustProduct !== null}
          onClose={() => setAdjustProduct(null)}
          product={adjustProduct}
        />
      )}

      <ImportSheet
        open={importSheetOpen}
        onClose={() => {
          setImportSheetOpen(false);
          refreshData();
        }}
      />
    </div>
  );
}
