import { useStaff } from '@/store/staff';
import { ApiError, send } from './client';

/**
 * The staff screens' side of /api/v1/admin. Nothing here is cached: every
 * answer depends on who is asking and may have changed since the last look.
 *
 * A 401 anywhere means the session ended on the shop (signed out elsewhere,
 * demoted, expired), so it signs this phone out too and the layout sends the
 * screen back to the door.
 */

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export const ORDER_FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARED', 'SHIPPED', 'DELIVERED'];

export type Period = { revenue: number; orders: number };
export type Dashboard = {
  admin: { name: string };
  periods: { today: Period; week: Period; month: Period };
  pendingCount: number;
  outOfStock: number;
  lowStockCount: number;
  recentOrders: OrderRow[];
  lowStock: { id: string; name: string; stockQty: number; lowStockThreshold: number }[];
  /** Return requests waiting on the shop. Absent from an older shop. */
  returns?: { requested: number; approved: number; received: number };
};

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REFUSED' | 'RECEIVED' | 'RESOLVED' | 'CANCELLED';
export type ReturnFilter = 'open' | 'all' | ReturnStatus;
export type ReturnReason = 'WRONG_PART' | 'DAMAGED' | 'DOES_NOT_FIT' | 'DEFECTIVE' | 'NOT_NEEDED';
export type ReturnCover = 'shop' | 'warranty' | 'standard';

export type ReturnRow = {
  id: string;
  ref: string;
  status: ReturnStatus;
  reason: ReturnReason;
  wish: 'EXCHANGE' | 'REFUND';
  cover: ReturnCover;
  createdAt: string;
  orderId: string;
  orderRef: string;
  customerName: string;
  phone: string;
  parts: string[];
  photoCount: number;
};

export type ReturnDetail = {
  id: string;
  ref: string;
  status: ReturnStatus;
  reason: ReturnReason;
  wish: 'EXCHANGE' | 'REFUND';
  note: string | null;
  unmounted: boolean;
  cover: ReturnCover;
  method: 'DROP_OFF' | 'PICKUP' | null;
  shopNote: string | null;
  outcome: 'EXCHANGED' | 'REFUNDED' | null;
  refundAmount: number | null;
  restocked: boolean;
  photoIds: string[];
  deliveredAt: string | null;
  next: ReturnStatus[];
  createdAt: string;
  decidedAt: string | null;
  receivedAt: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  order: {
    id: string;
    ref: string;
    customerName: string;
    phone: string;
    email: string | null;
    vehicleLabel: string | null;
    deliveryMethod: 'DELIVERY' | 'PICKUP';
    governorate: string;
    address: string | null;
  };
  lines: { orderItemId: string; name: string; sku: string; qty: number; ordered: number; unitPrice: number; fit: 'VERIFIED' | 'DERIVED' | 'UNLISTED' | null; productId: string | null }[];
  /** At the prices charged — a starting figure for a refund, which the shop sets. */
  value: number;
};

export type ReturnMove =
  | { to: 'APPROVED'; method: 'DROP_OFF' | 'PICKUP'; shopNote?: string }
  | { to: 'REFUSED'; shopNote: string }
  | { to: 'RECEIVED'; restock: boolean }
  | { to: 'RESOLVED'; outcome: 'EXCHANGED' | 'REFUNDED'; refundAmount?: number; shopNote?: string };

export type OrderRow = {
  id: string;
  ref: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  deliveryMethod?: 'DELIVERY' | 'PICKUP';
  governorate?: string;
  lines?: number;
  hasBackorder?: boolean;
};

export type OrderDetail = {
  id: string;
  ref: string;
  status: OrderStatus;
  createdAt: string;
  customerName: string;
  phone: string;
  email: string | null;
  accountEmail: string | null;
  governorate: string;
  address: string | null;
  deliveryMethod: 'DELIVERY' | 'PICKUP';
  paymentMethod: 'COD' | 'CARD';
  notes: string | null;
  vehicleLabel: string | null;
  items: {
    id: string;
    productId: string | null;
    name: string;
    sku: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    backorder: boolean;
    fit: 'VERIFIED' | 'DERIVED' | 'UNLISTED' | null;
  }[];
  totals: {
    taxed: boolean;
    /** The parts after any promo code. */
    goods: number;
    /** Already out of `goods`; absent from an older server. */
    discount?: number;
    promoCode?: string | null;
    shipping: number;
    vatRate: number;
    vat: number;
    stampDuty: number;
    total: number;
  };
  history: { status: OrderStatus; at: string; note: string | null }[];
  /** The customer's rating once delivered; absent from an older server. */
  review?: { stars: number; comment: string | null; at: string } | null;
};

