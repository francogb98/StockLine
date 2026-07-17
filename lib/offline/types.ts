// Offline Queue Types

export interface QueuedSale {
  id: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "card" | "transfer";
  userId: string;
  storeId: string;
  createdAt: string;
  status: "pending" | "synced" | "failed";
  retryCount: number;
  lastError: string | null;
}

export interface CachedProduct {
  id: string;
  storeId: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  categoryId: string;
  barcode: string | null;
  description: string;
  updatedAt: string;
}

export interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
}

export interface GracePeriodState {
  isActive: boolean;
  expiresAt: string | null;
  lastConnectedAt: string | null;
}
