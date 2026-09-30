import { get } from './client';
import { categoryName } from '@/i18n/data-locale';

/**
 * The catalogue's top level, as `/api/v1/catalogue/families` returns it.
 *
 * `productCount` is the family's own active parts plus everything in its
 * subcategories. Families with nothing in them are not returned at all —
 * the opposite of the vehicle picker, and deliberately so: a tile that opens
 * onto an empty page is a dead end, whereas a make missing from the picker
 * leaves a customer unable to say what they drive. The reasoning lives beside
 * the route handler in the website repo.
 */
export type Subcategory = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  /** Uploaded in /admin/catalogue, or null. */
  imageUrl?: string | null;
};

export type Family = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  /** The family's picture from /admin/catalogue, or null — then the website's drawing. */
  imageUrl?: string | null;
  subcategories: Subcategory[];
};

export type PartsBrand = { id: string; name: string; slug: string; logoUrl: string | null; productCount: number };

export const catalogueApi = {
  families: (signal?: AbortSignal) =>
    get<Family[]>('/api/v1/catalogue/families', { signal }).then((list) =>
      list.map((f) => ({
        ...f,
        name: categoryName(f.slug, f.name),
        subcategories: f.subcategories.map((c) => ({ ...c, name: categoryName(c.slug, c.name) })),
      })),
    ),
  /** The parts makers with something on sale, most parts first. */
  brands: (signal?: AbortSignal) => get<PartsBrand[]>('/api/v1/catalogue/brands', { signal }),
};

/**
 * How a part relates to the engine the customer chose.
 *
 * `UNKNOWN` means the part has no fitment rows at all — not that it fits
 * everything. That distinction is the compatibility feature: most of this
 * catalogue has no rows, so "we do not know" is the honest and common answer,
 * and reporting it as a fit would sell somebody the wrong brake disc.
 *
 * `null`, separately, means no vehicle has been chosen. "We have not been
 * told your car" and "we do not know whether this fits it" are different
 * sentences and the badge says different things for them.
 */
export type FitmentVerdict = 'FITS' | 'UNKNOWN' | 'DOES_NOT_FIT';

/** Derived by the shop, never typed in. See its `lib/availability.ts`. */
export type Availability = 'IN_STOCK' | 'ON_ORDER' | 'UNAVAILABLE';

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  categorySlug: string;
  /** Which family to draw when there is no photograph. */
  familySlug: string;
  price: number;
  compareAtPrice: number | null;
  availability: Availability;
  /** Only when the shop set a threshold and stock is at or under it. */
  lowStockQty: number | null;
  /** A real photograph, or null — which is most of the catalogue. */
  imageUrl: string | null;
  fitment: FitmentVerdict | null;
  /** Why it is not a plain yes: the wrong fuel, the model listed without this engine, the same engine code elsewhere, or a lead. */
  fitmentReason?: 'WRONG_FUEL' | 'OTHER_ENGINES_OF_MODEL' | 'SAME_ENGINE_CODE' | 'DERIVED' | null;
};

export type ProductPage = {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
  /**
   * The brands the family holds (counted without the brand filter), for the
   * filter chips; `onSale`, how many of its parts the shop has marked down
   * (the "En promo" chip shows only when there are some).
   */
  facets?: { brands: { name: string; slug: string; count: number }[]; onSale?: number };
};

/**
 * How a list may be ordered — the shop's APP_SORTS (website lib/data/catalog),
 * each a figure the database holds. `relevance` is the default and is never
 * sent: what fits the car and is in stock first, then photographed parts,
 * the most ordered, the price. `popular` counts order lines placed with the
 * shop — real orders, not an estimate.
 */
export const PRODUCT_SORTS = ['relevance', 'price_asc', 'price_desc', 'newest', 'popular'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const productsApi = {
  /**
   * Everything the shop has confirmed fits one engine.
   *
   * Narrower than `inFamily` with an engine: that returns the whole family
   * with a verdict stamped on each row, most of them UNKNOWN. This returns
   * only the parts with a real fitment row for that engine, which is the
   * shop's answer to "what fits my car" and the only list that can honestly
   * carry that title.
   *
   * The filtering happens on the server (`fits=1`). Doing it here would mean
   * filtering one page of twenty and reporting "nothing fits your car"
   * whenever the confirmed parts happened to sit on page two — which is not
   * hypothetical: on the BMW 116i in the shop's own data, page one holds one
   * of the two confirmed parts.
   */
  fitsEngine: (engineId: string, options: { page?: number } = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams({ engine: engineId, fits: '1' });
    if (options.page && options.page > 1) params.set('page', String(options.page));
    return get<ProductPage>(`/api/v1/catalogue/products?${params.toString()}`, { signal });
  },

  /** The shop's packs — products whose specs list the parts they bundle. */
  packs: (engineId: string | undefined, signal?: AbortSignal) => {
    const params = new URLSearchParams({ packs: '1' });
    if (engineId) params.set('engine', engineId);
    return get<ProductPage>(`/api/v1/catalogue/products?${params.toString()}`, { signal });
  },

  /**
   * The parts the shop has marked down (a compare-at price above today's),
   * in the default order — for the catalogue's "En promotion" row, which is
   * shown only while this has something in it.
   */
  onSale: (engineId: string | undefined, signal?: AbortSignal) => {
    const params = new URLSearchParams({ onSale: '1' });
    if (engineId) params.set('engine', engineId);
    return get<ProductPage>(`/api/v1/catalogue/products?${params.toString()}`, { signal });
  },

  /** These parts, on sale only, at today's prices — for "Commander à nouveau". */
  byIds: (ids: string[], engineId: string | undefined, signal?: AbortSignal) => {
    const params = new URLSearchParams({ ids: ids.slice(0, 20).join(',') });
    if (engineId) params.set('engine', engineId);
    return get<ProductPage>(`/api/v1/catalogue/products?${params.toString()}`, { signal });
  },
  ofBrand: (brandSlug: string, options: { engineId?: string; page?: number; sort?: ProductSort } = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams({ brand: brandSlug });
    if (options.sort && options.sort !== 'relevance') params.set('sort', options.sort);
    if (options.engineId) params.set('engine', options.engineId);
    if (options.page && options.page > 1) params.set('page', String(options.page));
    return get<ProductPage>(`/api/v1/catalogue/products?${params.toString()}`, { signal });
  },

  inFamily: (
    familySlug: string,
    options: {
      engineId?: string;
      subcategorySlug?: string;
      page?: number;
      brand?: string;
      sort?: ProductSort;
      inStock?: boolean;
      onSale?: boolean;
    } = {},
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({ family: familySlug });
    if (options.subcategorySlug) params.set('subcategory', options.subcategorySlug);
    if (options.brand) params.set('brand', options.brand);
    if (options.sort && options.sort !== 'relevance') params.set('sort', options.sort);
    if (options.inStock) params.set('inStock', '1');
    if (options.onSale) params.set('onSale', '1');
    if (options.engineId) params.set('engine', options.engineId);
    if (options.page && options.page > 1) params.set('page', String(options.page));
    return get<ProductPage>(`/api/v1/catalogue/products?${params.toString()}`, { signal });
  },
};
