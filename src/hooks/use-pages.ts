import { useCallback, useState } from 'react';

import { useLive } from './use-live';

/**
 * A cursor-paged list on top of `useLive`: the first page is live (re-read
 * when the screen returns), further pages are appended on request and
 * dropped whenever the first page is re-read, so the list never mixes an
 * old page two with a new page one.
 */
export function usePages<T>(
  loadPage: (cursor: string | undefined, signal?: AbortSignal) => Promise<{ items: T[]; next: string | null }>,
) {
  const [extra, setExtra] = useState<{ items: T[]; next: string | null } | null>(null);
  const [more, setMore] = useState(false);

  const first = useCallback(
    async (signal: AbortSignal) => {
      const page = await loadPage(undefined, signal);
      setExtra(null);
      return page;
    },
    [loadPage],
  );
  const live = useLive(first);

  const next = extra ? extra.next : live.status === 'loaded' ? live.data.next : null;
  const items = live.status === 'loaded' ? [...live.data.items, ...(extra?.items ?? [])] : [];

  const loadMore = useCallback(async () => {
    if (!next || more) return;
    setMore(true);
    try {
      const page = await loadPage(next);
      setExtra((e) => ({ items: [...(e?.items ?? []), ...page.items], next: page.next }));
    } finally {
      setMore(false);
    }
  }, [next, more, loadPage]);

  return { live, items, hasMore: Boolean(next), loadingMore: more, loadMore };
}
