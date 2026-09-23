import type { Product } from './catalogue';
import { get } from './client';

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
  /**
   * Always asked fresh. A product page is where the customer decides to buy,
   * and a price or a stock line from twenty minutes ago in this session's
   * cache is exactly the wrong thing to decide on.
   */
  bySlug: (slug: string, engineId: string | undefined, signal?: AbortSignal) => {
    const params = engineId ? `?engine=${encodeURIComponent(engineId)}` : '';
    return get<ProductDetail>(`/api/v1/products/${encodeURIComponent(slug)}${params}`, { signal, fresh: true });
  },
};