export type StockFilter = '' | 'rupture' | 'bas' | 'sansphoto' | 'inactif';
export type Supply = 'ON_ORDER' | 'UNAVAILABLE';

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  family: string;
  stockQty: number;
  lowStockThreshold: number;
  price: number;
  active: boolean;
  supply: Supply;
  imageUrl: string | null;
};

export type ProductDetail = Omit<ProductRow, 'imageUrl'> & {
  slug: string;
  category: string;
  priceBuy: number;
  compareAtPrice: number | null;
  images: { id: string; url: string }[];
  movements: { change: number; reason: string; note: string | null; at: string }[];
};

export type Family = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  children: { id: string; name: string; slug: string; imageUrl: string | null }[];
};

export type Setting = { key: string; value: string; placeholder: boolean };

type Init = Parameters<typeof send>[1];

async function call<T>(path: string, init: Init = {}): Promise<T> {
  const token = useStaff.getState().token;
  if (!token) throw new ApiError({ kind: 'unauthorized' }, `${path}: signed out`);
  try {
    return await send<T>(`/api/v1/admin${path}`, { ...init, token });
  } catch (err) {
    if (err instanceof ApiError && err.failure.kind === 'unauthorized') useStaff.getState().expire();
    throw err;
  }
}

const qs = (params: Record<string, string | undefined>) => {
  const s = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join('&');
  return s ? `?${s}` : '';
};

export const staffApi = {
  dashboard: (signal?: AbortSignal) => call<Dashboard>('/dashboard', { signal }),

  orders: (p: { status?: OrderStatus; q?: string; cursor?: string }, signal?: AbortSignal) =>
    call<{ orders: OrderRow[]; next: string | null }>(`/orders${qs(p)}`, { signal }),
  order: (id: string, signal?: AbortSignal) => call<OrderDetail>(`/orders/${id}`, { signal }),
  setStatus: (id: string, status: OrderStatus) =>
    call<OrderDetail>(`/orders/${id}/status`, { method: 'POST', body: { status } }),

  products: (p: { f?: StockFilter; q?: string; cursor?: string }, signal?: AbortSignal) =>
    call<{ products: ProductRow[]; next: string | null }>(`/products${qs(p)}`, { signal }),
  product: (id: string, signal?: AbortSignal) => call<ProductDetail>(`/products/${id}`, { signal }),
  updateProduct: (
    id: string,
    patch: Partial<{ priceSell: number; priceBuy: number; active: boolean; supply: Supply; lowStockThreshold: number }>,
  ) => call<ProductDetail>(`/products/${id}`, { method: 'PATCH', body: patch }),
  stock: (id: string, body: { set: number; note?: string } | { change: number; note?: string }) =>
    call<ProductDetail>(`/products/${id}/stock`, { method: 'POST', body }),
  addPhoto: (id: string, form: FormData) => call<ProductDetail>(`/products/${id}/images`, { method: 'POST', body: form }),
  deletePhoto: (imageId: string) => call<{ ok: true }>(`/images/${imageId}`, { method: 'DELETE' }),
  primaryPhoto: (imageId: string) => call<{ ok: true }>(`/images/${imageId}/primary`, { method: 'POST' }),

  families: (signal?: AbortSignal) => call<Family[]>('/categories', { signal }),
  familyPicture: (id: string, form: FormData) =>
    call<{ imageUrl: string | null }>(`/categories/${id}/image`, { method: 'POST', body: form }),
  removeFamilyPicture: (id: string) => call<{ imageUrl: null }>(`/categories/${id}/image`, { method: 'DELETE' }),

  returns: (filter: ReturnFilter, signal?: AbortSignal) =>
    call<{ counts: { requested: number; approved: number; received: number }; returns: ReturnRow[] }>(`/returns${qs({ filter })}`, { signal }),
  returnDetail: (id: string, signal?: AbortSignal) => call<ReturnDetail>(`/returns/${id}`, { signal }),
  moveReturn: (id: string, move: ReturnMove) => call<ReturnDetail>(`/returns/${id}`, { method: 'POST', body: move }),
  /** A customer's photo: served to staff only, so it is fetched with the session rather than linked. */
  returnPhotoUrl: (photoId: string) => `/api/v1/admin/returns/photos/${photoId}`,

  settings: (signal?: AbortSignal) => call<Setting[]>('/settings', { signal }),
  saveSettings: (patch: Record<string, string>) => call<Setting[]>('/settings', { method: 'PATCH', body: patch }),
};
