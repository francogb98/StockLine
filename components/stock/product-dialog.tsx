"use client";

import React from "react";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Save, Loader2, Check, Keyboard, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store-context";
import { useIsMobile } from "@/components/ui/use-mobile";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import type { Product, Category } from "@/lib/types";

const HELP_USES_KEY = "product-dialog-help-uses";
const HELP_COLLAPSE_THRESHOLD = 3;

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  categories?: Category[];
  onManageCategories?: () => void;
  canManageCategories?: boolean;
}

export function ProductDialog({
  open,
  onClose,
  product,
  categories: categoriesProp,
  onManageCategories,
  canManageCategories = false,
}: ProductDialogProps) {
  const {
    categories: contextCategories,
    addProduct,
    updateProduct,
  } = useData();
  const categories = categoriesProp ?? contextCategories;
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [helpExpanded, setHelpExpanded] = useState(true);
  const [helpUses, setHelpUses] = useState(0);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const minStockRef = useRef<HTMLInputElement>(null);
  const categorySearchRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    barcode: "",
    name: "",
    description: "",
    categoryId: "",
    price: "",
    cost: "",
    stock: "",
    minStock: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setFormData({
      barcode: "",
      name: "",
      description: "",
      categoryId: categories[0]?.id || "",
      price: "",
      cost: "",
      stock: "",
      minStock: "5",
    });
    setErrors({});
  }, [categories]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HELP_USES_KEY);
      const uses = stored ? parseInt(stored, 10) : 0;
      setHelpUses(uses);
      setHelpExpanded(uses < HELP_COLLAPSE_THRESHOLD);
    } catch {
      setHelpExpanded(true);
    }
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        barcode: product.barcode ?? "",
        name: product.name,
        description: product.description || "",
        categoryId: product.categoryId,
        price: product.price.toString(),
        cost: product.cost.toString(),
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
      });
    } else {
      resetForm();
    }
    setErrors({});
  }, [product, open, categories, resetForm]);

  useEffect(() => {
    if (open && !product && !isMobile) {
      const timer = setTimeout(() => barcodeRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open, product, isMobile]);

  useEffect(() => {
    if (categoryOpen) {
      const timer = setTimeout(() => categorySearchRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [categoryOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData((prev) => ({ ...prev, categoryId }));
    if (errors.categoryId) {
      setErrors((prev) => ({ ...prev, categoryId: "" }));
    }
    setCategoryOpen(false);
    setCategorySearch("");
  };

  const handleCategoryTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !categoryOpen) {
      e.preventDefault();
      setCategoryOpen(true);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }
    if (!formData.categoryId) {
      newErrors.categoryId = "Selecciona una categoría";
    }
    if (!formData.price || Number(formData.price) <= 0) {
      newErrors.price = "El precio debe ser mayor a 0";
    }
    if (!formData.cost || Number(formData.cost) < 0) {
      newErrors.cost = "El costo no puede ser negativo";
    }
    if (formData.stock === "" || Number(formData.stock) < 0) {
      newErrors.stock = "El stock no puede ser negativo";
    }
    if (formData.minStock === "" || Number(formData.minStock) < 0) {
      newErrors.minStock = "El stock mínimo no puede ser negativo";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const productData = {
      barcode: formData.barcode.trim() || null,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      categoryId: formData.categoryId,
      price: Number(formData.price),
      cost: Number(formData.cost),
      stock: Number(formData.stock),
      minStock: Number(formData.minStock),
    };

    if (product) {
      updateProduct(product.id, productData);
      setIsSubmitting(false);
      onClose();
    } else {
      addProduct(productData);
      setIsSubmitting(false);
      toast.success("Product created successfully");
      resetForm();
      const timer = setTimeout(() => barcodeRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target === minStockRef.current) {
      e.preventDefault();
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(fakeEvent);
    }
  };

  const incrementHelpUses = () => {
    const next = helpUses + 1;
    setHelpUses(next);
    try {
      localStorage.setItem(HELP_USES_KEY, next.toString());
    } catch {
      // ignore
    }
    if (next >= HELP_COLLAPSE_THRESHOLD) {
      setHelpExpanded(false);
    }
  };

  if (!open) return null;

  const selectedCategory = categories.find(
    (c) => c.id === formData.categoryId,
  );

  const filteredCategories = categorySearch
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase()),
      )
    : categories;

  const showHelp = !isMobile && !product;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />

      {/* Dialog */}
      <div className="relative z-10 flex max-h-[95vh] w-full max-w-lg flex-col rounded-lg bg-card shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-semibold text-foreground">
            {product ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
          className="flex min-h-0 flex-1 flex-col"
          data-testid="product-form"
        >
          <div className="flex-1 overflow-y-auto px-5 py-3">
            <div className="space-y-3">
              {/* Barcode */}
              <div>
                <label
                  htmlFor="barcode"
                  className="block text-sm font-medium text-foreground"
                >
                  Código de Barras
                </label>
                <input
                  ref={barcodeRef}
                  id="barcode"
                  name="barcode"
                  type="text"
                  value={formData.barcode}
                  onChange={handleChange}
                  className={cn(
                    "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                  placeholder="7790001000011"
                />
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-foreground"
                >
                  Nombre del Producto *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={cn(
                    "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                    errors.name && "border-destructive",
                  )}
                  placeholder="Mouse Inalámbrico"
                />
                {errors.name && (
                  <p className="mt-0.5 text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-foreground"
                >
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={1}
                  className={cn(
                    "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                  placeholder="Descripción opcional..."
                />
              </div>

              {/* Category - Searchable Combobox */}
              <div>
                <label
                  htmlFor="categoryId"
                  className="block text-sm font-medium text-foreground"
                >
                  Categoría *
                </label>
                {categories.length === 0 ? (
                  <div className="mt-1 rounded-md border border-dashed p-2">
                    <p className="text-xs text-muted-foreground">
                      No hay categorías cargadas.
                    </p>
                    {canManageCategories && onManageCategories && (
                      <button
                        type="button"
                        onClick={onManageCategories}
                        className="mt-1 text-xs font-medium text-primary hover:underline"
                      >
                        Gestionar categorías
                      </button>
                    )}
                  </div>
                ) : (
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger asChild>
                      <button
                        id="categoryId"
                        type="button"
                        role="combobox"
                        aria-expanded={categoryOpen}
                        onKeyDown={handleCategoryTriggerKeyDown}
                        className={cn(
                          "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm text-left",
                          "flex items-center justify-between",
                          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                          errors.categoryId && "border-destructive",
                          !selectedCategory && "text-muted-foreground",
                        )}
                      >
                        <span className="truncate">
                          {selectedCategory?.name || "Seleccionar categoría"}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          ref={categorySearchRef}
                          value={categorySearch}
                          onValueChange={setCategorySearch}
                          placeholder="Buscar categoría..."
                        />
                        <CommandList>
                          <CommandEmpty>No se encontró la categoría.</CommandEmpty>
                          {filteredCategories.map((category) => (
                            <CommandItem
                              key={category.id}
                              value={category.name}
                              onSelect={() => handleCategorySelect(category.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.categoryId === category.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {category.name}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                {errors.categoryId && (
                  <p className="mt-0.5 text-xs text-destructive">
                    {errors.categoryId}
                  </p>
                )}
              </div>

              {/* Price and Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-foreground"
                  >
                    Precio de Venta *
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    className={cn(
                      "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                      errors.price && "border-destructive",
                    )}
                    placeholder="15000"
                  />
                  {errors.price && (
                    <p className="mt-0.5 text-xs text-destructive">{errors.price}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="cost"
                    className="block text-sm font-medium text-foreground"
                  >
                    Costo *
                  </label>
                  <input
                    id="cost"
                    name="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={handleChange}
                    className={cn(
                      "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                      errors.cost && "border-destructive",
                    )}
                    placeholder="9000"
                  />
                  {errors.cost && (
                    <p className="mt-0.5 text-xs text-destructive">{errors.cost}</p>
                  )}
                </div>
              </div>

              {/* Stock and Min Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="stock"
                    className="block text-sm font-medium text-foreground"
                  >
                    Stock Actual *
                  </label>
                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={handleChange}
                    className={cn(
                      "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                      errors.stock && "border-destructive",
                    )}
                    placeholder="25"
                  />
                  {errors.stock && (
                    <p className="mt-0.5 text-xs text-destructive">{errors.stock}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="minStock"
                    className="block text-sm font-medium text-foreground"
                  >
                    Stock Mínimo *
                  </label>
                  <input
                    ref={minStockRef}
                    id="minStock"
                    name="minStock"
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={handleChange}
                    className={cn(
                      "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                      errors.minStock && "border-destructive",
                    )}
                    placeholder="5"
                  />
                  {errors.minStock && (
                    <p className="mt-0.5 text-xs text-destructive">
                      {errors.minStock}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t px-5 py-3">
            {/* Keyboard Tips - desktop only, collapsible */}
            {showHelp && (
              <div
                className={cn(
                  "mb-2 rounded-md bg-muted/50 transition-all",
                  helpExpanded ? "px-3 py-2" : "px-3 py-1.5",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    const next = !helpExpanded;
                    setHelpExpanded(next);
                    if (next) incrementHelpUses();
                  }}
                  className="flex w-full items-center justify-between text-xs text-muted-foreground"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Keyboard className="h-3.5 w-3.5" />
                    Load products faster
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      helpExpanded && "rotate-180",
                    )}
                  />
                </button>
                {helpExpanded && (
                  <ul className="mt-1 space-y-0.5 pl-5 text-xs text-muted-foreground">
                    <li><kbd className="rounded bg-background px-1 py-0.5 text-[10px] font-mono">Ctrl+N</kbd> → Abrir formulario</li>
                    <li><kbd className="rounded bg-background px-1 py-0.5 text-[10px] font-mono">Tab</kbd> → Siguiente campo</li>
                    <li>Buscá categorías escribiendo</li>
                    <li><kbd className="rounded bg-background px-1 py-0.5 text-[10px] font-mono">Enter</kbd> → Guardar producto</li>
                  </ul>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "rounded-md border px-4 py-1.5 text-sm font-medium transition-colors",
                  "hover:bg-muted",
                )}
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="submit-product-btn"
                disabled={isSubmitting}
                className={cn(
                  "flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors",
                  "hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {product ? "Guardar Cambios" : "Crear Producto"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
