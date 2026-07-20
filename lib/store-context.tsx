"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  User,
  UserRole,
  Store,
  SubscriptionState,
  Product,
  Sale,
  CartItem,
  PaymentMethod,
  SaleItem,
  SuspendedSale,
} from "./types";
import {
  demoStore,
  demoUsers,
  demoProducts,
  demoSales,
  demoCategories,
} from "./mock-data";
import type { Category } from "./types";
import { getTaxConfig, calculateTax, calculateTotal } from "./tax-config";
import { enqueueSale } from "./offline/sale-queue";
import { cacheProducts, getCachedProducts } from "./offline/product-cache";
import { isGraceActive, recordConnection } from "./offline/grace";

// ============ Auth Context ============
interface PendingCashSession {
  id: string;
  userName: string;
  openingAmount: number;
  createdAt: string;
  salesCount: number;
  currentCashTotal: number;
  currentTotal: number;
}

interface AuthContextType {
  user: User | null;
  store: Store | null;
  subscription: SubscriptionState | null;
  pendingCashSession: PendingCashSession | null;
  login: (email: string, password: string) => Promise<{ success: boolean; pendingCashSession: PendingCashSession | null }>;
  register: (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  clearPendingCashSession: () => void;
  isLoading: boolean;
  isSessionLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// ============ POS Context ============
interface POSContextType {
  cart: CartItem[];
  reservedStock: Record<string, number>;
  getAvailableStock: (productId: string) => number;
  addToCart: (product: Product, quantity?: number) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  completeSale: (paymentMethod: PaymentMethod) => Promise<Sale | null>;
  suspendSale: () => Promise<boolean>;
  restoreSuspendedSale: (suspendedSale: SuspendedSale) => Promise<void>;
  deleteSuspendedSale: (id: string) => Promise<void>;
  suspendedSales: SuspendedSale[];
  isSuspendedSalesLoading: boolean;
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  setDiscount: (discount: number) => void;
  discountType: "percentage" | "fixed";
  setDiscountType: (type: "percentage" | "fixed") => void;
  receivedAmount: number;
  setReceivedAmount: (amount: number) => void;
  change: number;
  taxConfig: { enabled: boolean; rate: number; name: string };
}

const POSContext = createContext<POSContextType | null>(null);

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error("usePOS must be used within POSProvider");
  }
  return context;
}

// ============ Data Context ============
interface DataContextType {
  products: Product[];
  categories: Category[];
  sales: Sale[];
  isDataLoading: boolean;
  isDataError: boolean;
  addProduct: (
    product: Omit<Product, "id" | "storeId" | "createdAt" | "updatedAt">,
  ) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProductByBarcode: (barcode: string) => Product | undefined;
  getLowStockProducts: () => Product[];
  addSale: (sale: Sale, background?: boolean) => Promise<Sale | null>;
  getTodaySales: () => Sale[];
  getSalesByDateRange: (start: Date, end: Date) => Sale[];
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
}

// ============ Combined Provider ============
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "1";

