import type { Product } from './catalogue';
import { get } from './client';

/**
 * How a result was found — the shop's search ranks in three tiers and the
 * app says which, because "this is the part with the number you typed" and
 * "this is close to what you typed" deserve different levels of confidence.
 */
export type SearchMatch = 'reference' | 'text' | 'fuzzy';

export type SearchResult = {
  query: string;
  products: (Product & { match: SearchMatch })[];
  families: { name: string; slug: string; familySlug: string; parentName: string | null }[];
  brands: { name: string; productCount: number }[];
  /** A correction to offer. The query is never silently rewritten. */
  didYouMean: string | null;
};

export const searchApi = {
  /**
   * One ranking for the type-ahead and the results page — see the route
   * handler for why that matters. `submitted` marks a search the customer
   * actually ran, which is the only kind the shop's demand log records.
   */
  query: (
    q: string,
    options: { engineId?: string; take?: number; submitted?: boolean } = {},
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({ q });
    if (options.engineId) params.set('engine', options.engineId);
    if (options.take) params.set('take', String(options.take));
    if (options.submitted) params.set('submitted', '1');
    return get<SearchResult>(`/api/v1/search?${params.toString()}`, {
      signal,
      // A submitted search is always asked again: it is the one that writes
      // to the demand log, and a cached answer would not.
      fresh: options.submitted,
    });
  },
};
