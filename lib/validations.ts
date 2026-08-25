import { z } from "zod";
import { PRODUCT_UNITS } from "@/lib/types";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function validateImageFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "El archivo debe ser una imagen (JPG, PNG, WEBP o GIF).";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return "La imagen no puede superar los 5 MB.";
  }
  return null;
}

export const saleItemSchema = z.object({
  productId: z.string().min(1, "ProductId es requerido"),
  productName: z.string().min(1, "ProductName es requerido"),
  quantity: z.number().positive("La cantidad debe ser positiva"),
  unitPrice: z.number().nonnegative("El precio unitario no puede ser negativo").optional(),
  total: z.number().nonnegative("El total no puede ser negativo").optional(),
  presentationId: z.string().nullable().optional(),
  presentationName: z.string().nullable().optional(),
  baseQuantity: z.number().nonnegative().optional(),
});

export const createSaleSchema = z.object({
  id: z.string().optional(),
  storeId: z.string().optional(),
  userId: z.string().optional(),
  cashSessionId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "Debe haber al menos un item"),
  subtotal: z.number().nonnegative("El subtotal no puede ser negativo").optional(),
  tax: z.number().nonnegative("El impuesto no puede ser negativo").optional(),
  total: z.number().positive("El total debe ser mayor a 0").optional(),
  paymentMethod: z.enum(["cash", "card", "transfer"], {
    errorMap: () => ({ message: "Método de pago inválido" }),
  }),
  status: z.enum(["completed", "returned", "cancelled"]).optional(),
  createdAt: z.string().or(z.date()).optional(),
});

export const adjustStockSchema = z.object({
  productId: z.string().min(1, "ProductId es requerido"),
  quantity: z.number().refine((val) => val !== 0, "La cantidad no puede ser cero"),
  reason: z.string().min(1, "El motivo es requerido").max(500, "El motivo es demasiado largo"),
});

export const ownerWithdrawalSchema = z.object({
  productId: z.string().min(1, "ProductId es requerido"),
  quantity: z.number().positive("La cantidad debe ser mayor a cero"),
  reason: z.string().max(500, "El motivo es demasiado largo").optional().default(""),
});

export const productPresentationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido").max(80, "El nombre es demasiado largo"),
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
  unit: z.string().min(1, "La unidad es requerida"),
  active: z.boolean().optional().default(true),
  sortOrder: z.number().int().nonnegative().optional().default(0),
});

export const createProductSchema = z.object({
  barcode: z.string().nullable().optional(),
  name: z.string().min(1, "El nombre es requerido").max(200, "El nombre es demasiado largo"),
  description: z.string().nullable().optional(),
  categoryId: z.string().min(1, "La categoría es requerida"),
  globalProductId: z.string().nullable().optional(),
  price: z.number().nonnegative("El precio no puede ser negativo"),
  cost: z.number().nonnegative("El costo no puede ser negativo"),
  stock: z.number().min(0, "El stock no puede ser negativo"),
  minStock: z.number().min(0, "El stock mínimo no puede ser negativo"),
  quantityType: z.enum(["DISCRETA", "CONTINUA"]).optional().default("DISCRETA"),
  unit: z.string().optional(),
  presentations: z.array(productPresentationSchema).optional().default([]),
  imageUrl: z.string().nullable().optional(),
  cloudinaryPublicId: z.string().nullable().optional(),
  oldCloudinaryPublicId: z.string().nullable().optional(),
  reason: z.string().max(500).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre es demasiado largo"),
  description: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre es demasiado largo"),
  storeName: z.string().min(1, "El nombre de la tienda es requerido").max(200, "El nombre de la tienda es demasiado largo"),
  storeAddress: z.string().optional(),
  storePhone: z.string().optional(),
});

export const suspendedSaleSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative(),
    presentationId: z.string().nullable().optional(),
    presentationName: z.string().nullable().optional(),
    baseQuantity: z.number().nonnegative().optional(),
  })).min(1, "Debe haber al menos un item"),
  total: z.number().positive("El total debe ser mayor a 0"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255, "Email inválido"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "El enlace es inválido o ha expirado"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(128, "La contraseña no puede superar los 128 caracteres"),
});

export const devolucionDetalleSchema = z.object({
  saleItemId: z.string().min(1, "SaleItemId es requerido"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  disposicion: z.enum(["REINGRESAR_STOCK", "MERMAR"]).optional(),
});

export const createDevolucionSchema = z.object({
  ventaId: z.string().min(1, "VentaId es requerido"),
  motivo: z.string().max(500, "El motivo es demasiado largo").optional(),
  observaciones: z.string().max(2000, "Las observaciones son demasiado largas").optional(),
  total: z.boolean().optional(),
  detalles: z.array(devolucionDetalleSchema).optional().default([]),
}).refine(
  (data) => {
    const totalFlag = data.total === true;
    const hasDetalles = Array.isArray(data.detalles) && data.detalles.length > 0;
    return totalFlag || hasDetalles;
  },
  { message: "Devolución inválida: indicá total=true o al menos un detalle", path: ["detalles"] },
);

export const PRODUCT_UNITS_VALUES = PRODUCT_UNITS as readonly [string, ...string[]];

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type OwnerWithdrawalInput = z.infer<typeof ownerWithdrawalSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type ProductPresentationInput = z.infer<typeof productPresentationSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SuspendedSaleInput = z.infer<typeof suspendedSaleSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateDevolucionInput = z.infer<typeof createDevolucionSchema>;
export type DevolucionDetalleInput = z.infer<typeof devolucionDetalleSchema>;