export function StoreProvider({ children }: { children: ReactNode }) {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(
    useMockData ? demoStore : null,
  );
  const [subscription, setSubscription] = useState<SubscriptionState | null>(
    null,
  );
  const [pendingCashSession, setPendingCashSession] =
    useState<PendingCashSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(!useMockData);

  // Data State
  const [products, setProducts] = useState<Product[]>(
    useMockData ? demoProducts : [],
  );
  const [categories, setCategories] = useState<Category[]>(
    useMockData ? demoCategories : [],
  );
  const [sales, setSales] = useState<Sale[]>(useMockData ? demoSales : []);
  const [isDataLoading, setIsDataLoading] = useState(!useMockData);
  const [isDataError, setIsDataError] = useState(false);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [reservedStock, setReservedStock] = useState<Record<string, number>>(
    {},
  );
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);
  const [isSuspendedSalesLoading, setIsSuspendedSalesLoading] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed");
  const [receivedAmount, setReceivedAmount] = useState<number>(0);

  // Clear all user-specific state (used on logout and before login)
  const clearUserData = useCallback(() => {
    setUser(null);
    setStore(null);
    setSubscription(null);
    setPendingCashSession(null);
    setCart([]);
    setReservedStock({});
    setSuspendedSales([]);
    setDiscount(0);
    setDiscountType("fixed");
    setReceivedAmount(0);
    if (!useMockData) {
      setProducts([]);
      setCategories([]);
      setSales([]);
      setIsDataError(false);
    }
  }, []);

  // Restore session from cookie on mount
  useEffect(() => {
    async function restoreSession() {
      if (useMockData) {
        // Auto-login with demo user when using mock data
        setUser(demoUsers[0]);
        setStore(demoStore);
        setIsSessionLoading(false);
        return;
      }

      // Try to restore session from API
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Always set store from the authenticated user's data
          if (data.user?.store) {
            setStore(data.user.store);
          } else {
            setStore(null);
          }
          if (data.pendingCashSession) {
            setPendingCashSession(data.pendingCashSession);
          }
        } else {
          // Session invalid — ensure clean state
          setUser(null);
          setStore(null);
        }
      } catch (error) {
        console.error("Error restoring session:", error);
        // Ensure clean state on network error
        setUser(null);
        setStore(null);
      } finally {
        setIsSessionLoading(false);
      }
    }

    restoreSession();
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (useMockData || !user) {
      return;
    }

    try {
      const response = await fetch("/api/subscription/status");
      if (!response.ok) {
        if (response.status === 401) {
          setSubscription(null);
          return;
        }
        throw new Error("No se pudo obtener estado de suscripción");
      }

      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error("Error loading subscription status:", error);
      setSubscription(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user || useMockData) {
      setSubscription(null);
      return;
    }

    refreshSubscription();
  }, [user, refreshSubscription]);

  // Load from API if not using mock mode and user is authenticated
  useEffect(() => {
    if (useMockData) return;
    if (!user) return;

    async function loadData() {
      setIsDataLoading(true);
      setIsDataError(false);
      try {
        const [productsRes, categoriesRes, salesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
          fetch("/api/sales"),
        ]);

        if (!productsRes.ok || !categoriesRes.ok || !salesRes.ok) {
          // Do not force mock fallback for auth errors on protected endpoints.
          if (
            productsRes.status === 401 ||
            categoriesRes.status === 401 ||
            salesRes.status === 401
          ) {
            setIsDataLoading(false);
            return;
          }
          throw new Error("Error fetching data from API");
        }

        const [productsData, categoriesData, salesData] = await Promise.all([
          productsRes.json(),
          categoriesRes.json(),
          salesRes.json(),
        ]);

        const normalizedProducts = (productsData ?? []).map((p: any) => ({
          ...p,
          price: Number(p.price),
          cost: Number(p.cost),
        }));
        const normalizedSales = (salesData ?? []).map((s: any) => ({
          ...s,
          subtotal: Number(s.subtotal),
          tax: Number(s.tax),
          total: Number(s.total),
          items: (s.items ?? []).map((i: any) => ({
            ...i,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            total: Number(i.total),
          })),
        }));

        setProducts(normalizedProducts);
        setCategories(categoriesData);
        setSales(normalizedSales);

        // Cache products to IDB for offline fallback (non-blocking)
        cacheProducts(normalizedProducts).catch((err) => {
          console.error("Failed to cache products to IDB:", err);
        });

        // Record connection for grace period
        recordConnection().catch(() => {});
      } catch (error) {
        console.error(
          "Error loading data from API, attempting IDB cache fallback",
          error,
        );

        // Attempt to load products from IDB cache before falling back to mock data
        try {
          const cachedProducts = await getCachedProducts();
          if (cachedProducts.length > 0) {
            // Convert CachedProduct back to Product shape for the UI
            const fallbackProducts: Product[] = cachedProducts.map((cp) => ({
              id: cp.id,
              storeId: cp.storeId,
              name: cp.name,
              price: Number(cp.price),
              cost: Number(cp.cost),
              stock: cp.stock,
              minStock: cp.minStock,
              categoryId: cp.categoryId,
              barcode: cp.barcode,
              description: cp.description,
              createdAt: new Date(cp.updatedAt),
              updatedAt: new Date(cp.updatedAt),
            }));
            setProducts(fallbackProducts);
            setIsDataError(true);
            setCategories(demoCategories);
            setSales(demoSales);
          } else {
            // No cache available — fall back to mock data
            setIsDataError(true);
            setProducts(demoProducts);
            setCategories(demoCategories);
            setSales(demoSales);
          }
        } catch {
          // IDB read also failed — fall back to mock data
          setIsDataError(true);
          setProducts(demoProducts);
          setCategories(demoCategories);
          setSales(demoSales);
        }
      } finally {
        setIsDataLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Load suspended sales
  useEffect(() => {
    if (useMockData || !user) return;

    async function loadSuspendedSales() {
      setIsSuspendedSalesLoading(true);
      try {
        const res = await fetch("/api/suspended-sales");
        if (res.ok) {
          const data = await res.json();
          setSuspendedSales(data);
        }
      } catch (error) {
        console.error("Error loading suspended sales:", error);
      } finally {
        setIsSuspendedSalesLoading(false);
      }
    }

    loadSuspendedSales();
  }, [user]);

  const refreshData = useCallback(async () => {
    if (useMockData || !user) return;
    setIsDataLoading(true);
    setIsDataError(false);
    try {
      const [productsRes, categoriesRes, salesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/sales"),
      ]);

      if (!productsRes.ok || !categoriesRes.ok || !salesRes.ok) {
        if (
          productsRes.status === 401 ||
          categoriesRes.status === 401 ||
          salesRes.status === 401
        ) {
          setIsDataLoading(false);
          return;
        }
        throw new Error("Error refreshing data from API");
      }

      const [productsData, categoriesData, salesData] = await Promise.all([
        productsRes.json(),
        categoriesRes.json(),
        salesRes.json(),
      ]);

      const normalizedProducts = (productsData ?? []).map((p: any) => ({
        ...p,
        price: Number(p.price),
        cost: Number(p.cost),
      }));
      const normalizedSales = (salesData ?? []).map((s: any) => ({
        ...s,
        subtotal: Number(s.subtotal),
        tax: Number(s.tax),
        total: Number(s.total),
        items: (s.items ?? []).map((i: any) => ({
          ...i,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          total: Number(i.total),
        })),
      }));

      setProducts(normalizedProducts);
      setCategories(categoriesData);
      setSales(normalizedSales);
    } catch (error) {
      console.error("Error refreshing data from API", error);
      setIsDataError(true);
    } finally {
      setIsDataLoading(false);
    }
  }, [user]);

  // Auth Methods
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; pendingCashSession: PendingCashSession | null }> => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok && data.user) {
          // Clear all stale data from previous user before setting new user
          setCart([]);
          setReservedStock({});
          setSuspendedSales([]);
          setDiscount(0);
          setDiscountType("fixed");
          setReceivedAmount(0);
          setProducts([]);
          setCategories([]);
          setSales([]);
          setIsDataError(false);
          setSubscription(null);

          setUser(data.user);
          // Always set store from the authenticated user's data
          if (data.user?.store) {
            setStore(data.user.store);
          } else {
            setStore(null);
          }

          const pending = data.pendingCashSession ?? null;
          setPendingCashSession(pending);
          setIsLoading(false);
          return { success: true, pendingCashSession: pending };
        } else {
          setIsLoading(false);
          return { success: false, pendingCashSession: null };
        }
      } catch (error) {
        console.error("Login error:", error);
        setIsLoading(false);
        return { success: false, pendingCashSession: null };
      }
    },
    [],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: UserRole,
    ): Promise<boolean> => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name,
            storeName: store?.name || "Mi Tienda",
          }),
        });

        const data = await response.json();

        if (response.ok && data.user) {
          const newUser: User = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            storeId: data.user.storeId,
            createdAt: new Date(data.user.createdAt),
          };

          // Clear stale data before setting new user
          setCart([]);
          setReservedStock({});
          setSuspendedSales([]);
          setDiscount(0);
          setDiscountType("fixed");
          setReceivedAmount(0);
          setProducts([]);
          setCategories([]);
          setSales([]);
          setIsDataError(false);
          setSubscription(null);

          setUser(newUser);
          if (data.user?.store) {
            setStore(data.user.store);
          }
          setIsLoading(false);
          return true;
        } else {
          setIsLoading(false);
          return false;
        }
      } catch (error) {
        console.error("Register error:", error);
        setIsLoading(false);
        return false;
      }
    },
    [store],
  );

  const clearPendingCashSession = useCallback(() => {
    setPendingCashSession(null);
  }, []);

  const logout = useCallback(async () => {
    if (!useMockData) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }

    // Clear absolutely all user-specific state
    clearUserData();

    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark", "light");
    }
  }, [clearUserData]);

  // Data Methods
  const addProduct = useCallback(
    (
      productData: Omit<Product, "id" | "storeId" | "createdAt" | "updatedAt">,
    ) => {
      const newProduct: Product = {
        ...productData,
        id: `prod-${Date.now()}`,
        storeId: store?.id || "store-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setProducts((prev) => [...prev, newProduct]);

      if (!useMockData) {
        fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProduct),
        })
          .then((res) => {
            if (!res.ok) {
              return res.json().then((err) => {
                throw new Error(err.error || "Error creating product");
              });
            }
            return res.json();
          })
          .then((created) => {
            if (created && typeof created.name === "string" && created.id) {
              setProducts((prev) =>
                prev.map((p) => (p.id === newProduct.id ? created : p)),
              );
            }
          })
          .catch((error) => {
            console.error(
              "addProduct API failed, using mock in-memory entry",
              error,
            );
          });
      }
    },
    [store],
  );

  const updateProduct = useCallback((id: string, data: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: new Date() } : p,
      ),
    );

    if (!useMockData) {
      fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch((error) => {
        console.error(
          "updateProduct API failed, state is updated locally only",
          error,
        );
      });
    }
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));

    if (!useMockData) {
      fetch(`/api/products/${id}`, {
        method: "DELETE",
      }).catch((error) => {
        console.error(
          "deleteProduct API failed, state is updated locally only",
          error,
        );
      });
    }
  }, []);

  const getProductByBarcode = useCallback(
    (barcode: string) => products.find((p) => p.barcode === barcode),
    [products],
  );

  const getLowStockProducts = useCallback(
    () => products.filter((p) => p.stock <= p.minStock),
    [products],
  );

  const addSale = useCallback(async (sale: Sale, background = false): Promise<Sale | null> => {
    if (useMockData) {
      if (!background) {
        setSales((prev) => [sale, ...prev]);
        sale.items.forEach((item) => {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === item.productId
                ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
                : p,
            ),
          );
        });
      }
      return sale;
    }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sale),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Error al crear venta" }));

        // Grace period: if subscription check fails (403) but we were recently connected,
        // allow the sale and queue it for later sync
        if (res.status === 403) {
          const graceOk = await isGraceActive().catch(() => false);
          if (graceOk) {
            await enqueueSale({
              id: sale.id,
              items: sale.items.map((i) => ({
                productId: i.productId,
                productName: i.productName,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                total: i.total,
              })),
              subtotal: sale.subtotal,
              tax: sale.tax,
              total: sale.total,
              paymentMethod: sale.paymentMethod,
              userId: sale.userId,
              storeId: sale.storeId,
              createdAt: sale.createdAt instanceof Date ? sale.createdAt.toISOString() : String(sale.createdAt),
            });
            if (!background) {
              sale.items.forEach((item) => {
                setProducts((prev) =>
                  prev.map((p) =>
                    p.id === item.productId
                      ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
                      : p,
                  ),
                );
              });
            }
            window.dispatchEvent(new CustomEvent("sale-queued"));
            return sale;
          }
        }

        // Server error (5xx) or unreachable — queue sale for later sync
        // 4xx (except 403 already handled) means client error — don't queue, let user retry
        if (res.status >= 500) {
          try {
            await enqueueSale({
              id: sale.id,
              items: sale.items.map((i) => ({
                productId: i.productId,
                productName: i.productName,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                total: i.total,
              })),
              subtotal: sale.subtotal,
              tax: sale.tax,
              total: sale.total,
              paymentMethod: sale.paymentMethod,
              userId: sale.userId,
              storeId: sale.storeId,
              createdAt: sale.createdAt instanceof Date ? sale.createdAt.toISOString() : String(sale.createdAt),
            });

            if (!background) {
              sale.items.forEach((item) => {
                setProducts((prev) =>
                  prev.map((p) =>
                    p.id === item.productId
                      ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
                      : p,
                  ),
                );
              });
            }

            window.dispatchEvent(new CustomEvent("sale-queued"));
            return sale;
          } catch (queueError) {
            console.error("Failed to enqueue sale to IDB:", queueError);
          }
        }

        // Background mode: revert optimistic stock deduction on failure
        if (background) {
          sale.items.forEach((item) => {
            setProducts((prev) =>
              prev.map((p) =>
                p.id === item.productId
                  ? { ...p, stock: p.stock + item.quantity }
                  : p,
              ),
            );
          });
          setSales((prev) => prev.filter((s) => s.id !== sale.id));
          window.dispatchEvent(new CustomEvent("sale-failed", { detail: { saleId: sale.id, error: errData.error } }));
        }

        console.error("addSale API error:", errData.error);
        return null;
      }

      const saved = await res.json();
      const normalizedSaved = {
        ...saved,
        items: Array.isArray(saved?.items) ? saved.items : [],
      };
      const realSale = { ...normalizedSaved, userName: sale.userName } as Sale;

      if (background) {
        // Background mode: replace optimistic sale with real server data
        setSales((prev) => prev.map((s) => (s.id === sale.id ? realSale : s)));
      } else {
        setSales((prev) => [realSale, ...prev]);
        const stockDeductions = new Map<string, number>();
        for (const item of sale.items) {
          stockDeductions.set(
            item.productId,
            (stockDeductions.get(item.productId) || 0) + item.quantity,
          );
        }
        setProducts((prev) =>
          prev.map((p) => {
            const deduction = stockDeductions.get(p.id);
            if (!deduction) return p;
            return { ...p, stock: Math.max(0, p.stock - deduction) };
          }),
        );
      }

      window.dispatchEvent(new CustomEvent("sale-completed"));
      return realSale;
    } catch (error) {
      console.error("addSale network error:", error);

      // Network failure → queue sale to IndexedDB for later sync
      try {
        await enqueueSale({
          id: sale.id,
          items: sale.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          })),
          subtotal: sale.subtotal,
          tax: sale.tax,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          userId: sale.userId,
          storeId: sale.storeId,
          createdAt: sale.createdAt instanceof Date ? sale.createdAt.toISOString() : String(sale.createdAt),
        });

        if (!background) {
          sale.items.forEach((item) => {
            setProducts((prev) =>
              prev.map((p) =>
                p.id === item.productId
                  ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
                  : p,
              ),
            );
          });
        }

        window.dispatchEvent(new CustomEvent("sale-queued"));
        return sale;
      } catch (queueError) {
        console.error("Failed to enqueue sale to IDB:", queueError);
        return null;
      }
    }
  }, []);

  const getTodaySales = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sales.filter((s) => new Date(s.createdAt) >= today);
  }, [sales]);

  const getSalesByDateRange = useCallback(
    (start: Date, end: Date) => {
      return sales.filter((s) => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= start && saleDate <= end;
      });
    },
    [sales],
  );

  // POS Methods
  const getAvailableStock = useCallback(
    (productId: string): number => {
      const product = products.find((p) => p.id === productId);
      if (!product) return 0;
      return product.stock - (reservedStock[productId] || 0);
    },
    [products, reservedStock],
  );

  const addToCart = useCallback(
    (product: Product, quantity: number = 1): boolean => {
      const available = getAvailableStock(product.id);
      if (available < quantity) return false;
      setReservedStock((prev) => ({
        ...prev,
        [product.id]: (prev[product.id] || 0) + quantity,
      }));
      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id);
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          );
        }
        return [...prev, { product, quantity }];
      });
      return true;
    },
    [getAvailableStock],
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    setReservedStock((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const updateQuantity = useCallback(
    (productId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
      }
      const currentItem = cart.find((i) => i.product.id === productId);
      if (!currentItem) return;
      const delta = newQuantity - currentItem.quantity;
      if (delta > 0) {
        const available = getAvailableStock(productId);
        if (available < delta) return;
        setReservedStock((r) => ({
          ...r,
          [productId]: (r[productId] || 0) + delta,
        }));
      } else if (delta < 0) {
        setReservedStock((r) => ({
          ...r,
          [productId]: Math.max(0, (r[productId] || 0) + delta),
        }));
      }
      setCart((prev) =>
        prev.map((i) =>
          i.product.id === productId ? { ...i, quantity: newQuantity } : i,
        ),
      );
    },
    [removeFromCart, getAvailableStock, cart],
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setReservedStock({});
    setDiscount(0);
    setReceivedAmount(0);
  }, []);

  const taxConfig = getTaxConfig(store?.config);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const discountAmount = discountType === "percentage"
    ? Math.round((subtotal * discount / 100) * 100) / 100
    : discount;

  const tax = calculateTax(subtotal - discountAmount, taxConfig);
  const total = calculateTotal(subtotal, tax, discountAmount);
  const change = receivedAmount > total ? Math.round((receivedAmount - total) * 100) / 100 : 0;

  const completeSale = useCallback(
    async (paymentMethod: PaymentMethod): Promise<Sale | null> => {
      if (cart.length === 0 || !user) return null;

      const saleItems: SaleItem[] = cart.map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        saleId: `sale-${Date.now()}`,
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.product.price),
        total: Number(item.product.price) * item.quantity,
      }));

      const sale: Sale = {
        id: `sale-${Date.now()}`,
        storeId: store?.id || "store-1",
        userId: user.id,
        userName: user.name,
        items: saleItems,
        subtotal,
        tax,
        total,
        paymentMethod,
        status: "completed",
        createdAt: new Date(),
      };

      // Optimistic: apply local state immediately for instant UX
      setSales((prev) => [sale, ...prev]);
      saleItems.forEach((item) => {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === item.productId
              ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
              : p,
          ),
        );
      });
      clearCart();

      // Sync with server in background (non-blocking)
      addSale(sale, true).catch((error) => {
        console.error("Background sale sync failed:", error);
      });

      return sale;
    },
    [cart, user, store, subtotal, tax, total, addSale, clearCart],
  );

  // Suspended Sales Methods
  const suspendSale = useCallback(async (): Promise<boolean> => {
    if (cart.length === 0 || !user) return false;

    const saleItems = cart.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      total: item.product.price * item.quantity,
    }));

    try {
      const res = await fetch("/api/suspended-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: saleItems, total }),
      });

      if (!res.ok) return false;

      const created = await res.json();
      setSuspendedSales((prev) => [created, ...prev]);
      clearCart();
      return true;
    } catch (error) {
      console.error("Error suspending sale:", error);
      return false;
    }
  }, [cart, user, total, clearCart]);

  const restoreSuspendedSale = useCallback(
    async (suspendedSale: SuspendedSale): Promise<void> => {
      // Load products from the suspended sale into the cart
      const restoredCart: CartItem[] = [];

      for (const item of suspendedSale.items) {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          restoredCart.push({ product, quantity: item.quantity });
        }
      }

      if (restoredCart.length === 0) return;

      // Clear current cart first
      clearCart();

      // Add all items back
      for (const item of restoredCart) {
        addToCart(item.product, item.quantity);
      }

      // Delete the suspended sale from server
      try {
        await fetch(`/api/suspended-sales/${suspendedSale.id}`, {
          method: "DELETE",
        });
        setSuspendedSales((prev) =>
          prev.filter((s) => s.id !== suspendedSale.id),
        );
      } catch (error) {
        console.error("Error deleting suspended sale:", error);
      }
    },
    [products, clearCart, addToCart],
  );

  const deleteSuspendedSale = useCallback(async (id: string): Promise<void> => {
    try {
      await fetch(`/api/suspended-sales/${id}`, { method: "DELETE" });
      setSuspendedSales((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Error deleting suspended sale:", error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        store,
        subscription,
        pendingCashSession,
        login,
        register,
        logout,
        refreshSubscription,
        clearPendingCashSession,
        isLoading,
        isSessionLoading,
      }}
    >
      <DataContext.Provider
        value={{
          products,
          categories,
          sales,
          isDataLoading,
          isDataError,
          addProduct,
          updateProduct,
          deleteProduct,
          getProductByBarcode,
          getLowStockProducts,
          addSale,
          getTodaySales,
          getSalesByDateRange,
          refreshData,
        }}
      >
        <POSContext.Provider
          value={{
            cart,
            reservedStock,
            getAvailableStock,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            completeSale,
            suspendSale,
            restoreSuspendedSale,
            deleteSuspendedSale,
            suspendedSales,
            isSuspendedSalesLoading,
            subtotal,
            tax,
            total,
            discount,
            setDiscount,
            discountType,
            setDiscountType,
            receivedAmount,
            setReceivedAmount,
            change,
            taxConfig,
          }}
        >
          {children}
        </POSContext.Provider>
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}
