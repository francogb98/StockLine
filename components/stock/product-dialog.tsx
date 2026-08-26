"use client";

import React from "react";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Save,
  Loader2,
  Check,
  Keyboard,
  ChevronDown,
  ImagePlus,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Boxes,
  HelpCircle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store-context";
import { useIsMobile } from "@/components/ui/use-mobile";
import { cn, formatUnitLabel } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/mock-data";
import { uploadProductImage } from "@/lib/image-upload";
import {
  ProductImageField,
  type ProductImageSelection,
} from "@/components/products/product-image-field";
import { ImageSearchDialog } from "@/components/products/image-search-dialog";
import {
  unitsForQuantityType,
  type Product,
  type Category,
  type ProductPresentation,
  type QuantityType,
} from "@/lib/types";

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

function newPresentationLocalId(): string {
  return `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

interface HelpTooltipProps {
  content: React.ReactNode;
  "aria-label": string;
  testId: string;
}

function HelpTooltip({ content, "aria-label": ariaLabel, testId }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen} delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          onPointerDown={(event) => {
            event.preventDefault();
            setOpen((prev) => !prev);
          }}
          onClick={(event) => {
            event.preventDefault();
          }}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          data-testid={testId}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-[320px] p-0"
        onPointerDownOutside={(event) => {
          if (event.target === document.activeElement) return;
        }}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  categories?: Category[];
  onManageCategories?: () => void;
  canManageCategories?: boolean;
  onDelete?: (productId: string) => void;
}

type PresentationDraft = {
  key: string;
  id?: string;
  name: string;
  quantity: string;
  active: boolean;
};

export function ProductDialog({
  open,
  onClose,
  product,
  categories: categoriesProp,
  onManageCategories,
  canManageCategories = false,
  onDelete,
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
    quantityType: "DISCRETA" as QuantityType,
    unit: "unit",
  });
  const [presentations, setPresentations] = useState<PresentationDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [imageSelection, setImageSelection] = useState<ProductImageSelection>({
    file: null,
    removed: false,
  });
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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
      quantityType: "DISCRETA",
      unit: "unit",
    });
    setPresentations([]);
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
      const qt: QuantityType =
        product.quantityType === "CONTINUA" ? "CONTINUA" : "DISCRETA";
      const unit = product.unit || (qt === "DISCRETA" ? "unit" : "kg");
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
        quantityType: qt,
        unit,
      });
      setPresentations(
        (product.presentations ?? []).map((p: ProductPresentation) => ({
          key: p.id || newPresentationLocalId(),
          id: p.id,
          name: p.name,
          quantity: String(p.quantity),
          active: p.active,
        })),
      );
    } else {
      resetForm();
    }
    setErrors({});
    setImageSelection({ file: null, removed: false });
  }, [product, open]);

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
      setErrors((prev) => ({ ...prev, [margin]: "" }));
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

  const handleQuantityTypeChange = (value: QuantityType) => {
    setFormData((prev) => {
      const allowed = unitsForQuantityType(value);
      const nextUnit = (allowed as readonly string[]).includes(prev.unit)
        ? prev.unit
        : allowed[0];
      if (value === "DISCRETA" && presentations.length > 0) {
        setPresentations([]);
      }
      return { ...prev, quantityType: value, unit: nextUnit };
    });
    if (errors.unit) setErrors((prev) => ({ ...prev, unit: "" }));
  };

  const addPresentation = () => {
    setPresentations((prev) => [
      ...prev,
      {
        key: newPresentationLocalId(),
        name: "",
        quantity: "",
        active: true,
      },
    ]);
  };

  const updatePresentation = (
    key: string,
    field: "name" | "quantity",
    value: string,
  ) => {
    setPresentations((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)),
    );
  };

  const togglePresentation = (key: string) => {
    setPresentations((prev) =>
      prev.map((p) => (p.key === key ? { ...p, active: !p.active } : p)),
    );
  };

  const removePresentation = (key: string) => {
    setPresentations((prev) => prev.filter((p) => p.key !== key));
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
    if (formData.cost === "" || Number(formData.cost) < 0) {
      newErrors.cost = "El costo no puede ser negativo";
    }
    if (formData.stock === "" || Number(formData.stock) < 0) {
      newErrors.stock = formData.stock === "" ? "Ingresá el stock inicial" : "El stock no puede ser negativo";
    }
    if (formData.minStock === "" || Number(formData.minStock) < 0) {
      newErrors.minStock = "El stock mínimo no puede ser negativo";
    }
    if (formData.quantityType === "DISCRETA" && formData.unit !== "unit") {
      newErrors.unit = "Un producto DISCRETO solo admite la unidad 'unit'";
    }
    if (formData.quantityType === "CONTINUA" && formData.unit === "unit") {
      newErrors.unit = "Un producto continuo requiere una unidad de medida";
    }

    presentations.forEach((p, idx) => {
      if (!p.name.trim()) {
        newErrors[`presentation_${idx}_name`] = "Requerido";
      }
      const q = Number(p.quantity);
      if (!Number.isFinite(q) || q <= 0) {
        newErrors[`presentation_${idx}_quantity`] = "Cantidad inválida";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPresentationsPayload = () => {
    if (formData.quantityType === "DISCRETA") return [];
    return presentations
      .filter((p) => p.name.trim() !== "" && Number(p.quantity) > 0)
      .map((p, idx) => ({
        id: p.id,
        productId: "",
        name: p.name.trim(),
        quantity: Number(p.quantity),
        unit: formData.unit,
        active: p.active,
        sortOrder: idx,
      }));
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
      quantityType: formData.quantityType,
      unit: formData.unit,
      presentations: buildPresentationsPayload(),
    };

    const { file, removed, searchResultUrl } = imageSelection;
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
    } else if (searchResultUrl) {
      // Image was already downloaded and uploaded to Cloudinary by the search dialog
      imageUrl = searchResultUrl;
      // We don't have the cloudinaryPublicId from the download endpoint response
      // It will be set when the product is created/updated
    }

    if (removed) {
      imageUrl = null;
      cloudinaryPublicId = null;
    }

    if (product) {
      const imageChanged = Boolean(file) || removed || Boolean(searchResultUrl);
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

  const handleSubmitAndDuplicate = async (e: React.FormEvent) => {
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
      quantityType: formData.quantityType,
      unit: formData.unit,
      presentations: buildPresentationsPayload(),
    };

    const { file, removed, searchResultUrl } = imageSelection;

    let imageUrl: string | null = null;
    let cloudinaryPublicId: string | null = null;

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
    } else if (searchResultUrl) {
      imageUrl = searchResultUrl;
    }

    if (removed) {
      imageUrl = null;
      cloudinaryPublicId = null;
    }

    addProduct({ ...productData, imageUrl, cloudinaryPublicId });
    setIsSubmitting(false);
    toast.success("Producto creado. Datos copiados para el siguiente.");

    // Keep most data, clear only unique fields
    setFormData((prev) => ({
      ...prev,
      barcode: "",
      stock: "",
    }));
    setErrors({});
    setImageSelection({ file: null, removed: false });

    const timer = setTimeout(() => barcodeRef.current?.focus(), 50);
    return () => clearTimeout(timer);
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

  const stockStep = formData.quantityType === "CONTINUA" ? "0.001" : "1";
  const minStockStep = formData.quantityType === "CONTINUA" ? "0.001" : "1";
  const unitOptions = unitsForQuantityType(formData.quantityType);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
          role="presentation"
        >
          <motion.div
            key="product-dialog-backdrop"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            aria-hidden
          />

          <motion.div
            key="product-dialog-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-dialog-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="relative z-10 flex w-full max-w-full max-h-[80vh] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl shadow-black/20 sm:max-w-2xl"
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
          <div className="flex items-center gap-1">
            {product && onDelete && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive/40"
                aria-label="Eliminar producto"
                data-testid="delete-product-btn"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              type="button"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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
                      style={{ zIndex: 100 }}
                      data-testid="category-popover-content"
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

              {/* Quantity type + Unit */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="block text-sm font-medium text-foreground">
                      Tipo de cantidad
                    </span>
                    <HelpTooltip
                      aria-label="Qué significa tipo de cantidad"
                      testId="quantity-type-help"
                      content={
                        <div className="space-y-2 p-3 text-left">
                          <p className="text-xs font-semibold text-foreground">
                            Discreta vs. Continua
                          </p>
                          <p className="text-xs leading-relaxed">
                            <span className="font-medium text-foreground">Discreta</span>:
                            se vende en cantidades enteras. Ej: 1 gaseosa, 2
                            paquetes de galletitas, 3 libros.
                          </p>
                          <p className="text-xs leading-relaxed">
                            <span className="font-medium text-foreground">Continua</span>:
                            se vende por peso, volumen o longitud, y admite
                            decimales. Ej: 0,250 kg de queso, 1,500 L de
                            aceite, 2,350 m de tela.
                          </p>
                        </div>
                      }
                    />
                  </div>
                  <div className="mt-1.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuantityTypeChange("DISCRETA")}
                      className={cn(
                        "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                        formData.quantityType === "DISCRETA"
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                      data-testid="quantity-type-discreta"
                    >
                      Discreta
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuantityTypeChange("CONTINUA")}
                      className={cn(
                        "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                        formData.quantityType === "CONTINUA"
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                      data-testid="quantity-type-continua"
                    >
                      Continua
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formData.quantityType === "DISCRETA"
                      ? "Cantidades enteras (1, 2, 3…). Ideal para unidades."
                      : "Cantidades con decimales (0.250, 1.500…). Ideal por peso, volumen o longitud."}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="unit"
                    className="block text-sm font-medium text-foreground"
                  >
                    Unidad base
                  </label>
                  <select
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className={cn(
                      "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                      errors.unit && "border-destructive",
                    )}
                    data-testid="unit-select"
                  >
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>
                        {formatUnitLabel(u)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    El precio y el stock se expresan en esta unidad.
                  </p>
                  {errors.unit && (
                    <p className="mt-1 text-xs text-destructive">{errors.unit}</p>
                  )}
                </div>
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
                  Precio de Venta ($) *{" "}
                  {formData.quantityType === "CONTINUA" && (
                    <span className="text-xs font-normal text-muted-foreground">
                      por {formatUnitLabel(formData.unit)}
                    </span>
                  )}
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
                    Stock Actual *{" "}
                    {formData.quantityType === "CONTINUA" && (
                      <span className="text-xs font-normal text-muted-foreground">
                        ({formatUnitLabel(formData.unit)})
                      </span>
                    )}
                  </label>
                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    step={stockStep}
                    value={formData.stock}
                    onChange={handleChange}
                    className={cn(
                      "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                      errors.stock && "border-destructive",
                    )}
                    placeholder={formData.quantityType === "CONTINUA" ? "125" : "25"}
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
                    Stock Mínimo *{" "}
                    {formData.quantityType === "CONTINUA" && (
                      <span className="text-xs font-normal text-muted-foreground">
                        ({formatUnitLabel(formData.unit)})
                      </span>
                    )}
                  </label>
                  <input
                    ref={minStockRef}
                    id="minStock"
                    name="minStock"
                    type="number"
                    min="0"
                    step={minStockStep}
                    value={formData.minStock}
                    onChange={handleChange}
                    className={cn(
                      "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                      errors.minStock && "border-destructive",
                    )}
                    placeholder={formData.quantityType === "CONTINUA" ? "10" : "5"}
                  />
                  {errors.minStock && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.minStock}
                    </p>
                  )}
                </div>
              </div>

              {/* Presentations (only for CONTINUA) */}
              {formData.quantityType === "CONTINUA" && (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        Presentaciones
                      </span>
                      <HelpTooltip
                        aria-label="Qué es una presentación"
                        testId="presentations-help"
                        content={
                          <div className="space-y-2 p-3 text-left">
                            <p className="text-xs font-semibold text-foreground">
                              Qué es una presentación
                            </p>
                            <p className="text-xs leading-relaxed">
                              Es una forma de venta predefinida para un
                              producto continuo. Por ejemplo, un yogurt en
                              pote de 1 kg, 500 g y 250 g.
                            </p>
                            <p className="text-xs leading-relaxed">
                              Cada presentación es un múltiplo de la unidad
                              base del producto, pero no tiene stock propio:
                              al venderla, se descuenta del stock del
                              producto padre.
                            </p>
                          </div>
                        }
                      />
                      {presentations.length > 0 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {presentations.length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={addPresentation}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      data-testid="add-presentation-btn"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar presentación
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Opcional. Las presentaciones comparten el stock del producto y
                    siempre usan la unidad {formatUnitLabel(formData.unit)}.
                  </p>
                  {presentations.length === 0 ? (
                    <div className="mt-2 rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                      Sin presentaciones. El producto se venderá solo por
                      {" "}{formatUnitLabel(formData.unit)} en cantidades libres.
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {presentations.map((p, idx) => {
                        const nameErr = errors[`presentation_${idx}_name`];
                        const qtyErr = errors[`presentation_${idx}_quantity`];
                        return (
                          <div
                            key={p.key}
                            className={cn(
                              "flex items-start gap-2 rounded-md border bg-background p-2",
                              !p.active && "opacity-60",
                            )}
                          >
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <input
                                type="text"
                                value={p.name}
                                onChange={(e) =>
                                  updatePresentation(p.key, "name", e.target.value)
                                }
                                placeholder="Ej: Bolsa 25 kg"
                                className={cn(
                                  "h-9 w-full rounded-md border bg-background px-2 text-sm",
                                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                                  nameErr && "border-destructive",
                                )}
                                data-testid={`presentation-name-${idx}`}
                              />
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={p.quantity}
                                  onChange={(e) =>
                                    updatePresentation(
                                      p.key,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="25"
                                  className={cn(
                                    "h-9 w-24 rounded-md border bg-background px-2 text-sm tabular-nums",
                                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                                    qtyErr && "border-destructive",
                                  )}
                                  data-testid={`presentation-quantity-${idx}`}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {formatUnitLabel(formData.unit)}
                                </span>
                              </div>
                              {(nameErr || qtyErr) && (
                                <p className="text-xs text-destructive">
                                  {nameErr ?? qtyErr}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={() => togglePresentation(p.key)}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                                  p.active
                                    ? "text-emerald-600 hover:bg-emerald-50"
                                    : "text-muted-foreground hover:bg-muted",
                                )}
                                title={p.active ? "Desactivar" : "Activar"}
                                data-testid={`presentation-toggle-${idx}`}
                              >
                                {p.active ? (
                                  <Power className="h-3.5 w-3.5" />
                                ) : (
                                  <PowerOff className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => removePresentation(p.key)}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                title="Eliminar"
                                data-testid={`presentation-remove-${idx}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Product image (optional) */}
              <div>
                <div className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium text-foreground">
                    Imagen del producto
                  </label>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Opcional. Podés subir una imagen o buscar en Internet.
                </p>
                <div className="mt-2">
                  <ProductImageField
                    key={`${product?.id ?? "new"}-${open}`}
                    imageUrl={product?.imageUrl ?? null}
                    productName={product?.name}
                    selection={imageSelection}
                    onSelectionChange={setImageSelection}
                    onSearchInternet={() => setImageSearchOpen(true)}
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
              {!product && (
                <button
                  type="button"
                  onClick={handleSubmitAndDuplicate}
                  disabled={isSubmitting || isUploading}
                  data-testid="save-and-duplicate-btn"
                  className={cn(
                    "flex h-10 items-center justify-center gap-2 rounded-md border border-primary px-4 text-sm font-semibold text-primary transition-colors",
                    "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Guardar y Duplicar
                    </>
                  )}
                </button>
              )}
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

      {/* Image Search Dialog */}
      <ImageSearchDialog
        open={imageSearchOpen}
        onClose={() => setImageSearchOpen(false)}
        onSelect={(imageUrl) => {
          setImageSelection({
            file: null,
            removed: false,
            searchResultUrl: imageUrl,
          });
        }}
        initialQuery={formData.name}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a eliminar <strong className="text-foreground">{product?.name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (product && onDelete) {
                  onDelete(product.id);
                  onClose();
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatePresence>
  );
}
