// Core Types for StockLine

export type UserRole = "admin" | "employee";
export type SubscriptionPlan = "monthly" | "annual";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";
export type BusinessTypeCode = "retail" | "food_beverage";

export interface User {
  id: string;
  storeId: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash?: string;
  hasCompletedOnboarding?: boolean;
  createdAt: Date;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  businessTypeId?: string | null;
  businessType?: { code: string; name: string } | null;
  config?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface SubscriptionState {
  id: string;
  storeId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  trialEndsAt: Date | string | null;
  mercadoPagoPreapprovalId: string | null;
  daysRemaining: number;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  storeId: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = "cash" | "card" | "transfer";

export type MovementType =
  | "SALE"
  | "RETURN"
  | "MANUAL_ADJUSTMENT"
  | "PRODUCT_CREATION"
  | "IMPORT"
  | "STOCK_CORRECTION"
  | "CANCELLATION";

export interface StockMovement {
  id: string;
  storeId: string;
  productId: string;
  userId: string;
  userName?: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId: string | null;
  reason: string | null;
  createdAt: Date;
}

export interface CashSession {
  id: string;
  storeId: string;
  userId: string;
  userName?: string;
  openingAmount: number;
  expectedAmount: number | null;
  closingAmount: number | null;
  difference: number | null;
  notes: string | null;
  closedAt: Date | null;
  createdAt: Date;
  sales?: Sale[];
}

export interface Sale {
  id: string;
  storeId: string;
  userId: string;
  userName?: string;
  cashSessionId?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: "completed" | "returned" | "cancelled";
  createdAt: Date;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SuspendedSaleItem {
  id: string;
  suspendedSaleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SuspendedSale {
  id: string;
  storeId: string;
  userId: string;
  userName?: string;
  total: number;
  itemCount: number;
  items: SuspendedSaleItem[];
  createdAt: Date | string;
}

export interface DailySummary {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalItems: number;
  topProducts: { productId: string; productName: string; quantity: number }[];
}

export interface HourlySales {
  hour: number;
  sales: number;
  revenue: number;
}

// Auth context type
export interface AuthContextType {
  user: User | null;
  store: Store | null;
  subscription: SubscriptionState | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

// POS Context type
export interface POSContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  completeSale: (paymentMethod: PaymentMethod) => Promise<Sale | null>;
  total: number;
}
