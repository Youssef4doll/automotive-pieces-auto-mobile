import type { Product } from './catalogue';
import { get, send } from './client';
import { categoryName } from '@/i18n/data-locale';

export type CompatibleVehicle = {
  make: string;
  model: string;
  engine: string;
  engineId: string;
  fuel: string | null;
  powerHp: number | null;
  engineCode: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  /** Inferred by the import from a sibling engine, not stated by a supplier. */
  derived: boolean;
};

export type ProductDetail = Product & {
  description: string;
  gallery: string[];
  category: { name: string; slug: string };
  family: { name: string; slug: string };
  axle: 'AVANT' | 'ARRIERE' | null;
  side: 'GAUCHE' | 'DROITE' | null;
  /** The shop's own rows, labels in the shop's own words. */
  specs: { label: string; value: string }[];
  oeGroups: { owner: string; refs: { raw: string; normalized: string }[] }[];
  aftermarketRefs: { type: string; brand: string; raw: string }[];
  packContents: { name: string; slug: string; price: number }[];
  /** The shop's links, then parts bought together in 2+ orders; empty when neither. */
  boughtTogether: Product[];
  compatibility: { total: number; vehicles: CompatibleVehicle[] };
  manufacturer: {
    name: string;
    legalName: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  } | null;
  leadTime: string | null;
};

const PREFETCH_MS = 5_000;
const prefetched = new Map<string, { promise: Promise<ProductDetail>; at: number }>();

function loadProduct(slug: string, engineId: string | undefined, signal?: AbortSignal): Promise<ProductDetail> {
  const params = engineId ? `?engine=${encodeURIComponent(engineId)}` : '';
  return get<ProductDetail>(`/api/v1/products/${encodeURIComponent(slug)}${params}`, { signal, fresh: true }).then((p) => ({
    ...p,
    category: { ...p.category, name: categoryName(p.category.slug, p.category.name) },
    family: { ...p.family, name: categoryName(p.family.slug, p.family.name) },
  }));
}

export const productApi = {
  /** One push the first time this part is back on the shelf. */
  alertWhenBack: (slug: string, pushToken: string, locale: string) =>
    send<{ subscribed: boolean }>(`/api/v1/products/${encodeURIComponent(slug)}/stock-alert`, { method: 'POST', body: { token: pushToken, locale } }),
  stopAlert: (slug: string, pushToken: string) =>
    send<{ subscribed: boolean }>(`/api/v1/products/${encodeURIComponent(slug)}/stock-alert`, { method: 'DELETE', body: { token: pushToken } }),

  /**
   * Always asked fresh. A product page is where the customer decides to buy,
   * and a price or a stock line from twenty minutes ago in this session's
   * cache is exactly the wrong thing to decide on.
   *
   * The one exception is a few seconds old: `prefetch`, started when a
   * finger lands on the card, is taken up by the page that tap opens — the
   * same request, begun ~150 ms earlier, not a stale copy.
   */
  bySlug: (slug: string, engineId: string | undefined, signal?: AbortSignal) => {
    const key = `${slug}|${engineId ?? ''}`;
    const early = prefetched.get(key);
    prefetched.delete(key);
    if (early && Date.now() - early.at < PREFETCH_MS) return early.promise;
    return loadProduct(slug, engineId, signal);
  },

  /** Start loading a product page on press-in (see bySlug). Errors are left to the page. */
  prefetch: (slug: string, engineId: string | undefined) => {
    const key = `${slug}|${engineId ?? ''}`;
    const early = prefetched.get(key);
    if (early && Date.now() - early.at < PREFETCH_MS) return;
    const promise = loadProduct(slug, engineId);
    promise.catch(() => prefetched.delete(key));
    prefetched.set(key, { promise, at: Date.now() });
  },
};
