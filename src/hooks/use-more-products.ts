import { useCallback, useEffect, useRef, useState } from 'react';

import type { Product, ProductPage } from '@/api/catalogue';
import type { Resource } from './use-resource';

type More = { key: string; pages: ProductPage[]; loading: boolean; failed: boolean };

/**
 * The rest of a list, a page at a time, as the customer scrolls.
 *
 * `first` is the list's first page, read by `useResource` like any screen's
 * data (with its loading and failed states). This adds the pages after it:
 * `loadMore` fetches the next one — once, however often the list's end is
 * reached while it is in flight — and `products` is every page so far, in
 * the shop's order, without a part twice (a quiet re-read of page one while
 * page three is on screen can shift a part across the boundary).
 *
 * `key` names the question — the family, the sort, the filters. When it
 * changes the extra pages are dropped (during render, not in an effect, so
 * no frame shows the old list's tail under the new list's head).
 *
 * Before this, a family screen showed its first twenty parts and stopped:
 * the grid could ask for more and nothing answered.
 */
export function useMoreProducts(
  first: Resource<ProductPage>,
  key: string,
  fetchPage: (page: number, signal: AbortSignal) => Promise<ProductPage>,
) {
  const [more, setMore] = useState<More>({ key, pages: [], loading: false, failed: false });
  if (more.key !== key) setMore({ key, pages: [], loading: false, failed: false });
  const pages = more.key === key ? more.pages : [];
  const loading = more.key === key && more.loading;
  const failed = more.key === key && more.failed;

  const base = first.status === 'loaded' ? first.data : null;
  const last = pages.length ? pages[pages.length - 1] : base;
  const hasMore = Boolean(last?.hasMore);

  const seen = new Set<string>();
  const products: Product[] = [];
  for (const page of base ? [base, ...pages] : []) {
    for (const p of page.products) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        products.push(p);
      }
    }
  }

  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => () => inFlight.current?.abort(), [key]);

  const nextPage = last ? last.page + 1 : null;
  const loadMore = useCallback(() => {
    if (!hasMore || loading || nextPage === null) return;
    const controller = new AbortController();
    inFlight.current?.abort();
    inFlight.current = controller;
    setMore((m) => (m.key === key ? { ...m, loading: true, failed: false } : m));
    fetchPage(nextPage, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) setMore((m) => (m.key === key ? { ...m, pages: [...m.pages, page], loading: false } : m));
      })
      .catch(() => {
        if (!controller.signal.aborted) setMore((m) => (m.key === key ? { ...m, loading: false, failed: true } : m));
      });
  }, [hasMore, loading, nextPage, key, fetchPage]);

  return { products, total: last?.total ?? base?.total ?? 0, hasMore, loadingMore: loading, failedMore: failed, loadMore };
}
