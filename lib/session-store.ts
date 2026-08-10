import {
  demoProducts,
  demoCategories,
  demoSales,
  demoCashSessions,
  demoStockMovements,
} from "@/lib/mock-data";

let idCounter = Date.now();
function generateId(): string {
  return `sess-${++idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface StoredProduct {
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
  quantityType: "DISCRETA" | "CONTINUA";
  unit: string;
  presentations?: StoredProductPresentation[];
  imageUrl?: string | null;
  cloudinaryPublicId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredProductPresentation {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredCategory {
  id: string;
  storeId: string;
  name: string;
  normalizedName: string;
  description: string | null;
}

export interface StoredSaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  presentationId?: string | null;
  presentationName?: string | null;
  baseQuantity?: number;
}

export interface StoredSale {
  id: string;
  storeId: string;
  userId: string;
  cashSessionId: string | null;
  items: StoredSaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: Date;
}

export interface StoredCashSession {
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
}

export interface StoredStockMovement {
  id: string;
  storeId: string;
  productId: string;
  userId: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId: string | null;
  reason: string | null;
  createdAt: Date;
}

export interface StoredSuspendedSaleItem {
  id: string;
  suspendedSaleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  presentationId?: string | null;
  presentationName?: string | null;
  baseQuantity?: number;
}

export interface StoredSuspendedSale {
  id: string;
  storeId: string;
  userId: string;
  total: number;
  itemCount: number;
  items: StoredSuspendedSaleItem[];
  createdAt: Date;
}

export interface StoredDevolucionDetalle {
  id: string;
  devolucionId: string;
  productId: string;
  productName?: string;
  saleItemId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  disposicion: "REINGRESAR_STOCK" | "MERMAR";
  createdAt: Date;
}

export interface StoredDevolucion {
  id: string;
  storeId: string;
  ventaId: string;
  userId: string;
  userName?: string;
  fecha: Date;
  motivo: string | null;
  observaciones: string | null;
  montoTotalDevuelto: number;
  createdAt: Date;
  updatedAt: Date;
  detalles: StoredDevolucionDetalle[];
  ventaTotal?: number;
}

function deepCloneDateFields<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj), (_, value) =>
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
      ? new Date(value)
      : value,
  );
}

class SessionDataStore {
  products = new Map<string, StoredProduct>();
  categories = new Map<string, StoredCategory>();
  sales = new Map<string, StoredSale>();
  cashSessions = new Map<string, StoredCashSession>();
  stockMovements = new Map<string, StoredStockMovement>();
  suspendedSales = new Map<string, StoredSuspendedSale>();
  devoluciones = new Map<string, StoredDevolucion>();

  constructor() {
    this.seed();
  }

  private seed() {
    for (const p of demoProducts) {
      const cloned = deepCloneDateFields(p);
      const seeded: StoredProduct = {
        ...cloned,
        quantityType: p.quantityType ?? "DISCRETA",
        unit: p.unit ?? "unit",
        presentations: [],
      };
      this.products.set(seeded.id, seeded);
    }
    for (const c of demoCategories) {
      this.categories.set(c.id, {
        id: c.id,
        storeId: c.storeId,
        name: c.name,
        normalizedName: c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        description: c.description ?? null,
      });
    }
    for (const s of demoSales) {
      const sale: StoredSale = {
        id: s.id,
        storeId: s.storeId,
        userId: s.userId,
        cashSessionId: (s as any).cashSessionId ?? null,
        items: s.items.map((item) => ({
          id: item.id,
          saleId: item.saleId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        subtotal: s.subtotal,
        tax: s.tax,
        total: s.total,
        paymentMethod: s.paymentMethod,
        status: s.status,
        createdAt: new Date(s.createdAt),
      };
      this.sales.set(s.id, sale);
    }
    for (const cs of demoCashSessions) {
      this.cashSessions.set(cs.id, deepCloneDateFields(cs));
    }
    for (const sm of demoStockMovements) {
      this.stockMovements.set(sm.id, {
        id: sm.id,
        storeId: sm.storeId,
        productId: sm.productId,
        userId: sm.userId,
        type: sm.type,
        quantity: sm.quantity,
        previousStock: sm.previousStock,
        newStock: sm.newStock,
        referenceId: sm.referenceId ?? null,
        reason: sm.reason ?? null,
        createdAt: new Date(sm.createdAt),
      });
    }
  }

  // ---- Products ----
  getProducts(storeId: string): StoredProduct[] {
    return [...this.products.values()]
      .filter((p) => p.storeId === storeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getProduct(id: string, storeId: string): StoredProduct | null {
    const p = this.products.get(id);
    return p && p.storeId === storeId ? p : null;
  }

  getProductByBarcode(barcode: string, storeId: string): StoredProduct | null {
    for (const p of this.products.values()) {
      if (p.barcode?.toLowerCase() === barcode.toLowerCase() && p.storeId === storeId) {
        return p;
      }
    }
    return null;
  }

  createProduct(data: {
    storeId: string;
    barcode: string | null;
    name: string;
    description: string | null;
    categoryId: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    quantityType?: "DISCRETA" | "CONTINUA";
    unit?: string;
    presentations?: StoredProductPresentation[];
    imageUrl?: string | null;
    cloudinaryPublicId?: string | null;
  }): StoredProduct {
    const now = new Date();
    const product: StoredProduct = {
      id: generateId(),
      ...data,
      quantityType: data.quantityType ?? "DISCRETA",
      unit: data.unit ?? "unit",
      presentations: data.presentations ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.products.set(product.id, product);
    return product;
  }

  updateProduct(id: string, data: Partial<StoredProduct>): StoredProduct | null {
    const existing = this.products.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.products.set(id, updated);
    return updated;
  }

  deleteProduct(id: string): boolean {
    return this.products.delete(id);
  }

  getProductStock(id: string): number | null {
    const p = this.products.get(id);
    return p ? p.stock : null;
  }

  // ---- Categories ----
  getCategories(storeId: string): StoredCategory[] {
    return [...this.categories.values()]
      .filter((c) => c.storeId === storeId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getCategory(id: string, storeId: string): StoredCategory | null {
    const c = this.categories.get(id);
    return c && c.storeId === storeId ? c : null;
  }

  getCategoryByName(name: string, storeId: string, excludeId?: string): StoredCategory | null {
    const lower = name.toLowerCase();
    for (const c of this.categories.values()) {
      if (c.storeId === storeId && c.name.toLowerCase() === lower && c.id !== excludeId) {
        return c;
      }
    }
    return null;
  }

  createCategory(data: {
    storeId: string;
    name: string;
    normalizedName: string;
    description: string | null;
  }): StoredCategory {
    const category: StoredCategory = {
      id: generateId(),
      ...data,
    };
    this.categories.set(category.id, category);
    return category;
  }

  updateCategory(id: string, data: Partial<StoredCategory>): StoredCategory | null {
    const existing = this.categories.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.categories.set(id, updated);
    return updated;
  }

  deleteCategory(id: string): boolean {
    return this.categories.delete(id);
  }

  countProductsByCategory(categoryId: string, storeId: string): number {
    let count = 0;
    for (const p of this.products.values()) {
      if (p.categoryId === categoryId && p.storeId === storeId) count++;
    }
    return count;
  }

  // ---- Sales ----
  getSales(storeId: string): StoredSale[] {
    return [...this.sales.values()]
      .filter((s) => s.storeId === storeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getSale(id: string, storeId: string): StoredSale | null {
    const s = this.sales.get(id);
    return s && s.storeId === storeId ? s : null;
  }

  createSale(data: {
    storeId: string;
    userId: string;
    cashSessionId?: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    createdAt?: Date;
  }): StoredSale {
    const saleId = generateId();
    const now = new Date();
    const sale: StoredSale = {
      id: saleId,
      storeId: data.storeId,
      userId: data.userId,
      cashSessionId: data.cashSessionId ?? null,
      items: data.items.map((item) => ({
        id: generateId(),
        saleId,
        ...item,
      })),
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      paymentMethod: data.paymentMethod,
      status: "completed",
      createdAt: data.createdAt ?? now,
    };
    this.sales.set(sale.id, sale);
    return sale;
  }

  getSalesByCashSession(cashSessionId: string): StoredSale[] {
    return [...this.sales.values()].filter((s) => s.cashSessionId === cashSessionId);
  }

  aggregateSalesTotal(where: {
    cashSessionId?: string;
    paymentMethod?: string;
    status?: string;
  }): { total: number | null } {
    let total = 0;
    let hasMatches = false;
    for (const s of this.sales.values()) {
      if (where.cashSessionId && s.cashSessionId !== where.cashSessionId) continue;
      if (where.paymentMethod && s.paymentMethod !== where.paymentMethod) continue;
      if (where.status && s.status !== where.status) continue;
      total += s.total;
      hasMatches = true;
    }
    return { total: hasMatches ? total : null };
  }

  countSales(where: { cashSessionId?: string; status?: string }): number {
    let count = 0;
    for (const s of this.sales.values()) {
      if (where.cashSessionId && s.cashSessionId !== where.cashSessionId) continue;
      if (where.status && s.status !== where.status) continue;
      count++;
    }
    return count;
  }

  // ---- Cash Sessions ----
  getCashSessions(storeId: string): StoredCashSession[] {
    return [...this.cashSessions.values()]
      .filter((cs) => cs.storeId === storeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getCashSession(id: string, storeId: string): StoredCashSession | null {
    const cs = this.cashSessions.get(id);
    return cs && cs.storeId === storeId ? cs : null;
  }

  getOpenCashSession(storeId: string): StoredCashSession | null {
    for (const cs of this.cashSessions.values()) {
      if (cs.storeId === storeId && !cs.closedAt) return cs;
    }
    return null;
  }

  createCashSession(data: {
    storeId: string;
    userId: string;
    userName?: string;
    openingAmount: number;
    notes: string | null;
  }): StoredCashSession {
    const session: StoredCashSession = {
      id: generateId(),
      storeId: data.storeId,
      userId: data.userId,
      userName: data.userName ?? data.userId,
      openingAmount: data.openingAmount,
      notes: data.notes,
      expectedAmount: null,
      closingAmount: null,
      difference: null,
      closedAt: null,
      createdAt: new Date(),
    };
    this.cashSessions.set(session.id, session);
    return session;
  }

  updateCashSession(
    id: string,
    data: Partial<StoredCashSession>,
  ): StoredCashSession | null {
    const existing = this.cashSessions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.cashSessions.set(id, updated);
    return updated;
  }

  // ---- Stock Movements ----
  getStockMovements(storeId: string): StoredStockMovement[] {
    return [...this.stockMovements.values()]
      .filter((sm) => sm.storeId === storeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  createStockMovement(data: {
    storeId: string;
    productId: string;
    userId: string;
    type: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    referenceId?: string | null;
    reason?: string | null;
  }): StoredStockMovement {
    const movement: StoredStockMovement = {
      id: generateId(),
      ...data,
      referenceId: data.referenceId ?? null,
      reason: data.reason ?? null,
      createdAt: new Date(),
    };
    this.stockMovements.set(movement.id, movement);
    return movement;
  }

  // ---- Suspended Sales ----
  getSuspendedSales(storeId: string): StoredSuspendedSale[] {
    return [...this.suspendedSales.values()]
      .filter((ss) => ss.storeId === storeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getSuspendedSale(id: string, storeId: string): StoredSuspendedSale | null {
    const ss = this.suspendedSales.get(id);
    return ss && ss.storeId === storeId ? ss : null;
  }

  createSuspendedSale(data: {
    storeId: string;
    userId: string;
    total: number;
    itemCount: number;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  }): StoredSuspendedSale {
    const id = generateId();
    const sale: StoredSuspendedSale = {
      id,
      storeId: data.storeId,
      userId: data.userId,
      total: data.total,
      itemCount: data.itemCount,
      items: data.items.map((item) => ({
        id: generateId(),
        suspendedSaleId: id,
        ...item,
      })),
      createdAt: new Date(),
    };
    this.suspendedSales.set(sale.id, sale);
    return sale;
  }

  deleteSuspendedSale(id: string): boolean {
    return this.suspendedSales.delete(id);
  }

  // ---- Devoluciones ----
  getDevoluciones(storeId: string): StoredDevolucion[] {
    return [...this.devoluciones.values()]
      .filter((d) => d.storeId === storeId)
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  getDevolucion(id: string, storeId: string): StoredDevolucion | null {
    const d = this.devoluciones.get(id);
    if (!d || d.storeId !== storeId) return null;
    const venta = this.sales.get(d.ventaId);
    return {
      ...d,
      ventaTotal: venta && venta.storeId === storeId ? venta.total : undefined,
    };
  }

  createDevolucion(data: {
    storeId: string;
    ventaId: string;
    userId: string;
    userName?: string;
    motivo: string | null;
    observaciones: string | null;
    montoTotalDevuelto: number;
    detalles: Array<{
      productId: string;
      productName?: string;
      saleItemId: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      disposicion: "REINGRESAR_STOCK" | "MERMAR";
    }>;
  }): StoredDevolucion {
    const now = new Date();
    const devolucionId = generateId();
    const detalles: StoredDevolucionDetalle[] = data.detalles.map((d) => ({
      id: generateId(),
      devolucionId,
      productId: d.productId,
      productName: d.productName,
      saleItemId: d.saleItemId,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.subtotal,
      disposicion: d.disposicion,
      createdAt: now,
    }));

    const venta = this.sales.get(data.ventaId);
    const devolucion: StoredDevolucion = {
      id: devolucionId,
      storeId: data.storeId,
      ventaId: data.ventaId,
      userId: data.userId,
      userName: data.userName,
      fecha: now,
      motivo: data.motivo,
      observaciones: data.observaciones,
      montoTotalDevuelto: data.montoTotalDevuelto,
      createdAt: now,
      updatedAt: now,
      detalles,
      ventaTotal: venta && venta.storeId === data.storeId ? venta.total : undefined,
    };
    this.devoluciones.set(devolucion.id, devolucion);
    return devolucion;
  }
}

const _stores = new Map<string, SessionDataStore>();

export function getOrCreateSessionStore(sessionId: string): SessionDataStore {
  let store = _stores.get(sessionId);
  if (!store) {
    store = new SessionDataStore();
    _stores.set(sessionId, store);
  }
  return store;
}

export function destroySessionStore(sessionId: string): void {
  _stores.delete(sessionId);
}

export function cleanupExpiredSessionStores(
  activeSessionIds: Set<string>,
): void {
  for (const sid of _stores.keys()) {
    if (!activeSessionIds.has(sid)) {
      _stores.delete(sid);
    }
  }
}
