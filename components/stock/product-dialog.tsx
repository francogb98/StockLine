"use client";

import React from "react";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Save, Loader2, Check, Keyboard, ChevronDown, ImagePlus } from "lucide-react";
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
import { formatCurrency } from "@/lib/mock-data";
import { uploadProductImage } from "@/lib/image-upload";
import {
  ProductImageField,
  type ProductImageSelection,
} from "@/components/products/product-image-field";
import type { Product, Category } from "@/lib/types";

const HELP_USES_KEY = "product-dialog-help-uses";
const HELP_COLLAPSE_THRESHOLD = 3;
const QUICK_MARGINS = [20, 30, 40, 50];

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

function deriveMargin(price: number, cost: number): string {
  if (cost <= 0 || price <= 0) return "";
  return String(roundTo2(((price - cost) / cost) * 100));
}

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
    margin: "",
    stock: "",
    minStock: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [imageSelection, setImageSelection] = useState<ProductImageSelection>({
    file: null,
    removed: false,
  });

  const resetForm = useCallback(() => {
    setFormData({
      barcode: "",
      name: "",
      description: "",
      categoryId: categories[0]?.id || "",
      price: "",
      cost: "",
      margin: "",
      stock: "",
      minStock: "5",
    });
    setErrors({});
    setImageSelection({ file: null, removed: false });
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
        margin: deriveMargin(product.price, product.cost),
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
      });
    } else {
      resetForm();
    }
    setErrors({});
    setImageSelection({ file: null, removed: false });
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

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

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

  const handlePricingChange = (
    field: "price" | "cost" | "margin",
    value: string,
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      const costNum = parseFloat(next.cost);
      const priceNum = parseFloat(next.price);
      const marginNum = parseFloat(next.margin);

      const costValid = !isNaN(costNum) && costNum > 0;
      const priceValid = !isNaN(priceNum) && priceNum > 0;
      const marginValid = !isNaN(marginNum) && marginNum >= 0;

      if (field === "cost") {
        if (costValid) {
          if (marginValid) {
            next.price = String(roundTo2(costNum * (1 + marginNum / 100)));
          }
        } else {
          next.margin = "";
        }
      } else if (field === "margin") {
        if (costValid && marginValid) {
          next.price = String(roundTo2(costNum * (1 + marginNum / 100)));
        }
      } else if (field === "price") {
        if (costValid && priceValid) {
          next.margin = deriveMargin(priceNum, costNum);
        }
      }

      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const applyMargin = (margin: number) => {
    setFormData((prev) => {
      const next = { ...prev, margin: String(margin) };
      const costNum = parseFloat(next.cost);
      if (!isNaN(costNum) && costNum > 0) {
        next.price = String(roundTo2(costNum * (1 + margin / 100)));
      }
      return next;
    });
    if (errors.margin) {
      setErrors((prev) => ({ ...prev, margin: "" }));
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

    const { file, removed } = imageSelection;
    const currentImageUrl = product?.imageUrl ?? null;
    const currentPublicId = product?.cloudinaryPublicId ?? null;

    let imageUrl: string | null = currentImageUrl;
    let cloudinaryPublicId: string | null = currentPublicId;

    if (file) {
      setIsUploading(true);
      try {
        const uploaded = await uploadProductImage(file);
        imageUrl = uploaded.imageUrl;
        cloudinaryPublicId = uploaded.cloudinaryPublicId;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error al subir la imagen",
        );
        setIsUploading(false);
        setIsSubmitting(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    if (removed) {
      imageUrl = null;
      cloudinaryPublicId = null;
    }

    if (product) {
      const imageChanged = Boolean(file) || removed;
      updateProduct(product.id, {
        ...productData,
        imageUrl,
        cloudinaryPublicId,
        oldCloudinaryPublicId: imageChanged ? currentPublicId : undefined,
      });
      setIsSubmitting(false);
      onClose();
    } else {
      addProduct({ ...productData, imageUrl, cloudinaryPublicId });
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

  const selectedCategory = categories.find(
    (c) => c.id === formData.categoryId,
  );

  const parsedCost = parseFloat(formData.cost);
  const parsedPrice = parseFloat(formData.price);
  const profit =
    !isNaN(parsedCost) && !isNaN(parsedPrice) ? parsedPrice - parsedCost : null;

  const filteredCategories = categorySearch
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase()),
      )
    : categories;

  const showHelp = !isMobile && !product;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
          role="presentation"
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-dialog-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="relative z-10 flex w-full max-w-full flex-col overflow-hidden rounded-xl border bg-card shadow-2xl shadow-black/20 sm:max-w-2xl"
          >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div className="min-w-0">
            <h2
              id="product-dialog-title"
              className="text-lg font-semibold leading-tight text-foreground"
            >
              {product ? "Editar Producto" : "Nuevo Producto"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product
                ? "Modificá los datos y guardá los cambios."
                : "Cargá un producto nuevo en tu catálogo."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            type="button"
            aria-label="Cerrar"
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
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
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
                    "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm",
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
                    "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                    errors.name && "border-destructive",
                  )}
                  placeholder="Mouse Inalámbrico"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-destructive">{errors.name}</p>
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
                  rows={2}
                  className={cn(
                    "mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none",
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
                  <div className="mt-1.5 rounded-md border border-dashed p-3">
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
                          "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm text-left",
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
                  <p className="mt-1 text-xs text-destructive">
                    {errors.categoryId}
                  </p>
                )}
              </div>

              {/* Cost and Margin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="cost"
                    className="block text-sm font-medium text-foreground"
                  >
                    Costo ($) *
                  </label>
                  <input
                    id="cost"
                    name="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => handlePricingChange("cost", e.target.value)}
                    className={cn(
                      "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                      errors.cost && "border-destructive",
                    )}
                    placeholder="9000"
                  />
                  {errors.cost && (
                    <p className="mt-1 text-xs text-destructive">{errors.cost}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="margin"
                    className="block text-sm font-medium text-foreground"
                  >
                    Margen (%)
                  </label>
                  <input
                    id="margin"
                    name="margin"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.margin}
                    onChange={(e) => handlePricingChange("margin", e.target.value)}
                    className={cn(
                      "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                    )}
                    placeholder="20"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {QUICK_MARGINS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => applyMargin(m)}
                        className={cn(
                          "h-7 rounded-md border px-2.5 text-xs font-medium transition-colors",
                          "hover:bg-muted",
                          parseFloat(formData.margin) === m &&
                            "border-primary bg-primary/10 text-primary",
                        )}
                      >
                        {m}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div>
                <label
                  htmlFor="price"
                  className="block text-sm font-medium text-foreground"
                >
                  Precio de Venta ($) *
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handlePricingChange("price", e.target.value)}
                  className={cn(
                    "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                    errors.price && "border-destructive",
                  )}
                  placeholder="15000"
                />
                {errors.price && (
                  <p className="mt-1 text-xs text-destructive">{errors.price}</p>
                )}
                {profit !== null && (
                  <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Ganancia {formatCurrency(profit)}
                  </p>
                )}
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
                      "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                      errors.stock && "border-destructive",
                    )}
                    placeholder="25"
                  />
                  {errors.stock && (
                    <p className="mt-1 text-xs text-destructive">{errors.stock}</p>
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
                      "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                      errors.minStock && "border-destructive",
                    )}
                    placeholder="5"
                  />
                  {errors.minStock && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.minStock}
                    </p>
                  )}
                </div>
              </div>

              {/* Product image (optional) */}
              <div>
                <div className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium text-foreground">
                    Imagen del producto
                  </label>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Opcional. Puedes agregar una imagen ahora o más adelante.
                </p>
                <div className="mt-2">
                  <ProductImageField
                    key={`${product?.id ?? "new"}-${open}`}
                    imageUrl={product?.imageUrl ?? null}
                    productName={product?.name}
                    selection={imageSelection}
                    onSelectionChange={setImageSelection}
                    disabled={isUploading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t bg-muted/20 px-6 py-4">
            {/* Keyboard Tips - desktop only, collapsible */}
            {showHelp && (
              <div
                className={cn(
                  "mb-3 rounded-md bg-background transition-all",
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
                    <li><kbd className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono">Ctrl+N</kbd> → Abrir formulario</li>
                    <li><kbd className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono">Tab</kbd> → Siguiente campo</li>
                    <li>Buscá categorías escribiendo</li>
                    <li><kbd className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono">Enter</kbd> → Guardar producto</li>
                  </ul>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "h-10 rounded-md border px-4 text-sm font-medium transition-colors",
                  "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
                )}
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="submit-product-btn"
                disabled={isSubmitting || isUploading}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors",
                  "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subiendo imagen...
                  </>
                ) : isSubmitting ? (
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
