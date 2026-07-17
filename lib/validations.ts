import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().min(1, "ProductId es requerido"),
  productName: z.string().min(1, "ProductName es requerido"),
  quantity: z.number().int().positive("La cantidad debe ser positiva"),
  unitPrice: z.number().nonnegative("El precio unitario no puede ser negativo").optional(),
  total: z.number().nonnegative("El total no puede ser negativo").optional(),
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
  quantity: z.number().int().refine((val) => val !== 0, "La cantidad no puede ser cero"),
  reason: z.string().min(1, "El motivo es requerido").max(500, "El motivo es demasiado largo"),
});

export const createProductSchema = z.object({
  barcode: z.string().nullable().optional(),
  name: z.string().min(1, "El nombre es requerido").max(200, "El nombre es demasiado largo"),
  description: z.string().nullable().optional(),
  categoryId: z.string().min(1, "La categoría es requerida"),
  price: z.number().nonnegative("El precio no puede ser negativo"),
  cost: z.number().nonnegative("El costo no puede ser negativo"),
  stock: z.number().int().min(0, "El stock no puede ser negativo"),
  minStock: z.number().int().min(0, "El stock mínimo no puede ser negativo"),
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
  storeName: z.string().min(1, "El nombre de la tienda es requerido").max(200, "El nombre es demasiado largo"),
  storeAddress: z.string().optional(),
  storePhone: z.string().optional(),
});

export const suspendedSaleSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative(),
  })).min(1, "Debe haber al menos un item"),
  total: z.number().positive("El total debe ser mayor a 0"),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SuspendedSaleInput = z.infer<typeof suspendedSaleSchema>;
