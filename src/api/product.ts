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
   */
  bySlug: (slug: string, engineId: string | undefined, signal?: AbortSignal) => {
    const params = engineId ? `?engine=${encodeURIComponent(engineId)}` : '';
    return get<ProductDetail>(`/api/v1/products/${encodeURIComponent(slug)}${params}`, { signal, fresh: true }).then((p) => ({
      ...p,
      category: { ...p.category, name: categoryName(p.category.slug, p.category.name) },
      family: { ...p.family, name: categoryName(p.family.slug, p.family.name) },
    }));
  },
};
