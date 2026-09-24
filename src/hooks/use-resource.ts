import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiError, type ApiFailure } from '@/api/client';

/**
 * A screen's three states, held honestly.
 *
 * Every screen that reads the shop is in exactly one of loading, failed, or
 * loaded — and the bug this shape prevents is the fourth one the naive
 * version has: `{ data, loading, error }` where all three are set at once
 * because a refresh failed after a success, and the screen renders stale data
 * under an error banner, or an empty list that looks like "no results" when
 * it means "the request failed".
 */
export type Resource<T> =
  | { status: 'loading' }
  | { status: 'failed'; failure: ApiFailure; retry: () => void }
  | { status: 'loaded'; data: T; reload: () => void };

/**
 * Read something from the shop, and keep the screen honest about it.
 *
 * `load` must be stable — wrap it in `useCallback` at the call site, or pass
 * a module-level function. An inline arrow re-fetches on every render, which
 * on a list screen is a request per keystroke of the filter box.
 */
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>): Resource<T> {
  const [attempt, setAttempt] = useState(0);
  // Each answer is filed under the request it answers. A new `load` (the
  // screen asked for something else) or a retry is a new request, so the
  // screen reads "loading" from the first render after the change — never
  // one frame of the previous answer, and never a state reset inside the
  // effect, which is a second render for nothing.
  const request = useMemo(() => ({ load, attempt }), [load, attempt]);
  const [answer, setAnswer] = useState<{
    for: typeof request;
    value: { status: 'failed'; failure: ApiFailure } | { status: 'loaded'; data: T };
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    request
      .load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setAnswer({ for: request, value: { status: 'loaded', data } });
      })
      .catch((err: unknown) => {
        // The screen went away or asked for something else mid-request:
        // not a failure, and not this request's answer to give any more.
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setAnswer({
          for: request,
          value: { status: 'failed', failure: err instanceof ApiError ? err.failure : { kind: 'offline' } },
        });
      });
    return () => controller.abort();
  }, [request]);

  const again = useCallback(() => setAttempt((n) => n + 1), []);

  if (!answer || answer.for !== request) return { status: 'loading' };
  if (answer.value.status === 'loaded') return { status: 'loaded', data: answer.value.data, reload: again };
  return { status: 'failed', failure: answer.value.failure, retry: again };
}
